const { addDays, localDate } = require("./date-domain.cjs");

function calendarCacheKey(item) {
	if (item.eventId) return [item.calendarId || "", item.eventId].join("\u0000");
	return [
		item.calendarId || "",
		item.url || "",
		item.date || "",
		item.startMinutes ?? "",
		item.endMinutes ?? "",
		item.title || "",
	].join("\u0000");
}

function mergeGoogleCalendarCache(
	current,
	items,
	updatedAt = new Date().toISOString(),
	today = localDate(),
	range = null,
) {
	const minimum = addDays(today, -31);
	const maximum = addDays(today, 181);
	const merged = new Map();
	const retained = (item) => {
		const dates = Array.isArray(item?.dates) && item.dates.length ? item.dates : [item?.date];
		return Boolean(item?.calendarId && dates.some((date) => date >= minimum && date < maximum));
	};
	for (const item of Array.isArray(current?.items) ? current.items : []) {
		if (!retained(item)) continue;
		merged.set(calendarCacheKey(item), item);
	}
	for (const item of Array.isArray(items) ? items : []) {
		if (!retained(item)) continue;
		if (item.eventId && item.url) {
			for (const [key, existing] of merged) {
				if (
					!existing.eventId &&
					existing.calendarId === item.calendarId &&
					existing.url === item.url
				)
					merged.delete(key);
			}
		}
		merged.set(calendarCacheKey(item), item);
	}
	const ranges = [...(Array.isArray(current?.ranges) ? current.ranges : []), range]
		.filter((value) => value?.start && value?.end && value.end > minimum && value.start < maximum)
		.filter(
			(value, index, values) =>
				values.findIndex(
					(candidate) => candidate.start === value.start && candidate.end === value.end,
				) === index,
		)
		.slice(-60);
	return { version: 1, updatedAt, ranges, items: [...merged.values()].slice(-2000) };
}

function googleCalendarCacheForRange(cache, calendarIds, rangeStart, rangeEnd) {
	const selected = new Set(calendarIds || []);
	return (Array.isArray(cache?.items) ? cache.items : []).filter((item) => {
		if (!selected.has(item.calendarId)) return false;
		const dates = Array.isArray(item.dates) && item.dates.length ? item.dates : [item.date];
		return dates.some((date) => date >= rangeStart && date < rangeEnd);
	});
}

function googleCalendarCacheAge(cache, now = Date.now()) {
	const timestamp = Date.parse(cache?.updatedAt || "");
	if (!Number.isFinite(timestamp)) return { available: false, stale: true, hours: Infinity };
	const hours = Math.max(0, Math.floor((now - timestamp) / 3_600_000));
	return { available: true, stale: hours >= 48, hours };
}

function googleCalendarCacheCovers(cache, rangeStart, rangeEnd) {
	return (Array.isArray(cache?.ranges) ? cache.ranges : []).some(
		(range) => range?.start <= rangeStart && range?.end >= rangeEnd,
	);
}

module.exports = {
	calendarCacheKey,
	googleCalendarCacheAge,
	googleCalendarCacheCovers,
	googleCalendarCacheForRange,
	mergeGoogleCalendarCache,
};
