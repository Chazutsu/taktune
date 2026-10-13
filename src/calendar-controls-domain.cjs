const { domainText } = require("./localization-domain.cjs");

const CALENDAR_MODES = [
	["day", "Day"],
	["three", "3 days"],
	["week", "Week"],
	["multiweek", "4 weeks"],
	["month", "Month"],
	["year", "Year"],
	["agenda", "Agenda"],
];

function createCalendarControlsDomain({ addDays, addMonths, calendarRange, locale = "en", t }) {
	function calendarPeriodLabel(mode, date) {
		const range = calendarRange(mode, date);
		const activeLocale = typeof locale === "function" ? locale() : locale;
		if (mode === "year")
			return domainText(t, "calendar.period.year", "{year}", { year: date.slice(0, 4) });
		if (mode === "month")
			return new Intl.DateTimeFormat(activeLocale, { year: "numeric", month: "long" }).format(
				new Date(`${date}T00:00:00`),
			);
		if (range.days === 1)
			return new Intl.DateTimeFormat(activeLocale, {
				month: "long",
				day: "numeric",
				weekday: "short",
			}).format(new Date(`${date}T00:00:00`));
		const format = (value) =>
			new Intl.DateTimeFormat(activeLocale, { month: "short", day: "numeric" }).format(
				new Date(`${value}T00:00:00`),
			);
		return `${format(range.start)} – ${format(addDays(range.start, range.days - 1))}`;
	}

	function calendarMoveLabel(mode, days, direction) {
		const directionKey = direction < 0 ? "previous" : "next";
		if (mode === "year")
			return domainText(
				t,
				`calendar.move.${directionKey}.year`,
				direction < 0 ? "Previous year" : "Next year",
			);
		if (mode === "month")
			return domainText(
				t,
				`calendar.move.${directionKey}.month`,
				direction < 0 ? "Previous month" : "Next month",
			);
		if (days === 7)
			return domainText(
				t,
				`calendar.move.${directionKey}.week`,
				direction < 0 ? "Previous week" : "Next week",
			);
		if (days === 1)
			return domainText(
				t,
				`calendar.move.${directionKey}.day`,
				direction < 0 ? "Previous day" : "Next day",
			);
		return domainText(
			t,
			`calendar.move.${directionKey}.days`,
			direction < 0 ? "Previous {count} days" : "Next {count} days",
			{ count: days },
		);
	}

	function moveCalendarDate(mode, date, direction) {
		if (mode === "year") return addMonths(date, direction * 12);
		if (mode === "month") return addMonths(date, direction);
		return addDays(date, direction * calendarRange(mode, date).days);
	}

	function calendarControlsState({
		calendarIds,
		date,
		error,
		mode,
		search,
		selectedLists,
		selectionMode,
		subscriptions,
	}) {
		const days = calendarRange(mode, date).days;
		return {
			activeMode: mode,
			modes: CALENDAR_MODES.map(([id, label]) => ({
				id,
				label: domainText(t, `calendar.mode.${id}`, label),
			})),
			label: calendarPeriodLabel(mode, date),
			previousLabel: calendarMoveLabel(mode, days, -1),
			nextLabel: calendarMoveLabel(mode, days, 1),
			search,
			filterLabel: selectedLists.length
				? domainText(t, "calendar.filter.lists", "Lists {count}", { count: selectedLists.length })
				: domainText(t, "calendar.filter.allLists", "All lists"),
			googleLabel: `Google ${calendarIds.length}`,
			subscriptionLabel: domainText(t, "calendar.filter.subscriptions", "Subscriptions {count}", {
				count: subscriptions.filter((item) => item.enabled !== false).length,
			}),
			error,
			selectionMode,
		};
	}

	return { calendarControlsState, calendarPeriodLabel, moveCalendarDate };
}

module.exports = { CALENDAR_MODES, createCalendarControlsDomain };
