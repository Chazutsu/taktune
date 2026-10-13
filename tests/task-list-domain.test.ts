import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { jaDomainTranslator } from "./domain-translator";

const require = createRequire(import.meta.url);
const { addDays } = require("../src/date-domain.cjs");
const { createTaskListDomain } = require("../src/task-list-domain.cjs");
const domain = createTaskListDomain({
	locale: "ja-JP",
	t: jaDomainTranslator,
	addDays,
	cleanDescription: (raw: string) => raw.replace(/\s+📅.*$/u, ""),
	localDate: () => "2026-10-12",
	taskTimeBucket: (timestamp: number) =>
		timestamp > 10 ? { label: "今日", rank: 0 } : { label: "以前", rank: 4 },
});

const task = (overrides: Record<string, unknown> = {}) => ({
	key: "a",
	parentKey: "",
	raw: "設計",
	path: "tasks.md",
	line: 0,
	due: "",
	priority: 1,
	list: "",
	section: "",
	tags: [],
	status: "todo",
	done: false,
	wontDo: false,
	createdAt: 1,
	modifiedAt: 1,
	...overrides,
});

describe("task list domain", () => {
	it("標準フィルター、検索、保存フィルターを同じ条件で絞る", () => {
		const tasks = [
			task({
				key: "today",
				raw: "設計 #重要",
				due: "2026-10-12",
				list: "仕事",
				tags: ["重要"],
				priority: 3,
			}),
			task({
				key: "tomorrow",
				raw: "実装",
				due: "2026-10-13",
				list: "仕事",
				tags: ["開発"],
				priority: 2,
			}),
			task({ key: "done", raw: "完了", done: true }),
		];
		expect(
			domain.filteredTasks(tasks, { filter: "today" }).map((item: { key: string }) => item.key),
		).toEqual(["today"]);
		expect(
			domain
				.filteredTasks(tasks, { filter: "list:仕事", query: "実装" })
				.map((item: { key: string }) => item.key),
		).toEqual(["tomorrow"]);
		expect(
			domain
				.filteredTasks(tasks, {
					filter: "smart:dev",
					smartFilters: [{ id: "dev", tag: "開発", due: "tomorrow", priority: 2 }],
				})
				.map((item: { key: string }) => item.key),
		).toEqual(["tomorrow"]);
	});

	it("親子タスクを同じルートの行順に保ち、循環参照でも停止する", () => {
		const parent = task({ key: "parent", line: 5, priority: 0 });
		const child = task({ key: "child", parentKey: "parent", line: 6, priority: 3 });
		const other = task({ key: "other", line: 1, priority: 2 });
		const tasks = [child, other, parent];
		expect(
			[...tasks]
				.toSorted((a, b) => domain.compareTasks(a, b, { mode: "priority", tasks }))
				.map((item) => item.key),
		).toEqual(["other", "parent", "child"]);
		const cycleA = task({ key: "cycle-a", parentKey: "cycle-b" });
		const cycleB = task({ key: "cycle-b", parentKey: "cycle-a" });
		expect(["cycle-a", "cycle-b"]).toContain(domain.rootTask(cycleA, [cycleA, cycleB]).key);
	});

	it("期限・状態・日時の明示グループを生成する", () => {
		const tasks = [
			task({ key: "a", due: "2026-10-12", createdAt: 20 }),
			task({ key: "b", due: "", createdAt: 1 }),
		];
		expect(
			domain
				.groupTasks(tasks, {
					filter: "all",
					groupMode: "due",
					statusById: () => ({ name: "未着手" }),
				})
				.map(([label]: [string]) => label),
		).toEqual(["今日", "期限なし"]);
		expect(
			domain
				.groupTasks(tasks, {
					filter: "all",
					groupMode: "created",
					statusById: () => ({ name: "未着手" }),
				})
				.map(([label]: [string]) => label),
		).toEqual(["今日", "以前"]);
	});

	it("リスト表示ではセクション、全件表示では期限で自動グループ化する", () => {
		const tasks = [
			task({ key: "a", list: "仕事", section: "開発", due: "2026-10-12" }),
			task({ key: "b", list: "仕事", section: "", due: "" }),
		];
		expect(
			domain
				.groupTasks(tasks, {
					filter: "list:仕事",
					groupMode: "auto",
					statusById: () => ({ name: "未着手" }),
				})
				.map(([label]: [string]) => label),
		).toEqual(["開発", "セクションなし"]);
		expect(
			domain
				.groupTasks(tasks, {
					filter: "all",
					groupMode: "auto",
					statusById: () => ({ name: "未着手" }),
				})
				.map(([label]: [string]) => label),
		).toEqual(["今日", "期限なし"]);
	});

	it("日付ラベルの今日・明日境界を統一する", () => {
		expect(domain.friendlyDate("2026-10-12")).toBe("今日");
		expect(domain.friendlyDate("2026-10-13")).toBe("明日");
		expect(domain.friendlyDate("2026-10-14")).not.toMatch(/今日|明日/u);
	});
});
