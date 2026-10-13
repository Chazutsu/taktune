import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
	calendarCacheKey,
	googleCalendarCacheAge,
	googleCalendarCacheCovers,
	googleCalendarCacheForRange,
	mergeGoogleCalendarCache,
} = require("../src/calendar-cache-domain.cjs");

describe("calendar cache domain", () => {
	const event = {
		calendarId: "primary",
		eventId: "event-1",
		date: "2026-10-12",
		startMinutes: 600,
		endMinutes: 660,
		title: "定例",
		url: "https://example.com/event-1",
	};

	it("event IDを安定キーにし、同じ予定の更新で重複させない", () => {
		expect(calendarCacheKey(event)).toBe(
			calendarCacheKey({ ...event, title: "名称変更", startMinutes: 720 }),
		);
		const cache = mergeGoogleCalendarCache(
			null,
			[event],
			"2026-10-12T00:00:00.000Z",
			"2026-10-12",
			{ start: "2026-10-12", end: "2026-10-13" },
		);
		const updated = mergeGoogleCalendarCache(
			cache,
			[{ ...event, title: "名称変更", startMinutes: 720 }],
			"2026-10-12T01:00:00.000Z",
			"2026-10-12",
			{ start: "2026-10-12", end: "2026-10-13" },
		);
		expect(updated.items).toHaveLength(1);
		expect(updated.items[0].title).toBe("名称変更");
		expect(updated.ranges).toHaveLength(1);
	});

	it("選択カレンダーと要求期間の両方で予定を絞る", () => {
		const cache = {
			items: [event, { ...event, eventId: "event-2", calendarId: "team", date: "2026-10-13" }],
		};
		expect(googleCalendarCacheForRange(cache, ["primary"], "2026-10-12", "2026-10-13")).toEqual([
			event,
		]);
		expect(googleCalendarCacheForRange(cache, ["team"], "2026-10-12", "2026-10-13")).toEqual([]);
	});

	it("48時間の鮮度境界と同期済み範囲を判定する", () => {
		const cache = {
			updatedAt: "2026-10-12T00:00:00.000Z",
			ranges: [{ start: "2026-10-12", end: "2026-10-19" }],
		};
		expect(googleCalendarCacheAge(cache, Date.parse("2026-10-13T23:59:00.000Z")).stale).toBe(false);
		expect(googleCalendarCacheAge(cache, Date.parse("2026-10-14T00:00:00.000Z")).stale).toBe(true);
		expect(googleCalendarCacheCovers(cache, "2026-10-12", "2026-10-19")).toBe(true);
		expect(googleCalendarCacheCovers(cache, "2026-10-11", "2026-10-19")).toBe(false);
	});
});
