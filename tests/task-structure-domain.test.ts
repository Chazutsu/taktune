import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { jaDomainTranslator } from "./domain-translator";

const require = createRequire(import.meta.url);
const { createTaskStructureDomain } = require("../src/task-structure-domain.cjs");

const TASK_RE = /^(\s*[-*+]\s+\[)([ xX])(\]\s+)(.*)$/u;
const domain = createTaskStructureDomain({
	t: jaDomainTranslator,
	activityPattern: /^(\s*)>\s*🕘\s+(\S+)\s?(.*)$/u,
	commentPattern: /^(\s*)>\s*💬\s+(\S+)\s?(.*)$/u,
	datePattern: /📅\s*(\d{4}-\d{2}-\d{2})/u,
	describeTask: (raw: string) => raw.replace(/\s+(?:📅|📋|🚫).*$/u, ""),
	listPattern: /📋\s*(.+?)(?=\s+(?:📅|🚫)|$)/u,
	noteItemPattern: /^(\s*)[-*+]\s+🗒️\s+(.*)$/u,
	taskPattern: TASK_RE,
	today: () => "2026-10-12",
	wontDoPattern: /(?:^|\s)🚫(?=\s|$)/u,
});

describe("task structure domain", () => {
	it("親タスク直下のコメントと活動だけを解析する", () => {
		expect(domain.taskRecordFromLine("  > 💬 2026-10-12T01:00:00Z one\\ntwo", 0)).toEqual({
			type: "comment",
			timestamp: "2026-10-12T01:00:00Z",
			text: "one\ntwo",
		});
		expect(domain.taskRecordFromLine("  > 🕘 2026-10-12T02:00:00Z タスクを作成", 0)?.type).toBe(
			"activity",
		);
		expect(domain.taskRecordFromLine("    > 💬 2026-10-12T01:00:00Z nested", 0)).toBeNull();
	});

	it("明示的な作成履歴と最新レコードから日時を決める", () => {
		const result = domain.taskTemporalMetadata(
			{ stat: { ctime: 1, mtime: 2 } },
			[
				{ timestamp: "2026-10-10T00:00:00Z", text: "更新" },
				{ timestamp: "2026-10-11T00:00:00Z", text: "タスクを作成" },
			],
			[{ timestamp: "2026-10-12T00:00:00Z", text: "確認" }],
		);
		expect(result).toEqual({
			createdAt: Date.parse("2026-10-11T00:00:00Z"),
			modifiedAt: Date.parse("2026-10-12T00:00:00Z"),
		});
	});

	it("日時を今日から以前までの安定した区分に分ける", () => {
		expect(domain.taskTimeBucket(Date.parse("2026-10-12T08:00:00"))).toEqual({
			label: "今日",
			rank: 0,
		});
		expect(domain.taskTimeBucket(Date.parse("2026-10-11T08:00:00"))).toEqual({
			label: "昨日",
			rank: 1,
		});
		expect(domain.taskTimeBucket(Date.parse("2026-10-07T08:00:00"))).toEqual({
			label: "過去7日間",
			rank: 2,
		});
		expect(domain.taskTimeBucket(0)).toEqual({ label: "日時不明", rank: 5 });
	});

	it("テンプレート検索とID順序変更で入力配列を破壊しない", () => {
		const templates = [
			{ id: "a", name: "朝会", description: "共有", tags: ["team"] },
			{ id: "b", name: "買い物", list: "個人" },
		];
		expect(
			domain.filterTaskTemplates(templates, "TEAM").map((item: { id: string }) => item.id),
		).toEqual(["a"]);
		expect(
			domain.reorderItemsById(templates, "a", "b", true).map((item: { id: string }) => item.id),
		).toEqual(["b", "a"]);
		expect(domain.moveItemById(templates, "b", -1).map((item: { id: string }) => item.id)).toEqual([
			"b",
			"a",
		]);
		expect(templates.map((item) => item.id)).toEqual(["a", "b"]);
	});

	it("ノートブロック境界とユーザー向け変更理由を返す", () => {
		const lines = ["- 🗒️ メモ", "  続き", "  - [ ] 子", "- [ ] 次"];
		expect(domain.noteItemBlockRange(lines, 0, 0)).toEqual({ start: 0, end: 3 });
		expect(domain.describeTaskChange("- [ ] 同じ 📅 2026-10-12", "- [x] 同じ 📅 2026-10-12")).toBe(
			"完了に変更",
		);
		expect(domain.describeTaskChange("- [ ] 同じ 📅 2026-10-12", "- [ ] 同じ 📅 2026-10-13")).toBe(
			"期限: 2026-10-12 → 2026-10-13",
		);
		expect(domain.describeTaskChange("- [ ] 同じ 📋 仕事", "- [ ] 同じ 📋 個人")).toBe(
			"リスト: 仕事 → 個人",
		);
	});
});
