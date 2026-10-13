import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
	planningGuideNavigationState,
	planningGuideState,
} = require("../src/planning-guide-domain.cjs");

describe("planning guide production model", () => {
	it("空のreview draftを含む初期状態をthrowせず構築する", () => {
		expect(() =>
			planningGuideState({
				filter: "today",
				tasks: [],
				inboxRemaining: 0,
				overdueRemaining: 0,
				selectedCount: 0,
				reviewNext: "",
			}),
		).not.toThrow();
		expect(planningGuideState({ filter: "today", tasks: [], reviewNext: "" }).focusCount).toBe(0);
	});

	it("完了済み・子・配置済みを未配置件数から除外する", () => {
		const state = planningGuideState({
			filter: "calendar",
			tasks: [
				{ key: "open" },
				{ key: "done", done: true },
				{ key: "child", parentKey: "open" },
				{ key: "scheduled", timeBlock: { date: "2026-10-13" } },
			],
			reviewNext: "一\n二\n三\n四",
		});
		expect(state.unplannedRemaining).toBe(1);
		expect(state.focusCount).toBe(3);
	});

	it("Calendarのyear modeをdayへ戻してtrayを展開する", () => {
		expect(planningGuideNavigationState("calendar", "2026-10-13")).toEqual({
			filter: "calendar",
			calendarMode: "day",
			calendarDate: "2026-10-13",
			calendarTrayCollapsed: false,
		});
		expect(planningGuideNavigationState("review", "2026-10-13")).toEqual({ filter: "review" });
	});
});
