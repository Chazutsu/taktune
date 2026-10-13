import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createTaskMarkdownDomain } = require("../src/task-markdown-domain.cjs");
const taskPattern = /^(\s*[-*+]\s+\[)([ xX])(\]\s+)(.*)$/u;
const domain = createTaskMarkdownDomain({
	describeTask: (raw: string) => raw.replace(/\s+(?:🔔|✅).*$/u, ""),
	reminderPattern: /🔔\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/gu,
	taskPattern,
});

describe("task markdown domain", () => {
	it("サブタスク本文と複数通知を更新し完了日は末尾へ保持する", () => {
		expect(
			domain.rewriteSubtaskRaw("旧題 🔔 2026-10-12 09:00 ✅ 2026-10-10", "新題", [
				"2026-10-13T08:30",
				"2026-10-14T09:00",
			]),
		).toBe("新題 🔔 2026-10-13 08:30 🔔 2026-10-14 09:00 ✅ 2026-10-10");
	});

	it("画像だけ埋め込み、対応添付だけを抽出する", () => {
		expect(domain.attachmentMarkdown("media/photo.png", "image/png")).toBe("![[media/photo.png]]");
		expect(domain.attachmentMarkdown("files/spec.pdf", "application/pdf")).toBe(
			"[[files/spec.pdf]]",
		);
		expect(
			domain.attachmentsOf("![[media/photo.png|300]] [[files/spec.pdf]] [[notes/page.md]]"),
		).toEqual([
			{ token: "![[media/photo.png|300]]", path: "media/photo.png", embedded: true },
			{ token: "[[files/spec.pdf]]", path: "files/spec.pdf", embedded: false },
		]);
		expect(
			domain.removeAttachmentToken("前\n\n![[media/photo.png]]\n\n後", "![[media/photo.png]]"),
		).toBe("前\n\n後");
	});

	it("親タスクに属する本文・子タスクを一つのブロックとして移動する", () => {
		const lines = ["- [ ] A", "  > メモ", "  - [ ] A-1", "- [ ] B", "  > Bメモ", "- [ ] C"];
		expect(domain.taskBlockRange(lines, 0, 0)).toEqual({ start: 0, end: 3 });
		expect(
			domain.moveTaskBlock(lines, { line: 0, indent: 0 }, { line: 3, indent: 0 }, true),
		).toEqual(["- [ ] B", "  > Bメモ", "- [ ] A", "  > メモ", "  - [ ] A-1", "- [ ] C"]);
		expect(lines[0]).toBe("- [ ] A");
	});

	it("自分の子孫への移動を拒否する", () => {
		const lines = ["- [ ] A", "  - [ ] A-1", "- [ ] B"];
		expect(
			domain.moveTaskBlock(lines, { line: 0, indent: 0 }, { line: 1, indent: 2 }, true),
		).toEqual(lines);
	});

	it("サブタスクの付随行を保ったまま並べ替えて内容を更新する", () => {
		const lines = [
			"- [ ] 親",
			"  - [ ] 一",
			"    > 一のメモ",
			"  - [x] 二 ✅ 2026-10-10",
			"- [ ] 次",
		];
		const result = domain.reorderSubtaskBlocks(lines, { line: 0, indent: 0 }, [
			{ line: 3, description: "第二", reminders: [] },
			{ line: 1, description: "第一", reminders: ["2026-10-12T09:00"] },
		]);
		expect(result).toEqual([
			"- [ ] 親",
			"  - [x] 第二 ✅ 2026-10-10",
			"  - [ ] 第一 🔔 2026-10-12 09:00",
			"    > 一のメモ",
			"- [ ] 次",
		]);
	});

	it("ブロックのインデントを正規化して子階層へ変換する", () => {
		const block = ["    - [ ] 子", "      > メモ"];
		expect(domain.normalizeTaskBlock(block, 4)).toEqual(["- [ ] 子", "  > メモ"]);
		expect(domain.nestTaskBlock(block, 4)).toEqual(["  - [ ] 子", "    > メモ"]);
	});
});
