import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { jaDomainTranslator } from "./domain-translator";

const require = createRequire(import.meta.url);
const { createStatsDomain } = require("../src/stats-domain.cjs");
const { addDays } = require("../src/date-domain.cjs");
const { completedTaskCount, weeklyPlanReview } = require("../src/review-domain.cjs");
const { createProductivityMetricsDomain } = require("../src/productivity-metrics-domain.cjs");
const today = () => "2026-10-12";
const { habitValue } = createProductivityMetricsDomain({ today });
const domain = createStatsDomain({
	addDays,
	completedTaskCount,
	habitValue,
	t: jaDomainTranslator,
	today,
	weeklyPlanReview,
});

describe("stats domain", () => {
	it("実績と振り返りで同じ7日境界を使い未来の集中ログを除外する", () => {
		const result = domain.statsSnapshot({
			tasks: [
				{ key: "done", done: true, doneDate: "2026-10-12", timeBlock: { date: "2026-10-12" } },
				{
					key: "missed",
					done: false,
					due: "2026-10-10",
					priority: 3,
					list: "仕事",
					timeBlock: { date: "2026-10-11" },
				},
			],
			focusLog: [
				{ date: "2026-10-06", minutes: 20 },
				{ date: "2026-10-12", minutes: 30 },
				{ date: "2026-10-12", minutes: -10 },
				{ date: "2026-10-12", minutes: "broken" },
				{ date: "2026-10-13", minutes: 999 },
			],
		});
		expect(result.summary.slice(0, 3).map((item: { value: string }) => item.value)).toEqual([
			"1件",
			"1/2件",
			"50分",
		]);
		expect(result.completionDays).toHaveLength(14);
		expect(result.openCount).toBe(1);
		expect(result.overdueCount).toBe(1);
	});

	it("日次・週次習慣を目標数に対する達成率へまとめる", () => {
		const result = domain.statsSnapshot({
			habits: [
				{ id: "daily", weekdays: [1], target: 1 },
				{ id: "weekly", scheduleMode: "weekly", weeklyTarget: 2, target: 1 },
				{ id: "archived", archived: true, scheduleMode: "weekly", weeklyTarget: 7 },
			],
			habitLog: { daily: { "2026-10-12": 1 }, weekly: { "2026-10-10": 1 } },
		});
		expect(result.summary[3].value).toBe("67%");
	});

	it("未完了を優先度と上位6リストへ集約する", () => {
		const tasks = Array.from({ length: 8 }, (_, index) => ({
			key: String(index),
			priority: index === 0 ? 3 : 1,
			list: `L${index}`,
		}));
		const result = domain.statsSnapshot({ tasks });
		expect(result.priorities).toEqual([
			{ label: "高", count: 1 },
			{ label: "通常", count: 7 },
		]);
		expect(result.lists).toHaveLength(6);
	});

	it("不正な習慣目標を最低1へ補正する", () => {
		const result = domain.statsSnapshot({
			habits: [
				{ id: "daily", weekdays: [1], target: -2 },
				{ id: "weekly", scheduleMode: "weekly", weeklyTarget: -3, target: 0 },
			],
			habitLog: { daily: { "2026-10-12": 1 }, weekly: { "2026-10-11": 1 } },
		});
		expect(result.summary[3].value).toBe("100%");
	});
});
