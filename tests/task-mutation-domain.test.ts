import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const {
	createTaskMutationJournal,
	executeTaskMutationJournal,
	finalizeTaskMutationSettings,
	transformTaskMutationContent,
	unresolvedTaskMutationPaths,
	updateTaskMutationJournalForVaultEvent,
	validateTaskMutationJournal,
} = require("../src/task-mutation-domain.cjs");

describe("task mutation journal", () => {
	it("保存値を厳格に正規化し、任意の正規表現を保持しない", () => {
		const journal = validateTaskMutationJournal({
			version: 1,
			id: "journal-1",
			createdAt: "2026-10-12T00:00:00.000Z",
			targetPaths: ["Tasks/A.md", "Tasks/A.md"],
			operation: {
				type: "rename-taxonomy",
				kind: "tag",
				value: "old.*",
				next: "new",
				regex: ".*",
			},
			regex: ".*",
		});

		expect(journal).toEqual({
			version: 1,
			id: "journal-1",
			createdAt: "2026-10-12T00:00:00.000Z",
			targetPaths: ["Tasks/A.md"],
			operation: { type: "rename-taxonomy", kind: "tag", value: "old.*", next: "new" },
		});
		expect(validateTaskMutationJournal({ version: 1 })).toBeNull();
	});

	it("Markdown変換は再試行しても二重変更しない", () => {
		const operation = { type: "rename-taxonomy", kind: "list", value: "旧", next: "新" };
		const source = "- [ ] 作業 📋 旧 🗂 設計\n- [ ] 維持 📋 別";
		const once = transformTaskMutationContent(source, operation);
		const twice = transformTaskMutationContent(once, operation);

		expect(once).toBe("- [ ] 作業 📋 新 🗂 設計\n- [ ] 維持 📋 別");
		expect(twice).toBe(once);
	});

	it("frontmatter・種類と長さが異なるfence・本文例を変更対象から除外する", () => {
		const source = [
			"---",
			'template: "- [ ] YAML #old 📋 旧 🚦 doing"',
			"---",
			"# Tasks",
			"- [ ] 実タスク #old 📋 旧 🚦 doing",
			"````markdown",
			"- [ ] backtick例 #old 📋 旧 🚦 doing",
			"```",
			"- [ ] まだfence内 #old 📋 旧 🚦 doing",
			"````",
			"~~~md",
			"- [ ] tilde例 #old 📋 旧 🚦 doing",
			"~~~",
			"- list container",
			"    ~~~~markdown",
			"    - [ ] nested fence #old 📋 旧 🗂 設計 🚦 doing",
			"    ~~~~",
			"root paragraph",
			"    - [ ] root indented code #old 📋 旧 🗂 設計 🚦 doing",
			"本文の #old 📋 旧 🚦 doing",
		].join("\n");

		const renamed = transformTaskMutationContent(source, {
			type: "rename-taxonomy",
			kind: "tag",
			value: "old",
			next: "new",
		});
		const listRenamed = transformTaskMutationContent(renamed, {
			type: "rename-taxonomy",
			kind: "list",
			value: "旧",
			next: "新",
		});
		const sectionRenamed = transformTaskMutationContent(listRenamed, {
			type: "rename-section",
			list: "新",
			value: "設計",
			next: "実装",
		});
		const statusDeleted = transformTaskMutationContent(sectionRenamed, {
			type: "delete-status",
			statusId: "doing",
			fallbackId: "todo",
			removeMarker: false,
		});

		expect(statusDeleted).toContain("- [ ] 実タスク #new 📋 新 🚦 todo");
		expect(statusDeleted).toContain("- [ ] YAML #old 📋 旧 🚦 doing");
		expect(statusDeleted).toContain("- [ ] backtick例 #old 📋 旧 🚦 doing");
		expect(statusDeleted).toContain("- [ ] まだfence内 #old 📋 旧 🚦 doing");
		expect(statusDeleted).toContain("- [ ] tilde例 #old 📋 旧 🚦 doing");
		expect(statusDeleted).toContain("- [ ] nested fence #old 📋 旧 🗂 設計 🚦 doing");
		expect(statusDeleted).toContain("- [ ] root indented code #old 📋 旧 🗂 設計 🚦 doing");
		expect(statusDeleted).toContain("本文の #old 📋 旧 🚦 doing");
	});

	it("セクション名変更は対象リストのタスクだけを冪等に変更する", () => {
		const operation = { type: "rename-section", list: "仕事", value: "設計", next: "実装" };
		const source = [
			"- [ ] 対象 📋 仕事 🗂 設計 #重要",
			"- [ ] 別リスト 📋 個人 🗂 設計",
			"本文 📋 仕事 🗂 設計",
		].join("\n");
		const once = transformTaskMutationContent(source, operation);
		const twice = transformTaskMutationContent(once, operation);

		expect(once).toBe(
			[
				"- [ ] 対象 📋 仕事 🗂 実装 #重要",
				"- [ ] 別リスト 📋 個人 🗂 設計",
				"本文 📋 仕事 🗂 設計",
			].join("\n"),
		);
		expect(twice).toBe(once);
	});

	it("受信箱のセクション削除はリストなしタスクだけを変更する", () => {
		const operation = { type: "remove-section", list: "__inbox__", value: "確認" };
		const source = "- [ ] Inbox 🗂 確認 📅 2026-10-12\n- [ ] Listed 📋 仕事 🗂 確認";

		expect(transformTaskMutationContent(source, operation)).toBe(
			"- [ ] Inbox  📅 2026-10-12\n- [ ] Listed 📋 仕事 🗂 確認",
		);
	});

	it("セクション変更も中途失敗と再起動後の再試行で完了する", async () => {
		const journal = createTaskMutationJournal(
			{ type: "rename-section", list: "仕事", value: "設計", next: "実装" },
			["A.md", "B.md"],
			new Date("2026-10-12T00:00:00.000Z"),
		);
		const files = new Map([
			["A.md", "- [ ] A 📋 仕事 🗂 設計"],
			["B.md", "- [ ] B 📋 仕事 🗂 設計"],
		]);
		let failOnce = true;
		const persistFinal = vi.fn();
		const processPath = async (path: string, transform: (content: string) => string) => {
			if (path === "B.md" && failOnce) {
				failOnce = false;
				throw new Error("iCloud unavailable");
			}
			files.set(path, transform(files.get(path)!));
		};

		await expect(
			executeTaskMutationJournal(journal, { processPath, persistFinal }),
		).rejects.toThrow("iCloud unavailable");
		expect(files.get("A.md")).toContain("🗂 実装");
		expect(files.get("B.md")).toContain("🗂 設計");
		expect(persistFinal).not.toHaveBeenCalled();

		const restored = validateTaskMutationJournal(JSON.parse(JSON.stringify(journal)));
		await executeTaskMutationJournal(restored, { processPath, persistFinal });
		expect(files.get("A.md")).toContain("🗂 実装");
		expect(files.get("B.md")).toContain("🗂 実装");
		expect(persistFinal).toHaveBeenCalledOnce();
	});

	it("中途失敗後のreload/retryで全対象を完了し、finalizeは成功時だけ呼ぶ", async () => {
		const journal = createTaskMutationJournal(
			{ type: "remove-taxonomy", kind: "tag", value: "old" },
			["A.md", "B.md"],
			new Date("2026-10-12T00:00:00.000Z"),
		);
		const files = new Map([
			["A.md", "- [ ] A #old"],
			["B.md", "- [ ] B #old"],
		]);
		let failOnce = true;
		const persistFinal = vi.fn();
		const processPath = async (path: string, transform: (content: string) => string) => {
			if (path === "B.md" && failOnce) {
				failOnce = false;
				throw new Error("iCloud unavailable");
			}
			files.set(path, transform(files.get(path)!));
		};

		await expect(
			executeTaskMutationJournal(journal, { processPath, persistFinal }),
		).rejects.toThrow("iCloud unavailable");
		expect(files.get("A.md")).toBe("- [ ] A");
		expect(files.get("B.md")).toBe("- [ ] B #old");
		expect(persistFinal).not.toHaveBeenCalled();

		await executeTaskMutationJournal(journal, { processPath, persistFinal });
		expect(files.get("A.md")).toBe("- [ ] A");
		expect(files.get("B.md")).toBe("- [ ] B");
		expect(persistFinal).toHaveBeenCalledOnce();
	});

	it("final save失敗時もjournalで同じ処理を安全に再開できる", async () => {
		const journal = createTaskMutationJournal(
			{ type: "delete-status", statusId: "doing", fallbackId: "todo", removeMarker: true },
			["A.md"],
			new Date("2026-10-12T00:00:00.000Z"),
		);
		let content = "- [ ] A 🚦 doing";
		let failFinal = true;
		const processPath = async (_path: string, transform: (value: string) => string) => {
			content = transform(content);
		};
		const persistFinal = async () => {
			if (failFinal) {
				failFinal = false;
				throw new Error("save failed");
			}
		};

		await expect(
			executeTaskMutationJournal(journal, { processPath, persistFinal }),
		).rejects.toThrow("save failed");
		expect(content).toBe("- [ ] A ");
		await executeTaskMutationJournal(journal, { processPath, persistFinal });
		expect(content).toBe("- [ ] A ");
	});

	it("settings・meta・sectionsを最後に一括確定する", () => {
		const settings = {
			lists: ["旧", "新"],
			tags: ["x"],
			taxonomyMeta: { list: { 旧: { color: "red" }, 新: { icon: "star" } }, tag: {} },
			sections: { 旧: ["設計"], 新: ["実装"] },
		};
		const next = finalizeTaskMutationSettings(settings, {
			type: "rename-taxonomy",
			kind: "list",
			value: "旧",
			next: "新",
			color: "blue",
		});

		expect(next.lists).toEqual(["新"]);
		expect(next.taxonomyMeta.list).toEqual({ 新: { color: "blue", icon: "star" } });
		expect(next.sections).toEqual({ 新: ["実装", "設計"] });
	});

	it("セクション設定はMarkdown完了後にだけ一括確定できる", () => {
		const settings = { sections: { 仕事: ["設計", "実装"], 個人: ["設計"] } };

		expect(
			finalizeTaskMutationSettings(settings, {
				type: "rename-section",
				list: "仕事",
				value: "設計",
				next: "実装",
			}),
		).toMatchObject({ sections: { 仕事: ["実装"], 個人: ["設計"] } });
		expect(
			finalizeTaskMutationSettings(settings, {
				type: "remove-section",
				list: "仕事",
				value: "設計",
			}),
		).toMatchObject({ sections: { 仕事: ["実装"], 個人: ["設計"] } });
	});

	it("処理中のrenameを追跡し、再開時は移動後のpathを対象にする", () => {
		const journal = createTaskMutationJournal(
			{ type: "remove-taxonomy", kind: "tag", value: "old" },
			["A.md"],
		);
		const renamed = updateTaskMutationJournalForVaultEvent(journal, {
			type: "rename",
			oldPath: "A.md",
			path: "B.md",
			isMarkdown: true,
		});

		expect(renamed.targetPaths).toEqual(["B.md"]);
		expect(unresolvedTaskMutationPaths(renamed, ["B.md"])).toEqual([]);
	});

	it("通知なしで消えたpathは未解決のまま、delete通知済みだけ完了可能にする", () => {
		const journal = createTaskMutationJournal(
			{ type: "remove-taxonomy", kind: "tag", value: "old" },
			["A.md"],
		);
		expect(unresolvedTaskMutationPaths(journal, [])).toEqual(["A.md"]);

		const deleted = updateTaskMutationJournalForVaultEvent(journal, {
			type: "delete",
			path: "A.md",
			isMarkdown: true,
		});
		expect(deleted.resolvedDeletedPaths).toEqual(["A.md"]);
		expect(unresolvedTaskMutationPaths(deleted, [])).toEqual([]);
	});

	it("処理中にcreate・modifyされたMarkdownを対象へ追加する", () => {
		const journal = createTaskMutationJournal(
			{ type: "rename-taxonomy", kind: "list", value: "旧", next: "新" },
			["A.md"],
		);
		const created = updateTaskMutationJournalForVaultEvent(journal, {
			type: "create",
			path: "B.md",
			isMarkdown: true,
		});
		const modified = updateTaskMutationJournalForVaultEvent(created, {
			type: "modify",
			path: "C.md",
			isMarkdown: true,
		});

		expect(modified.targetPaths).toEqual(["A.md", "B.md", "C.md"]);
	});
});
