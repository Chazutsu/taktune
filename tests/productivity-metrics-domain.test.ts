import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { jaDomainTranslator } from "./domain-translator";

const require = createRequire(import.meta.url);
const { createProductivityMetricsDomain } = require("../src/productivity-metrics-domain.cjs");
const metrics = createProductivityMetricsDomain({
	t: jaDomainTranslator,
	today: () => "2026-10-12",
});

describe("productivity metrics domain", () => {
	it("旧配列形式を含む習慣ログと曜日設定を解釈する", () => {
		expect(metrics.habitLogMap(["2026-10-11", "2026-10-12"])).toEqual({
			"2026-10-11": 1,
			"2026-10-12": 1,
		});
		expect(metrics.habitValue({ habit: { "2026-10-12": 3 } }, "habit", "2026-10-12")).toBe(3);
		expect(metrics.isHabitScheduled({ weekdays: [1] }, "2026-10-12")).toBe(true);
		expect(metrics.isHabitScheduled({ scheduleMode: "weekly", weekdays: [] }, "2026-10-13")).toBe(
			true,
		);
		expect(metrics.isHabitScheduled({ archived: true, scheduleMode: "weekly" }, "2026-10-12")).toBe(
			false,
		);
	});

	it("指定期間の集中実績をタスク・モード別に集計する", () => {
		const result = metrics.focusLogStats(
			[
				{ date: "2026-10-11", title: "設計", minutes: 30, mode: "timer" },
				{ date: "2026-10-12", title: "実装", minutes: 45, mode: "stopwatch" },
				{ date: "2026-10-12", title: "設計", minutes: 20, mode: "unknown" },
				{ date: "2026-10-13", title: "範囲外", minutes: 90, mode: "timer" },
			],
			"2026-10-11",
			"2026-10-12",
		);
		expect(result).toEqual({
			totalMinutes: 95,
			sessions: 3,
			byTask: [
				["設計", 50],
				["実装", 45],
			],
			byMode: { timer: 50, stopwatch: 45 },
		});
	});

	it("動作中の集中時間だけ現在時刻との差分を加算する", () => {
		expect(metrics.focusElapsedSeconds({ elapsed: 10, running: false }, 20_000)).toBe(10);
		expect(
			metrics.focusElapsedSeconds({ elapsed: 10, running: true, startedAt: 5_000 }, 20_500),
		).toBe(25);
		expect(
			metrics.focusElapsedSeconds({ elapsed: 10, running: true, startedAt: 21_000 }, 20_500),
		).toBe(10);
	});

	it("月末日と第N曜日のカウントダウンを次回日へ進める", () => {
		expect(
			metrics.countdownNextDate({ date: "2026-01-31", repeat: "monthly-last" }, "2026-02-01"),
		).toBe("2026-02-28");
		expect(
			metrics.countdownNextDate(
				{ date: "2026-10-12", repeat: "monthly-weekday", weekday: 1, occurrence: 2 },
				"2026-11-01",
			),
		).toBe("2026-11-09");
		expect(metrics.countdownNextDate({ date: "2024-02-29", repeat: "yearly" }, "2025-01-01")).toBe(
			"2025-02-28",
		);
	});

	it("当日・未来・経過済みと数え始め方式を区別する", () => {
		expect(metrics.countdownStatus({ date: "2026-10-12" })).toMatchObject({
			delta: 0,
			value: 0,
			label: "今日",
		});
		expect(metrics.countdownStatus({ date: "2026-10-12", dayMode: "plus-one" })).toMatchObject({
			value: 1,
			label: "1日目",
		});
		expect(metrics.countdownStatus({ date: "2026-10-14" })).toMatchObject({
			delta: 2,
			label: "あと2日",
		});
		expect(metrics.countdownStatus({ date: "2026-10-10" })).toMatchObject({
			delta: -2,
			label: "2日経過",
		});
		expect(
			metrics.countdownMatchesDate({ date: "2026-10-12", repeat: "monthly" }, "2026-11-12"),
		).toBe(true);
	});
});
