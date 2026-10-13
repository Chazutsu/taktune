import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { jaDomainTranslator } from "./domain-translator";

const require = createRequire(import.meta.url);
const {
	completedReviewRecord,
	emptyReviewDraft,
	requiredReviewFocusItems,
	reviewFocusItemCount,
	reviewDraftSnapshot,
	reviewHistoryPaths,
	reviewPeriodSnapshot,
	reviewSummary,
	weeklyReviewPrompt,
	weeklyReviewSnoozeUntil,
} = require("../src/review-domain.cjs");
const { addDays } = require("../src/date-domain.cjs");

describe("review domain", () => {
	it("空の重点下書きを検証エラーにせず0件として数える", () => {
		expect(reviewFocusItemCount("")).toBe(0);
		expect(reviewFocusItemCount("一\n一\n二\n三\n四")).toBe(3);
	});
	it("期間、完了実績、計画実行、集中時間を同じ7日境界で集計する", () => {
		const snapshot = reviewPeriodSnapshot(
			[
				{ key: "done", done: true, doneDate: "2026-10-12", timeBlock: { date: "2026-10-11" } },
				{ key: "late", done: true, doneDate: "2026-10-12", timeBlock: { date: "2026-10-01" } },
				{
					key: "missed",
					done: false,
					due: "2026-10-10",
					priority: 3,
					timeBlock: { date: "2026-10-09" },
				},
			],
			[
				{ date: "2026-10-08", minutes: 25 },
				{ date: "2026-10-12", minutes: 50 },
			],
			"2026-10-12",
			jaDomainTranslator,
		);
		expect(snapshot.start).toBe("2026-10-06");
		expect(snapshot.completed.map((task: { key: string }) => task.key)).toEqual(["done", "late"]);
		expect(snapshot.planReview.planned.map((task: { key: string }) => task.key)).toEqual([
			"done",
			"missed",
		]);
		expect(snapshot.planReview.completed.map((task: { key: string }) => task.key)).toEqual([
			"done",
		]);
		expect(snapshot.focusMinutes).toBe(75);
		expect(snapshot.carryoverContexts.missed).toBe("時間割・期限超過");
	});

	it("持ち越しを判断優先度順に12件へ制限し、残りを失わない", () => {
		const tasks = Array.from({ length: 14 }, (_, index) => ({
			key: `task-${index}`,
			done: false,
			due: index < 2 ? "2026-10-01" : "",
			priority: index < 2 ? 3 : 1,
			timeBlock: { date: "2026-10-10" },
		}));
		const snapshot = reviewPeriodSnapshot(tasks, [], "2026-10-12");
		expect(snapshot.carryovers).toHaveLength(12);
		expect(snapshot.carryovers.slice(0, 2).map((task: { key: string }) => task.key)).toEqual([
			"task-0",
			"task-1",
		]);
		expect(snapshot.carryoverOverflow).toHaveLength(2);
	});

	it("振り返り通知とスヌーズ日を日付境界だけで決める", () => {
		expect(weeklyReviewPrompt(null, "2026-10-08")).toBeNull();
		expect(weeklyReviewPrompt(null, "2026-10-09")?.daysSince).toBeNull();
		expect(weeklyReviewPrompt({ date: "2026-10-02" }, "2026-10-09")?.daysSince).toBe(7);
		expect(weeklyReviewSnoozeUntil("2026-10-09")).toBe("2026-10-15");
		expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
	});

	it("下書きと重点を保存境界で正規化する", () => {
		const source = { wins: "完了", next: "A\nA\nB\nC\nD", carryoverReasons: { task: "blocked" } };
		const draft = reviewDraftSnapshot(source);
		expect(draft).toEqual({
			wins: "完了",
			friction: "",
			lessons: "",
			next: "A\nA\nB\nC\nD",
			carryoverReasons: { task: "blocked" },
			focusTaskKeys: {},
		});
		expect(requiredReviewFocusItems(source.next)).toEqual(["A", "B", "C"]);
		expect(() => requiredReviewFocusItems(" \n ", jaDomainTranslator)).toThrow(
			"次の7日間の重点を1件以上決める",
		);
		expect(emptyReviewDraft()).toEqual({
			wins: "",
			friction: "",
			lessons: "",
			next: "",
			carryoverReasons: {},
			focusTaskKeys: {},
		});
		draft.carryoverReasons.task = "later";
		expect(source.carryoverReasons.task).toBe("blocked");
	});

	it("表示指標と確定レコードを同じ件数から生成する", () => {
		const summary = reviewSummary(
			{
				completedCount: 4,
				focusMinutes: 75,
				ongoingCount: 3,
				planCompleted: 2,
				planned: 4,
				previousMetrics: { completed: 3, focusMinutes: 50, planCompleted: 1, planned: 4 },
			},
			jaDomainTranslator,
		);
		expect(summary.map((item: { value: string }) => item.value)).toEqual([
			"4件",
			"2/4件",
			"75分",
			"3件",
		]);
		expect(summary[1].comparison).toBe("前回 25% · +25pt");
		expect(
			completedReviewRecord({
				completedCount: 4,
				date: "2026-10-12",
				focusIds: { A: "id-a" },
				focusMinutes: 75,
				next: ["A"],
				planCompleted: 2,
				planned: 4,
			}),
		).toEqual({
			date: "2026-10-12",
			next: ["A"],
			focusIds: { A: "id-a" },
			metrics: { completed: 4, focusMinutes: 75, planned: 4, planCompleted: 2 },
		});
	});

	it("正規の振り返りノートだけを新しい順に選ぶ", () => {
		expect(
			reviewHistoryPaths(
				[
					{ path: "private/reviews/README.md" },
					{ path: "private/reviews/archive/2026-10-12.md" },
					{ path: "private/reviews/2026-10-05.md" },
					{ path: "private/reviews/2026-10-12.md" },
				],
				1,
			),
		).toEqual(["private/reviews/2026-10-12.md"]);
	});
});
