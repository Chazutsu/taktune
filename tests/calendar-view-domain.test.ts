import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { jaDomainTranslator } from "./domain-translator";

const require = createRequire(import.meta.url);
const {
	calendarBlockLayout,
	calendarConflictLabel,
	calendarItemDates,
	calendarRequestParams,
	calendarTimeZones,
	calendarTrayStartsCollapsed,
	createCalendarViewDomain,
	matchesCalendarQuery,
	selectedCalendarIds,
} = require("../src/calendar-view-domain.cjs");
const { addDays, localDate } = require("../src/date-domain.cjs");
const { weekStart } = require("../src/review-domain.cjs");

const view = createCalendarViewDomain({ addDays, localDate, weekStart });

describe("calendar view domain", () => {
	it("表示モードからうるう年を含む期間を決める", () => {
		expect(view.calendarRange("week", "2026-10-12")).toEqual({ start: "2026-10-12", days: 7 });
		expect(view.calendarRange("multiweek", "2026-10-14")).toEqual({
			start: "2026-10-12",
			days: 28,
		});
		expect(view.calendarRange("year", "2028-06-01")).toEqual({ start: "2028-01-01", days: 366 });
		expect(view.monthGridDates("2026-10-12")).toHaveLength(42);
	});

	it("重なる予定を最小レーンへ配置し入力順を破壊しない", () => {
		const items = [
			{ id: "late", startMinutes: 660, endMinutes: 720 },
			{ id: "base", startMinutes: 600, endMinutes: 690 },
			{ id: "free", startMinutes: 720, endMinutes: 750 },
		];
		const layout = calendarBlockLayout(items);
		expect(
			layout.map((entry: { item: { id: string }; lane: number; lanes: number }) => [
				entry.item.id,
				entry.lane,
				entry.lanes,
			]),
		).toEqual([
			["base", 0, 2],
			["late", 1, 2],
			["free", 0, 1],
		]);
		expect(items.map((item) => item.id)).toEqual(["late", "base", "free"]);
	});

	it("予定とタスクの競合種別を区別する", () => {
		const target = { kind: "task", startMinutes: 600, endMinutes: 660 };
		expect(
			calendarConflictLabel(
				target,
				[
					target,
					{ kind: "event", startMinutes: 620, endMinutes: 630 },
					{ kind: "task", startMinutes: 650, endMinutes: 700 },
				],
				jaDomainTranslator,
			),
		).toBe("予定・別のタスクと重複");
		expect(
			calendarConflictLabel(target, [
				target,
				{ kind: "event", startMinutes: 660, endMinutes: 700 },
			]),
		).toBe("");
	});

	it("カレンダー選択、検索、日付とモバイル境界を正規化する", () => {
		expect(selectedCalendarIds({ googleCalendarIds: [" primary ", "team", "primary"] })).toEqual([
			"primary",
			"team",
		]);
		expect(selectedCalendarIds({ googleCalendarIds: [], googleCalendarId: "legacy" })).toEqual([
			"legacy",
		]);
		expect(
			calendarTimeZones([
				"Asia/Tokyo",
				"invalid",
				"Asia/Tokyo",
				"UTC",
				"Europe/London",
				"America/New_York",
				"Australia/Sydney",
			]),
		).toEqual(["Asia/Tokyo", "UTC", "Europe/London", "America/New_York"]);
		expect(matchesCalendarQuery("開発 定例", " 定例 ")).toBe(true);
		expect(calendarItemDates({ date: "2026-10-12" })).toEqual(["2026-10-12"]);
		expect(calendarTrayStartsCollapsed(720)).toBe(true);
		expect(calendarTrayStartsCollapsed(721)).toBe(false);
	});

	it("Google Calendar APIパラメータへページトークンを必要時だけ付ける", () => {
		expect(calendarRequestParams("primary", "start", "end")).not.toHaveProperty("pageToken");
		expect(calendarRequestParams("primary", "start", "end", "next")).toMatchObject({
			calendarId: "primary",
			maxResults: 2500,
			orderBy: "startTime",
			pageToken: "next",
			singleEvents: true,
		});
	});
});
