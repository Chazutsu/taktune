import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";
import { jaDomainTranslator } from "./domain-translator";

const require = createRequire(import.meta.url);
const { createDashboardNavigationDomain } = require("../src/dashboard-navigation-domain.cjs");

const filteredTasks = vi.fn((tasks: unknown[], options: { filter: string }) =>
	options.filter === "today" ? tasks.slice(0, 2) : tasks.slice(0, 1),
);
const domain = createDashboardNavigationDomain({
	t: jaDomainTranslator,
	addDays: (date: string, amount: number) => (amount === -6 ? "2026-10-06" : date),
	completedTaskCount: (tasks: Array<{ completedIn?: string }>, start: string) =>
		tasks.filter((task) => task.completedIn === start).length,
	habitValue: (log: Record<string, Record<string, number>>, id: string, date: string) =>
		log?.[id]?.[date] || 0,
	isHabitScheduled: (habit: { scheduled?: boolean }) => habit.scheduled !== false,
	localDate: () => "2026-10-12",
	taskListDomain: { filteredTasks },
	weekStart: () => "2026-10-12",
});

const context = {
	external: { calendar: [{}, {}], linear: [{}], jira: [{}, {}], slack: [{}] },
	notes: [{}, {}, {}],
	trashTasks: [{ parentKey: "" }, { parentKey: "root" }],
	overflowTaskKeys: new Set(["overflow"]),
	settings: {
		focusLog: [
			{ date: "2026-10-12", minutes: 30 },
			{ date: "2026-10-12", minutes: 15 },
			{ date: "2026-10-11", minutes: 90 },
		],
		habits: [
			{ id: "done", target: 2, scheduled: true },
			{ id: "open", target: 1, scheduled: true },
			{ id: "off", target: 1, scheduled: false },
			{ id: "archived", archived: true, scheduled: true },
		],
		habitLog: { done: { "2026-10-12": 2 } },
		countdowns: [{}, {}],
		smartFilters: [{ id: "mine", name: "自分用" }],
		sortMode: "priority",
	},
	statusById: (id: string) => ({ id, name: "進行中" }),
};

describe("dashboard navigation domain", () => {
	it("各画面の件数と時間単位を同じ計算元から返す", () => {
		const tasks = [
			{ completedIn: "2026-10-12", done: false, wontDo: false },
			{ completedIn: "2026-10-06", done: false, wontDo: true },
			{ done: false, wontDo: false },
		];
		expect(domain.countFor("calendar", tasks, context)).toBe(2);
		expect(domain.countFor("issues", tasks, context)).toBe(4);
		expect(domain.countFor("notes", tasks, context)).toBe(3);
		expect(domain.countFor("focus", tasks, context)).toBe(45);
		expect(domain.countFor("habits", tasks, context)).toBe(1);
		expect(domain.countFor("trash", tasks, context)).toBe(1);
		expect(domain.countFor("matrix", tasks, context)).toBe(2);
	});

	it("通常フィルター件数をビュー状態の書き換えなしで一覧ドメインへ委譲する", () => {
		const tasks = [{}, {}, {}];
		expect(domain.countFor("today", tasks, context)).toBe(2);
		expect(filteredTasks).toHaveBeenLastCalledWith(
			tasks,
			expect.objectContaining({ filter: "today", query: "", sortMode: "priority" }),
		);
	});

	it("動的分類と固定画面のラベルを返す", () => {
		expect(domain.labelFor("smart:mine", context)).toBe("自分用");
		expect(domain.labelFor("list:仕事", context)).toBe("仕事");
		expect(domain.labelFor("tag:開発", context)).toBe("#開発");
		expect(domain.labelFor("status:doing", context)).toBe("進行中");
		expect(domain.labelFor("review", context)).toBe("振り返り");
	});

	it("件数・分・達成率を画面ごとの副題へ正しい単位で反映する", () => {
		const tasks = [{ completedIn: "2026-10-12" }, { completedIn: "2026-10-06" }];
		expect(domain.subtitleFor("focus", tasks, context)).toBe(
			"今日 45分 · タスクを一つ選んで集中する",
		);
		expect(domain.subtitleFor("habits", tasks, context)).toBe("今日 1/3 · 小さな行動を継続する");
		expect(domain.subtitleFor("review", tasks, context)).toBe(
			"1件完了 · 直近7日間の実績と集中を振り返る",
		);
		expect(domain.subtitleFor("today", tasks, context)).toBe("2026-10-12 · 2件");
	});
});
