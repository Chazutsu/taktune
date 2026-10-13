function withoutCalendarError(errors = {}) {
	const next = { ...errors };
	delete next.calendar;
	return next;
}

function mergeExternalSnapshot(current, loaded, preserveCalendar = false) {
	if (!preserveCalendar) return loaded;
	const calendarError = current?.errors?.calendar;
	return {
		...loaded,
		calendar: current?.calendar || [],
		errors: {
			...withoutCalendarError(loaded?.errors),
			...(calendarError ? { calendar: calendarError } : {}),
		},
	};
}

function mergeCalendarSnapshot(current, calendar, t) {
	return {
		...current,
		calendar: calendar?.items || [],
		errors: {
			...withoutCalendarError(current?.errors),
			...(calendar?.errors?.length
				? {
						calendar: domainText(
							t,
							"external.calendar.partialError",
							"Some calendar events could not be loaded: {errors}",
							{ errors: calendar.errors.join(" / ") },
						),
					}
				: {}),
		},
	};
}

function mergeCalendarFailure(current, error, t) {
	const message = error instanceof Error ? error.message : String(error);
	return {
		...current,
		calendar: [],
		errors: {
			...withoutCalendarError(current?.errors),
			calendar: domainText(
				t,
				"external.calendar.error",
				"Calendar events could not be loaded: {message}",
				{ message },
			),
		},
	};
}

module.exports = {
	mergeCalendarFailure,
	mergeCalendarSnapshot,
	mergeExternalSnapshot,
	withoutCalendarError,
};
const { domainText } = require("./localization-domain.cjs");
