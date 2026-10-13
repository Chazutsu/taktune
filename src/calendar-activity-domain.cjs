const { domainText } = require("./localization-domain.cjs");

function createCalendarActivityDomain({
	countdownMatchesDate,
	habitValue,
	isHabitScheduled,
	matchesQuery,
	multiTimeBlockPattern,
	taskPattern,
	t,
	timeOf,
}) {
	const tx = (key, fallback, params) => domainText(t, key, fallback, params);
	function calendarActivityItems(settings, date, query = "") {
		const items = [];
		for (const countdown of settings.countdowns || []) {
			if (!countdownMatchesDate(countdown, date)) continue;
			items.push({
				activityType: "countdown",
				date,
				title: countdown.title,
				meta: countdown.note || tx("calendar.activity.importantDate", "Important date"),
				icon: "hourglass",
				achieved: true,
				color: countdown.color || "#e58b3e",
			});
		}
		if (settings.calendarShowHabits !== false) {
			for (const habit of (settings.habits || []).filter((item) => !item.archived)) {
				const value = habitValue(settings.habitLog, habit.id, date);
				if (!isHabitScheduled(habit, date)) continue;
				const target = habit.target || 1;
				const achieved = value >= target;
				items.push({
					activityType: "habit",
					date,
					title: `${achieved ? "✓ " : ""}${habit.name}`,
					meta: tx("calendar.activity.habitProgress", "{value}/{target} {unit}", {
						value,
						target,
						unit: habit.unit || tx("calendar.activity.times", "times"),
					}),
					icon: "flame",
					achieved,
				});
			}
		}
		if (settings.calendarShowFocus !== false) {
			const logs = (settings.focusLog || []).filter((entry) => entry.date === date);
			const minutes = logs.reduce((sum, entry) => sum + entry.minutes, 0);
			if (minutes)
				items.push({
					activityType: "focus",
					date,
					title: tx("calendar.activity.focus", "Focus {minutes} min", { minutes }),
					meta:
						[...new Set(logs.map((entry) => entry.title).filter(Boolean))].join(" · ") ||
						tx("calendar.activity.focusLog", "Focus log"),
					icon: "timer",
					achieved: true,
				});
		}
		return items.filter((item) => matchesQuery(`${item.title} ${item.meta}`, query));
	}

	function taskLineWithTime(line, date, startMinutes, durationMinutes) {
		const match = line.match(taskPattern);
		if (!match) throw new Error(tx("task.error.moved", "The task moved and could not be updated"));
		let raw = match[4]
			.replace(multiTimeBlockPattern, "")
			.replace(/\s*⏰\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}-\d{2}:\d{2}/gu, "")
			.trimEnd();
		const doneMatch = raw.match(/\s+✅\s*\d{4}-\d{2}-\d{2}\s*$/u);
		const doneSource = doneMatch?.[0] || "";
		const done = doneSource ? ` ${doneSource.trim()}` : "";
		if (doneSource) raw = raw.slice(0, -doneSource.length).trimEnd();
		const endMinutes = Math.min(24 * 60 - 1, startMinutes + durationMinutes);
		return `${match[1]}${match[2]}${match[3]}${raw} ⏰ ${date} ${timeOf(startMinutes)}-${timeOf(endMinutes)}${done}`;
	}

	return { calendarActivityItems, taskLineWithTime };
}

module.exports = { createCalendarActivityDomain };
