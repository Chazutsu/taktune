const { domainText } = require("./localization-domain.cjs");

function createIcsDomain({ addDays, daysBetweenDates, localDate, t, timeOf }) {
	const tx = (key, fallback, params) => domainText(t, key, fallback, params);
	function unfoldIcs(text) {
		return text.replace(/\r?\n[ \t]/gu, "").split(/\r?\n/gu);
	}

	function decodeIcsText(value = "") {
		return value
			.replace(/\\n/giu, "\n")
			.replace(/\\,/gu, ",")
			.replace(/\\;/gu, ";")
			.replace(/\\\\/gu, "\\");
	}

	function parseIcsValue(value, allDay = false) {
		if (allDay || /^\d{8}$/u.test(value)) {
			const date = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
			return { date, instant: new Date(`${date}T00:00:00`), allDay: true };
		}
		const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/u);
		if (!match) return null;
		const iso = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}${match[7]}`;
		const instant = new Date(iso);
		return { date: localDate(instant), instant, allDay: false };
	}

	function parseRRule(value = "") {
		return Object.fromEntries(
			value
				.split(";")
				.map((part) => part.split("="))
				.filter(([key, item]) => key && item),
		);
	}

	function icsRepeatsOn(event, date) {
		if (!event.rrule) return false;
		const base = event.start.date;
		const diff = daysBetweenDates(base, date);
		if (diff < 0 || event.exdates.has(date)) return false;
		const until = event.rrule.UNTIL ? parseIcsValue(event.rrule.UNTIL)?.date : "";
		if (until && date > until) return false;
		const interval = Math.max(1, Number(event.rrule.INTERVAL || 1));
		const target = new Date(`${date}T00:00:00`);
		const source = new Date(`${base}T00:00:00`);
		if (event.rrule.FREQ === "DAILY") return diff % interval === 0;
		if (event.rrule.FREQ === "WEEKLY") {
			const weekdays = (
				event.rrule.BYDAY || ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][source.getDay()]
			).split(",");
			const code = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][target.getDay()];
			return Math.floor(diff / 7) % interval === 0 && weekdays.includes(code);
		}
		if (event.rrule.FREQ === "MONTHLY") {
			const months =
				(target.getFullYear() - source.getFullYear()) * 12 + target.getMonth() - source.getMonth();
			const days = (event.rrule.BYMONTHDAY || String(source.getDate())).split(",").map(Number);
			return months % interval === 0 && days.includes(target.getDate());
		}
		if (event.rrule.FREQ === "YEARLY") {
			const years = target.getFullYear() - source.getFullYear();
			const months = (event.rrule.BYMONTH || String(source.getMonth() + 1)).split(",").map(Number);
			const days = (event.rrule.BYMONTHDAY || String(source.getDate())).split(",").map(Number);
			return (
				years % interval === 0 &&
				months.includes(target.getMonth() + 1) &&
				days.includes(target.getDate())
			);
		}
		return false;
	}

	function parseIcsCalendar(text, source, rangeStart, rangeEnd) {
		const lines = unfoldIcs(text);
		const rawEvents = [];
		let current = null;
		for (const line of lines) {
			if (line === "BEGIN:VEVENT") {
				current = {};
				continue;
			}
			if (line === "END:VEVENT") {
				if (current) rawEvents.push(current);
				current = null;
				continue;
			}
			if (!current) continue;
			const colon = line.indexOf(":");
			if (colon < 0) continue;
			const head = line.slice(0, colon);
			const value = line.slice(colon + 1);
			const [name, ...params] = head.split(";");
			if (name === "EXDATE") current.EXDATE = [...(current.EXDATE || []), ...value.split(",")];
			else current[name] = { value, params };
		}
		const output = [];
		for (const raw of rawEvents) {
			if (!raw.DTSTART || raw.STATUS?.value === "CANCELLED") continue;
			const allDay =
				raw.DTSTART.params.includes("VALUE=DATE") || /^\d{8}$/u.test(raw.DTSTART.value);
			const start = parseIcsValue(raw.DTSTART.value, allDay);
			const end = raw.DTEND
				? parseIcsValue(raw.DTEND.value, allDay)
				: allDay
					? parseIcsValue(raw.DTSTART.value, true)
					: null;
			if (!start) continue;
			const durationMinutes = allDay
				? Math.max(1, daysBetweenDates(start.date, end?.date || addDays(start.date, 1))) * 1440
				: Math.max(
						15,
						Math.round(
							((end?.instant || new Date(start.instant.getTime() + 3_600_000)) - start.instant) /
								60_000,
						),
					);
			const event = {
				start,
				rrule: raw.RRULE ? parseRRule(raw.RRULE.value) : null,
				exdates: new Set(
					(raw.EXDATE || []).map((value) => parseIcsValue(value, allDay)?.date).filter(Boolean),
				),
			};
			const dates = [];
			if (event.rrule) {
				for (let date = rangeStart; date < rangeEnd; date = addDays(date, 1))
					if (icsRepeatsOn(event, date)) dates.push(date);
			} else if (
				start.date < rangeEnd &&
				addDays(start.date, Math.ceil(durationMinutes / 1440)) >= rangeStart
			)
				dates.push(start.date);
			for (const date of dates) {
				const startMinutes = allDay
					? 0
					: start.instant.getHours() * 60 + start.instant.getMinutes();
				const spanDays = allDay ? Math.max(1, Math.ceil(durationMinutes / 1440)) : 0;
				output.push({
					title:
						decodeIcsText(raw.SUMMARY?.value) || tx("calendar.event.untitled", "Untitled event"),
					meta: allDay
						? tx("calendar.event.allDay", "All day")
						: `${timeOf(startMinutes)}–${timeOf((startMinutes + durationMinutes) % 1440)}`,
					url: raw.URL?.value || "",
					icon: "calendar-clock",
					allDay,
					date,
					dates: allDay ? Array.from({ length: spanDays }, (_, index) => addDays(date, index)) : [],
					startMinutes,
					endMinutes: startMinutes + durationMinutes,
					calendarId: source.id,
					calendarName: source.name || tx("calendar.subscription", "Subscribed calendar"),
					calendarColor: source.color || "#5aa38b",
				});
			}
		}
		return output;
	}

	return { decodeIcsText, icsRepeatsOn, parseIcsCalendar, parseIcsValue, parseRRule, unfoldIcs };
}

module.exports = { createIcsDomain };
