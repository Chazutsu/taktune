import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { jaDomainTranslator } from "./domain-translator";

const require = createRequire(import.meta.url);
const { createCalendarActivityDomain } = require("../src/calendar-activity-domain.cjs");
const { matchesCalendarQuery } = require("../src/calendar-view-domain.cjs");
const { createProductivityMetricsDomain } = require("../src/productivity-metrics-domain.cjs");
const { timeOf } = require("../src/time-block-domain.cjs");

const metrics = createProductivityMetricsDomain({ today: () => "2026-10-12" });
const domain = createCalendarActivityDomain({
	t: jaDomainTranslator,
	countdownMatchesDate: metrics.countdownMatchesDate,
	habitValue: metrics.habitValue,
	isHabitScheduled: metrics.isHabitScheduled,
	matchesQuery: matchesCalendarQuery,
	multiTimeBlockPattern:
		/⏰\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})→(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/u,
	taskPattern: /^(\s*[-*+]\s+\[)([ xX])(\]\s+)(.*)$/u,
	timeOf,
});

describe("calendar activity domain", () => {
	it("重要日・予定された習慣・同日の集中実績を時間割へ統合する", () => {
		const result = domain.calendarActivityItems(
			{
				countdowns: [{ title: "リリース", date: "2026-10-12", note: "本番反映", color: "#f00" }],
				habits: [
					{ id: "reading", name: "読書", weekdays: [1], target: 2, unit: "章" },
					{ id: "archived", name: "旧習慣", archived: true, scheduleMode: "weekly" },
				],
				habitLog: { reading: { "2026-10-12": 2 } },
				focusLog: [
					{ date: "2026-10-12", title: "設計", minutes: 30 },
					{ date: "2026-10-12", title: "設計", minutes: 15 },
					{ date: "2026-10-11", title: "範囲外", minutes: 90 },
				],
			},
			"2026-10-12",
		);
		expect(result.map((item: { activityType: string }) => item.activityType)).toEqual([
			"countdown",
			"habit",
			"focus",
		]);
		expect(result[1]).toMatchObject({ title: "✓ 読書", meta: "2/2章", achieved: true });
		expect(result[2]).toMatchObject({ title: "フォーカス 45分", meta: "設計" });
	});

	it("表示設定と検索語で活動項目を絞る", () => {
		const settings = {
			countdowns: [{ title: "誕生日", date: "2026-10-12" }],
			habits: [{ id: "walk", name: "散歩", weekdays: [1] }],
			habitLog: {},
			focusLog: [{ date: "2026-10-12", title: "実装", minutes: 20 }],
			calendarShowHabits: false,
			calendarShowFocus: false,
		};
		expect(
			domain
				.calendarActivityItems(settings, "2026-10-12", "誕生")
				.map((item: { title: string }) => item.title),
		).toEqual(["誕生日"]);
		expect(domain.calendarActivityItems(settings, "2026-10-12", "散歩")).toEqual([]);
	});

	it("既存時間枠を置換して完了日を行末へ保持する", () => {
		expect(
			domain.taskLineWithTime(
				"- [x] 深夜作業 ⏰ 2026-10-10 23:00→2026-10-11 01:00 ✅ 2026-10-11",
				"2026-10-12",
				1380,
				120,
			),
		).toBe("- [x] 深夜作業 ⏰ 2026-10-12 23:00-23:59 ✅ 2026-10-11");
		expect(
			domain.taskLineWithTime("  - [ ] 会議 ⏰ 2026-10-10 09:00-10:00", "2026-10-12", 600, 30),
		).toBe("  - [ ] 会議 ⏰ 2026-10-12 10:00-10:30");
	});

	it("タスク行でなければ上書きせず失敗する", () => {
		expect(() => domain.taskLineWithTime("普通の文章", "2026-10-12", 600, 30)).toThrow(
			"タスクの位置が変わったため更新できない",
		);
	});
});
