import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { jaDomainTranslator } from "./domain-translator";

const require = createRequire(import.meta.url);
const { addDays, localDate } = require("../src/date-domain.cjs");
const { createIcsDomain } = require("../src/ics-domain.cjs");
const { timeOf } = require("../src/time-block-domain.cjs");

const daysBetweenDates = (from: string, to: string) =>
	Math.round((Date.parse(`${to}T00:00:00`) - Date.parse(`${from}T00:00:00`)) / 86_400_000);
const ics = createIcsDomain({
	addDays,
	daysBetweenDates,
	localDate,
	t: jaDomainTranslator,
	timeOf,
});
const source = { id: "team", name: "チーム", color: "#123456" };

describe("ICS domain", () => {
	it("折り返し行とエスケープ済みテキストを復元する", () => {
		expect(ics.unfoldIcs("SUMMARY:長い\r\n タイトル\r\nEND:VEVENT")).toEqual([
			"SUMMARY:長いタイトル",
			"END:VEVENT",
		]);
		expect(ics.decodeIcsText("one\\,two\\;three\\nfour\\\\five")).toBe("one,two;three\nfour\\five");
	});

	it("時刻予定を時間割項目へ変換しキャンセル済みを除外する", () => {
		const text = [
			"BEGIN:VCALENDAR",
			"BEGIN:VEVENT",
			"DTSTART:20261012T100000",
			"DTEND:20261012T113000",
			"SUMMARY:設計\\,レビュー",
			"URL:https://example.com/event",
			"END:VEVENT",
			"BEGIN:VEVENT",
			"DTSTART:20261012T120000",
			"STATUS:CANCELLED",
			"SUMMARY:中止",
			"END:VEVENT",
			"END:VCALENDAR",
		].join("\r\n");
		const result = ics.parseIcsCalendar(text, source, "2026-10-12", "2026-10-13");
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			title: "設計,レビュー",
			meta: "10:00–11:30",
			date: "2026-10-12",
			startMinutes: 600,
			endMinutes: 690,
			calendarId: "team",
			calendarName: "チーム",
			calendarColor: "#123456",
		});
	});

	it("複数日の終日予定を日付範囲として保持する", () => {
		const text = [
			"BEGIN:VEVENT",
			"DTSTART;VALUE=DATE:20261012",
			"DTEND;VALUE=DATE:20261014",
			"SUMMARY:合宿",
			"END:VEVENT",
		].join("\n");
		const result = ics.parseIcsCalendar(text, source, "2026-10-12", "2026-10-15");
		expect(result[0]).toMatchObject({
			allDay: true,
			meta: "終日",
			date: "2026-10-12",
			startMinutes: 0,
			endMinutes: 2880,
		});
		expect(result[0].dates).toEqual(["2026-10-12", "2026-10-13"]);
	});

	it("週次繰り返しを展開しEXDATEを除外する", () => {
		const text = [
			"BEGIN:VEVENT",
			"DTSTART:20261005T090000",
			"DTEND:20261005T100000",
			"RRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261019T235959",
			"EXDATE:20261012T090000",
			"SUMMARY:定例",
			"END:VEVENT",
		].join("\n");
		const result = ics.parseIcsCalendar(text, source, "2026-10-12", "2026-10-20");
		expect(result.map((item: { date: string }) => item.date)).toEqual(["2026-10-14", "2026-10-19"]);
	});

	it("不正な開始日時と開始日時なしを安全に無視する", () => {
		const text =
			"BEGIN:VEVENT\nDTSTART:broken\nSUMMARY:壊れた予定\nEND:VEVENT\nBEGIN:VEVENT\nSUMMARY:開始なし\nEND:VEVENT";
		expect(ics.parseIcsCalendar(text, source, "2026-10-12", "2026-10-13")).toEqual([]);
	});
});
