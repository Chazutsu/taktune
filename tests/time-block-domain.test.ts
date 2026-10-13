import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { addDays } = require("../src/date-domain.cjs");
const {
	availableScheduleSlots,
	batchScheduleSlots,
	calendarDropSchedule,
	createTimeBlockDomain,
	taskOccursOnDate,
	taskTimeSegment,
	timelineMinutesFromOffset,
} = require("../src/time-block-domain.cjs");
const singlePattern = /⏰\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})-(\d{2}:\d{2})/u;
const multiPattern =
	/⏰\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})→(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/u;
const domain = createTimeBlockDomain({ addDays, multiPattern, singlePattern });

describe("time block domain", () => {
	it("単日・複数日の時間枠を解析し、期間を維持したまま移動する", () => {
		expect(domain.timeBlockOf("設計 ⏰ 2026-10-12 09:30-10:45")).toMatchObject({
			date: "2026-10-12",
			startMinutes: 570,
			endMinutes: 645,
			multiDay: false,
		});
		const multi = domain.timeBlockOf("出張 ⏰ 2026-10-12 09:30→2026-10-14 17:15");
		expect(multi).toMatchObject({ date: "2026-10-12", endDate: "2026-10-14", multiDay: true });
		expect(
			domain.shiftTimeBlockToDate("出張 ⏰ 2026-10-12 09:30→2026-10-14 17:15", "2026-10-20"),
		).toBe("出張 ⏰ 2026-10-20 09:30→2026-10-22 17:15");
	});

	it("複数日の中間日を終日区間として扱う", () => {
		const task = { timeBlock: domain.timeBlockOf("出張 ⏰ 2026-10-12 09:30→2026-10-14 17:15") };
		expect(taskOccursOnDate(task, "2026-10-13")).toBe(true);
		expect(taskTimeSegment(task, "2026-10-13")).toEqual({
			startMinutes: 0,
			endMinutes: 1439,
			start: "00:00",
			end: "23:59",
		});
		expect(taskOccursOnDate(task, "2026-10-15")).toBe(false);
	});

	it("DnDを15分刻みに丸め、日跨ぎの連続配置を生成する", () => {
		expect(timelineMinutesFromOffset(224, 1152)).toBe(570);
		expect(
			calendarDropSchedule({ startMinutes: 540, endMinutes: 660 }, "2026-10-12", 1395),
		).toEqual({ date: "2026-10-12", startMinutes: 1320, durationMinutes: 120 });
		expect(batchScheduleSlots(2, "2026-10-12", 1380, 90, addDays)).toEqual([
			{ date: "2026-10-13", startMinutes: 360, durationMinutes: 90 },
			{ date: "2026-10-13", startMinutes: 450, durationMinutes: 90 },
		]);
	});

	it("既存予定を避けて15分単位の空きへ順番に配置する", () => {
		expect(
			availableScheduleSlots(2, "2026-10-12", 9 * 60 + 7, 30, [
				{ startMinutes: 9 * 60 + 30, endMinutes: 10 * 60 + 15 },
				{ startMinutes: 11 * 60, endMinutes: 12 * 60 },
			]),
		).toEqual([
			{ date: "2026-10-12", startMinutes: 10 * 60 + 15, durationMinutes: 30 },
			{ date: "2026-10-12", startMinutes: 12 * 60, durationMinutes: 30 },
		]);
	});

	it("当日中に必要な空きが揃わなければ部分配置しない", () => {
		expect(
			availableScheduleSlots(2, "2026-10-12", 23 * 60, 30, [
				{ startMinutes: 23 * 60 + 30, endMinutes: 24 * 60 },
			]),
		).toEqual([]);
	});
});
