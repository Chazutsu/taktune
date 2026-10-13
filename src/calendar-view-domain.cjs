function createCalendarViewDomain({ addDays, localDate, weekStart }) {
	function calendarTaskColor(task, mode, taxonomyColor) {
		if (mode === "priority")
			return { 3: "#e25555", 2: "#e49a38", 1: "#4772fa", 0: "#8a94a6" }[task.priority] || "#4772fa";
		if (mode === "tag") return task.tags?.[0] ? taxonomyColor("tag", task.tags[0]) : "#8a94a6";
		return task.list ? taxonomyColor("list", task.list) : "#4772fa";
	}

	function calendarSpan(mode) {
		return (
			{ day: 1, three: 3, week: 7, multiweek: 28, month: 42, agenda: 30, year: 366 }[mode] || 1
		);
	}

	function addMonths(date, amount) {
		const next = new Date(`${date.slice(0, 7)}-01T00:00:00`);
		next.setMonth(next.getMonth() + amount);
		return localDate(next);
	}

	function monthGridDates(date) {
		const start = weekStart(`${date.slice(0, 7)}-01`);
		return Array.from({ length: 42 }, (_, index) => addDays(start, index));
	}

	function calendarRange(mode, date) {
		if (mode === "month") return { start: monthGridDates(date)[0], days: 42 };
		if (mode === "multiweek") return { start: weekStart(date), days: 28 };
		if (mode === "year") {
			const year = Number(date.slice(0, 4));
			const start = `${year}-01-01`;
			return { start, days: addDays(start, 365).startsWith(`${year}-`) ? 366 : 365 };
		}
		return { start: date, days: calendarSpan(mode) };
	}

	return { addMonths, calendarRange, calendarSpan, calendarTaskColor, monthGridDates };
}

function calendarRequestParams(calendarId, timeMin, timeMax, pageToken = "") {
	return {
		calendarId,
		timeMin,
		timeMax,
		singleEvents: true,
		orderBy: "startTime",
		maxResults: 2500,
		...(pageToken ? { pageToken } : {}),
	};
}

function selectedCalendarIds(settings) {
	const ids = (settings.googleCalendarIds || []).map((value) => value.trim()).filter(Boolean);
	return [...new Set(ids.length ? ids : [settings.googleCalendarId || "primary"])];
}

function isValidTimeZone(value) {
	if (!value) return false;
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
		return true;
	} catch {
		return false;
	}
}

function calendarTimeZoneLabel(date, hour, timeZone, locale = "en") {
	const instant = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00`);
	return new Intl.DateTimeFormat(typeof locale === "function" ? locale() : locale, {
		timeZone,
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).format(instant);
}

function calendarTimeZones(values) {
	return [...new Set((values || []).map((value) => value.trim()).filter(isValidTimeZone))].slice(
		0,
		4,
	);
}

function calendarItemDates(item) {
	return item.dates?.length ? item.dates : [item.date];
}

function matchesCalendarQuery(value, query) {
	const normalized = query.trim().toLocaleLowerCase();
	return !normalized || value.toLocaleLowerCase().includes(normalized);
}

function calendarBlockLayout(items) {
	const sorted = [...items].toSorted(
		(a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes,
	);
	const result = [];
	for (let index = 0; index < sorted.length; ) {
		const cluster = [];
		let clusterEnd = sorted[index].endMinutes;
		do {
			const item = sorted[index];
			cluster.push(item);
			clusterEnd = Math.max(clusterEnd, item.endMinutes);
			index += 1;
		} while (index < sorted.length && sorted[index].startMinutes < clusterEnd);
		const laneEnds = [];
		const positioned = cluster.map((item) => {
			let lane = laneEnds.findIndex((end) => end <= item.startMinutes);
			if (lane < 0) lane = laneEnds.length;
			laneEnds[lane] = item.endMinutes;
			return { item, lane };
		});
		const lanes = laneEnds.length;
		positioned.forEach(({ item, lane }) => result.push({ item, lane, lanes }));
	}
	return result;
}

function calendarConflictLabel(target, items, t) {
	const conflicts = items.filter(
		(item) =>
			item !== target &&
			target.startMinutes < item.endMinutes &&
			target.endMinutes > item.startMinutes,
	);
	const event = conflicts.some((item) => item.kind === "event");
	const task = conflicts.some((item) => item.kind === "task");
	if (event && task)
		return domainText(t, "calendar.conflict.eventAndTask", "Overlaps an event and another task");
	if (event) return domainText(t, "calendar.conflict.event", "Overlaps an event");
	if (task) return domainText(t, "calendar.conflict.task", "Overlaps another task");
	return "";
}

function calendarTrayStartsCollapsed(viewportWidth) {
	return Number.isFinite(viewportWidth) && viewportWidth <= 720;
}

module.exports = {
	calendarBlockLayout,
	calendarConflictLabel,
	calendarItemDates,
	calendarRequestParams,
	calendarTimeZoneLabel,
	calendarTimeZones,
	calendarTrayStartsCollapsed,
	createCalendarViewDomain,
	isValidTimeZone,
	matchesCalendarQuery,
	selectedCalendarIds,
};
const { domainText } = require("./localization-domain.cjs");
