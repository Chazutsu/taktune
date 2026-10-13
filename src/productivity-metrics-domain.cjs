const { domainText } = require("./localization-domain.cjs");

function createProductivityMetricsDomain({ t, today }) {
	const tx = (key, fallback, params) => domainText(t, key, fallback, params);
	function habitLogMap(value) {
		if (Array.isArray(value)) return Object.fromEntries(value.map((date) => [date, 1]));
		return value && typeof value === "object" ? value : {};
	}

	function habitValue(log, id, date) {
		return Number(habitLogMap(log?.[id])[date] || 0);
	}

	function isHabitScheduled(habit, date) {
		if (habit.archived) return false;
		const weekday = new Date(`${date}T00:00:00`).getDay();
		return habit.scheduleMode === "weekly" || (habit.weekdays || []).includes(weekday);
	}

	function focusLogStats(log, startDate, endDate) {
		const entries = (log || []).filter((entry) => entry.date >= startDate && entry.date <= endDate);
		const byTask = new Map();
		const byMode = { timer: 0, stopwatch: 0 };
		for (const entry of entries) {
			const minutes = Number(entry.minutes || 0);
			const title = entry.title || tx("focus.noTask", "No task");
			byTask.set(title, (byTask.get(title) || 0) + minutes);
			const mode = entry.mode === "stopwatch" ? "stopwatch" : "timer";
			byMode[mode] += minutes;
		}
		return {
			totalMinutes: entries.reduce((sum, entry) => sum + Number(entry.minutes || 0), 0),
			sessions: entries.length,
			byTask: [...byTask.entries()].toSorted((a, b) => b[1] - a[1]),
			byMode,
		};
	}

	function focusElapsedSeconds(state, now = Date.now()) {
		const elapsed = Number(state.elapsed || 0);
		if (!state.running || !state.startedAt) return elapsed;
		return elapsed + Math.max(0, Math.floor((now - state.startedAt) / 1000));
	}

	function daysBetweenDates(fromDate, toDate) {
		return Math.round(
			(Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000,
		);
	}

	function monthDate(year, month, day) {
		const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
		return `${year}-${String(month + 1).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
	}

	function nthWeekdayDate(year, month, weekday, occurrence) {
		if (occurrence === -1) {
			const last = new Date(Date.UTC(year, month + 1, 0));
			last.setUTCDate(last.getUTCDate() - ((last.getUTCDay() - weekday + 7) % 7));
			return last.toISOString().slice(0, 10);
		}
		const first = new Date(Date.UTC(year, month, 1));
		const day = 1 + ((weekday - first.getUTCDay() + 7) % 7) + (occurrence - 1) * 7;
		const candidate = new Date(Date.UTC(year, month, day));
		return candidate.getUTCMonth() === month
			? candidate.toISOString().slice(0, 10)
			: nthWeekdayDate(year, month, weekday, -1);
	}

	function countdownDateForPeriod(item, year, month) {
		const source = new Date(`${item.date}T00:00:00Z`);
		const rule = item.repeat || "none";
		if (rule.endsWith("-last")) return monthDate(year, month, 31);
		if (rule.endsWith("-weekday")) {
			const weekday = Number.isInteger(item.weekday) ? item.weekday : source.getUTCDay();
			const occurrence = Number.isInteger(item.occurrence)
				? item.occurrence
				: Math.min(4, Math.ceil(source.getUTCDate() / 7));
			return nthWeekdayDate(year, month, weekday, occurrence);
		}
		return monthDate(year, month, source.getUTCDate());
	}

	function countdownNextDate(item, fromDate = today()) {
		if (!item?.date) return "";
		const rule = item.repeat || "none";
		if (rule === "none") return item.date;
		const from = new Date(`${fromDate}T00:00:00Z`);
		const source = new Date(`${item.date}T00:00:00Z`);
		if (rule.startsWith("yearly")) {
			for (let offset = 0; offset <= 2; offset += 1) {
				const year = from.getUTCFullYear() + offset;
				const candidate = countdownDateForPeriod(item, year, source.getUTCMonth());
				if (candidate >= fromDate) return candidate;
			}
		} else {
			for (let offset = 0; offset <= 24; offset += 1) {
				const period = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + offset, 1));
				const candidate = countdownDateForPeriod(
					item,
					period.getUTCFullYear(),
					period.getUTCMonth(),
				);
				if (candidate >= fromDate) return candidate;
			}
		}
		return item.date;
	}

	function countdownStatus(item, currentDate = today()) {
		const target = countdownNextDate(item, currentDate);
		const delta = daysBetweenDates(currentDate, target);
		const value = Math.abs(delta) + (item.dayMode === "plus-one" ? 1 : 0);
		return {
			target,
			delta,
			value,
			label:
				delta === 0
					? item.dayMode === "plus-one"
						? tx("countdown.firstDay", "Day 1")
						: tx("date.today", "Today")
					: delta > 0
						? tx("countdown.remaining", "{count} days left", { count: value })
						: tx("countdown.elapsed", "{count} days elapsed", { count: value }),
		};
	}

	function countdownMatchesDate(item, date) {
		if ((item.repeat || "none") === "none") return item.date === date;
		return countdownNextDate(item, date) === date;
	}

	return {
		countdownMatchesDate,
		countdownNextDate,
		countdownStatus,
		daysBetweenDates,
		focusElapsedSeconds,
		focusLogStats,
		habitLogMap,
		habitValue,
		isHabitScheduled,
	};
}

module.exports = { createProductivityMetricsDomain };
