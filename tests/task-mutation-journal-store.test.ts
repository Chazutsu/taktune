import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createTaskMutationJournal } = require("../src/task-mutation-domain.cjs");
const { createAtomicManifestBackend } = require("../src/task-mutation-atomic-backend.cjs");
const {
	assertTaskMutationJournalClaim,
	claimTaskMutationJournal,
	clearStoredTaskMutationJournal,
	createStoredTaskMutationJournal,
	initializeTaskMutationJournalStore,
	loadTaskMutationJournal,
	loadTaskMutationJournalState,
	reconcileLegacyTaskMutationJournal,
	recoverStaleTaskMutationClaim,
	updateStoredTaskMutationJournal,
} = require("../src/task-mutation-journal-store.cjs");

function memoryBackend(files = new Map<string, string>(), lockKey = "memory/manifest.json") {
	return {
		files,
		lockKey,
		async isEstablished() {
			return files.has("manifest-established-v2.json");
		},
		async establish() {
			files.set("manifest-established-v2.json", '{"version":2}');
		},
		async readDirect(name: string) {
			if (!files.has(name)) throw Object.assign(new Error("missing"), { code: "ENOENT" });
			return files.get(name)!;
		},
		async replaceAtomic(name: string, content: string) {
			files.set(name, content);
		},
	};
}

function journalAt(minute = 0) {
	return createTaskMutationJournal(
		{ type: "remove-section", list: "仕事", value: "設計" },
		["A.md"],
		new Date(`2026-10-12T00:${String(minute).padStart(2, "0")}:00.000Z`),
	);
}

function manifestAt(generation: number) {
	return JSON.stringify({
		storeVersion: 2,
		generation,
		fenceToken: `fence-${generation}`,
		journal: null,
		claim: null,
	});
}

function atomicBackend(files = new Map<string, string>()) {
	const adapter = {
		async exists(path: string) {
			return files.has(path);
		},
		async read(path: string) {
			if (!files.has(path)) throw Object.assign(new Error("missing"), { code: "ENOENT" });
			return files.get(path)!;
		},
		async write(path: string, content: string) {
			files.set(path, content);
		},
		async rename(from: string, to: string) {
			if (!files.has(from)) throw Object.assign(new Error("missing"), { code: "ENOENT" });
			files.set(to, files.get(from)!);
			files.delete(from);
		},
		async remove(path: string) {
			files.delete(path);
		},
	};
	return {
		adapter,
		backend: createAtomicManifestBackend({
			adapter,
			root: "journal",
			ensureDirectory: async () => {},
			lockKey: "journal/manifest.json",
			isEstablished: async () => true,
			establish: async () => {},
		}),
	};
}

describe("task mutation dedicated journal store", () => {
	it("head退避直後のkillからnextを世代検証して復旧する", async () => {
		const files = new Map<string, string>([
			["journal/manifest.json.backup", manifestAt(4)],
			["journal/manifest.json.next", manifestAt(5)],
		]);
		const { backend } = atomicBackend(files);

		expect((await loadTaskMutationJournalState(backend)).generation).toBe(5);
		expect(files.get("journal/manifest.json")).toBe(manifestAt(5));
		expect(files.has("journal/manifest.json.backup")).toBe(false);
		expect(files.has("journal/manifest.json.next")).toBe(false);
	});

	it("adapterのhead退避kill-pointを再起動後に復旧する", async () => {
		const files = new Map<string, string>([["journal/manifest.json", manifestAt(4)]]);
		const first = atomicBackend(files);
		const rename = first.adapter.rename;
		first.adapter.rename = async (from: string, to: string) => {
			if (from === "journal/manifest.json.next") throw new Error("simulated process kill");
			await rename(from, to);
		};

		await expect(first.backend.replaceAtomic("manifest.json", manifestAt(5))).rejects.toThrow(
			"simulated process kill",
		);
		expect(files.has("journal/manifest.json")).toBe(false);
		expect(files.has("journal/manifest.json.backup")).toBe(true);
		expect(files.has("journal/manifest.json.next")).toBe(true);

		const restarted = atomicBackend(files);
		expect((await loadTaskMutationJournalState(restarted.backend)).generation).toBe(5);
		expect(files.has("journal/manifest.json.backup")).toBe(false);
		expect(files.has("journal/manifest.json.next")).toBe(false);
	});

	it("next作成直後のkillは未commitとしてheadを維持する", async () => {
		const files = new Map<string, string>([
			["journal/manifest.json", manifestAt(4)],
			["journal/manifest.json.next", manifestAt(5)],
		]);
		const { backend } = atomicBackend(files);

		expect((await loadTaskMutationJournalState(backend)).generation).toBe(4);
		expect(files.get("journal/manifest.json")).toBe(manifestAt(4));
		expect(files.has("journal/manifest.json.next")).toBe(false);
	});

	it("head置換直後のkillは新headを維持してbackupを除去する", async () => {
		const files = new Map<string, string>([
			["journal/manifest.json", manifestAt(5)],
			["journal/manifest.json.backup", manifestAt(4)],
		]);
		const { backend } = atomicBackend(files);

		expect((await loadTaskMutationJournalState(backend)).generation).toBe(5);
		expect(files.has("journal/manifest.json.backup")).toBe(false);
	});

	it("backupとnextの世代関係が不正なら自動選択せずfail-closedする", async () => {
		const files = new Map<string, string>([
			["journal/manifest.json.backup", manifestAt(4)],
			["journal/manifest.json.next", manifestAt(7)],
		]);
		const { backend } = atomicBackend(files);

		await expect(loadTaskMutationJournalState(backend)).rejects.toThrow("manifest unavailable");
		expect(files.has("journal/manifest.json")).toBe(false);
	});

	it("世代だけ正しい破損nextを採用せずvalid backupを保持する", async () => {
		const files = new Map<string, string>([
			["journal/manifest.json.backup", manifestAt(4)],
			[
				"journal/manifest.json.next",
				JSON.stringify({
					storeVersion: 2,
					generation: 5,
					fenceToken: "fence-5",
					journal: { broken: true },
					claim: null,
				}),
			],
		]);
		const { backend } = atomicBackend(files);

		await expect(loadTaskMutationJournalState(backend)).rejects.toThrow("manifest unavailable");
		expect(files.get("journal/manifest.json.backup")).toBe(manifestAt(4));
		expect(files.has("journal/manifest.json")).toBe(false);
	});

	it("確立済みstoreのnext単独残存は根拠不足としてfail-closedする", async () => {
		const files = new Map<string, string>([["journal/manifest.json.next", manifestAt(5)]]);
		const { backend } = atomicBackend(files);

		await expect(loadTaskMutationJournalState(backend)).rejects.toThrow("manifest unavailable");
		expect(files.get("journal/manifest.json.next")).toBe(manifestAt(5));
	});
	it("well-known manifestを直接読み、世代とfencing tokenを更新する", async () => {
		const backend = memoryBackend();
		await initializeTaskMutationJournalStore(backend);
		const journal = journalAt();
		await createStoredTaskMutationJournal(backend, journal);
		const before = await loadTaskMutationJournalState(backend);
		const updated = { ...journal, targetPaths: ["A.md", "B.md"] };
		await updateStoredTaskMutationJournal(backend, journal.id, updated);
		const after = await loadTaskMutationJournalState(backend);

		expect(await loadTaskMutationJournal(backend)).toEqual(updated);
		expect(after.generation).toBeGreaterThan(before.generation);
		expect(after.fenceToken).not.toBe(before.fenceToken);
	});

	it("同一manifest pathの同時precheckを直列化しcreateを単一winnerにする", async () => {
		const files = new Map<string, string>();
		const firstBackend = memoryBackend(files, "shared/manifest.json");
		const secondBackend = memoryBackend(files, "shared/manifest.json");
		await initializeTaskMutationJournalStore(firstBackend);
		let releaseBarrier!: () => void;
		let enteredBarrier!: () => void;
		const barrierEntered = new Promise<void>((resolve) => {
			enteredBarrier = resolve;
		});
		const barrier = new Promise<void>((resolve) => {
			releaseBarrier = resolve;
		});
		const originalReplace = firstBackend.replaceAtomic;
		firstBackend.replaceAtomic = async (name: string, content: string) => {
			if (JSON.parse(content).journal) {
				enteredBarrier();
				await barrier;
			}
			await originalReplace(name, content);
		};

		const first = createStoredTaskMutationJournal(firstBackend, journalAt());
		await barrierEntered;
		const second = createStoredTaskMutationJournal(secondBackend, journalAt(1));
		releaseBarrier();
		const results = await Promise.allSettled([first, second]);

		expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
		expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
	});

	it("listが部分可視でもwell-known manifestだけを正として所有権を判定する", async () => {
		const backend = { ...memoryBackend(), list: async () => [] };
		await initializeTaskMutationJournalStore(backend);
		const journal = journalAt();
		await createStoredTaskMutationJournal(backend, journal);

		expect((await loadTaskMutationJournal(backend)).id).toBe(journal.id);
	});

	it("manifestの直接readがI/O失敗したらmissing扱いせずfail-closedする", async () => {
		const backend = memoryBackend();
		await initializeTaskMutationJournalStore(backend);
		backend.readDirect = async () => {
			throw new Error("iCloud unavailable");
		};

		await expect(loadTaskMutationJournal(backend)).rejects.toThrow("manifest unavailable");
	});

	it("確立済みstoreでmanifestだけ見えない場合も新規初期化せず停止する", async () => {
		const backend = memoryBackend();
		await initializeTaskMutationJournalStore(backend);
		backend.files.delete("manifest.json");

		await expect(loadTaskMutationJournalState(backend)).rejects.toThrow("manifest unavailable");
	});

	it("2 instanceではclaim token所有者だけが操作できる", async () => {
		const backend = memoryBackend();
		await initializeTaskMutationJournalStore(backend);
		const journal = journalAt();
		await createStoredTaskMutationJournal(backend, journal);
		const token = await claimTaskMutationJournal(backend, journal.id, "pc-instance");

		await expect(claimTaskMutationJournal(backend, journal.id, "iphone-instance")).rejects.toThrow(
			"explicit stale-claim recovery",
		);
		await expect(
			assertTaskMutationJournalClaim(backend, journal.id, "pc-instance", token),
		).resolves.toEqual(expect.any(String));
		await expect(
			updateStoredTaskMutationJournal(
				backend,
				journal.id,
				{ ...journal, targetPaths: ["B.md"] },
				"iphone-instance",
				"wrong-token",
			),
		).rejects.toThrow("claim lost");
	});

	it("時間経過後もstale claimを自動takeoverしない", async () => {
		const backend = memoryBackend();
		await initializeTaskMutationJournalStore(backend);
		const journal = journalAt();
		await createStoredTaskMutationJournal(backend, journal);
		await claimTaskMutationJournal(backend, journal.id, "crashed-instance");
		// Store has no wall-clock based expiry: even a later instance must request explicit recovery.
		await expect(claimTaskMutationJournal(backend, journal.id, "later-instance")).rejects.toThrow(
			"explicit stale-claim recovery",
		);
		await recoverStaleTaskMutationClaim(backend, journal.id);
		await expect(claimTaskMutationJournal(backend, journal.id, "later-instance")).resolves.toEqual(
			expect.any(String),
		);
	});

	it("古いwriterは新ownerをclearできない", async () => {
		const backend = memoryBackend();
		await initializeTaskMutationJournalStore(backend);
		const journal = journalAt();
		await createStoredTaskMutationJournal(backend, journal);
		const token = await claimTaskMutationJournal(backend, journal.id, "owner");

		await expect(
			clearStoredTaskMutationJournal(backend, journal.id, "stale", token),
		).rejects.toThrow("ownership lost");
		expect((await loadTaskMutationJournal(backend)).id).toBe(journal.id);
	});

	it("旧markerだけが先行していてもlegacy journalを専用manifestへ移行する", async () => {
		const backend = memoryBackend();
		backend.files.set("initialized.json", "1");
		const legacy = journalAt();

		expect(await reconcileLegacyTaskMutationJournal(backend, legacy)).toEqual(legacy);
		expect((await loadTaskMutationJournal(backend)).id).toBe(legacy.id);
	});

	it("dedicatedとlegacyのID不一致は自動選択せず停止する", async () => {
		const backend = memoryBackend();
		await initializeTaskMutationJournalStore(backend);
		await createStoredTaskMutationJournal(backend, journalAt());

		await expect(reconcileLegacyTaskMutationJournal(backend, journalAt(1))).rejects.toThrow(
			"conflict",
		);
	});
});
