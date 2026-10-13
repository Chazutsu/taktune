import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const {
	readThroughPendingCache,
	readWithDeadline,
	settleAvailable,
} = require("../src/collection-read-resilience-domain.cjs");

describe("Taktune collection read resilience", () => {
	afterEach(() => vi.useRealTimers());

	it("永続pendingのノートを待ち続けず、正常なノートの結果を保持する", async () => {
		vi.useFakeTimers();
		const files = [{ path: "daily/good.md" }, { path: "daily/icloud-placeholder.md" }];
		const pending = new Promise<string>(() => undefined);
		const resultPromise = settleAvailable(files, (file: { path: string }) =>
			readWithDeadline(
				() => (file === files[1] ? pending : Promise.resolve("- [ ] available task")),
				file.path,
				25,
			),
		);

		await vi.advanceTimersByTimeAsync(25);
		const result = await resultPromise;

		expect(result.values).toEqual(["- [ ] available task"]);
		expect(result.failedFiles).toEqual([files[1]]);
	});

	it("同時読み込みを4件に制限し、失敗があっても成功値を順序通り返す", async () => {
		const started: string[] = [];
		let active = 0;
		let peak = 0;
		const files = Array.from({ length: 9 }, (_, index) => ({ path: `${index}.md` }));
		const result = await settleAvailable(files, async (file: { path: string }) => {
			started.push(file.path);
			active += 1;
			peak = Math.max(peak, active);
			await Promise.resolve();
			active -= 1;
			if (file.path === "4.md") throw new Error("evicted");
			return file.path;
		});

		expect(started).toEqual(files.map((file) => file.path));
		expect(peak).toBe(4);
		expect(result.values).toEqual(files.filter((_, index) => index !== 4).map((file) => file.path));
		expect(result.failedFiles).toEqual([files[4]]);
	});

	it("指定した同時読み込み数を1以上の整数へ正規化する", async () => {
		const files = [{ path: "a.md" }, { path: "b.md" }];
		const result = await settleAvailable(files, async (file: { path: string }) => file.path, 0);

		expect(result.values).toEqual(["a.md", "b.md"]);
	});

	it("全体期限で未処理ノートを失敗扱いにし、制限並列のbackground取得は継続する", async () => {
		vi.useFakeTimers();
		const files = Array.from({ length: 12 }, (_, index) => ({ path: `${index}.md` }));
		const started: string[] = [];
		const pending = new Promise<string>(() => undefined);
		const resultPromise = settleAvailable(
			files,
			async (file: { path: string }) => {
				started.push(file.path);
				return pending;
			},
			4,
			25,
		);

		await vi.advanceTimersByTimeAsync(25);
		const result = await resultPromise;

		expect(started).toEqual(["0.md", "1.md", "2.md", "3.md"]);
		expect(result.values).toEqual([]);
		expect(result.failedFiles).toEqual(files);
	});

	it("期限切れ後の再試行で未完了の実読み込みを重複させない", async () => {
		vi.useFakeTimers();
		const cache = new Map<string, Promise<string>>();
		let resolveRead: (value: string) => void = () => undefined;
		const underlying = new Promise<string>((resolve) => {
			resolveRead = resolve;
		});
		const read = vi.fn(() => underlying);
		const attempt = () =>
			readWithDeadline(() => readThroughPendingCache(cache, "icloud.md", read), "icloud.md", 25);

		const first = attempt();
		const firstResult = expect(first).rejects.toMatchObject({
			code: "TAKTUNE_COLLECTION_READ_TIMEOUT",
		});
		await vi.advanceTimersByTimeAsync(25);
		await firstResult;
		const retry = attempt();
		expect(read).toHaveBeenCalledTimes(1);
		resolveRead("downloaded");
		await expect(retry).resolves.toBe("downloaded");
		expect(cache.size).toBe(0);
	});
});
