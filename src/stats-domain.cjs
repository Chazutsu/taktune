const { domainText } = require("./localization-domain.cjs");

function createStatsDomain({
	addDays,
	completedTaskCount,
	habitValue,
	t,
	today,
	weeklyPlanReview,
}) {
	const tx = (key, fallback, params) => domainText(t, key, fallback, params);
	function statsSnapshot({
		tasks = [],
		focusLog = [],
		habits = [],
		habitLog = {},
		currentDate = today(),
	}) {
		const start = addDays(currentDate, -6);
		const completedWeek = completedTaskCount(tasks, start, currentDate);
		const planWeek = weeklyPlanReview(tasks, start, currentDate);
		const focusWeek = focusLog
			.filter((entry) => entry.date >= start && entry.date <= currentDate)
			.reduce((sum, entry) => {
				const minutes = Number(entry.minutes || 0);
				return sum + (Number.isFinite(minutes) && minutes > 0 ? minutes : 0);
			}, 0);
		const activeHabits = habits.filter((habit) => !habit.archived);
		let habitScheduled = 0;
		let habitCompleted = 0;
		for (let offset = -6; offset <= 0; offset += 1) {
			const date = addDays(currentDate, offset);
			const weekday = new Date(`${date}T00:00:00`).getDay();
			for (const habit of activeHabits) {
				if (habit.scheduleMode === "weekly" || !(habit.weekdays || []).includes(weekday)) continue;
				habitScheduled += 1;
				const target = Math.max(1, Number(habit.target) || 1);
				if (habitValue(habitLog, habit.id, date) >= target) habitCompleted += 1;
			}
		}
		for (const habit of activeHabits.filter((item) => item.scheduleMode === "weekly")) {
			const weeklyTarget = Math.max(1, Number(habit.weeklyTarget) || 1);
			const target = Math.max(1, Number(habit.target) || 1);
			const completed = Array.from({ length: 7 }, (_, index) => addDays(start, index)).filter(
				(date) => habitValue(habitLog, habit.id, date) >= target,
			).length;
			habitScheduled += weeklyTarget;
			habitCompleted += Math.min(completed, weeklyTarget);
		}
		const dates = Array.from({ length: 14 }, (_, index) => addDays(currentDate, index - 13));
		const open = tasks.filter((task) => !task.done && !task.wontDo && !task.parentKey);
		const listCounts = new Map();
		open.forEach((task) =>
			listCounts.set(task.list || "Inbox", (listCounts.get(task.list || "Inbox") || 0) + 1),
		);
		return {
			summary: [
				[
					tx("stats.completed", "Completed in the last 7 days"),
					tx("common.count", "{count}", { count: completedWeek }),
					"circle-check-big",
				],
				[
					tx("stats.plan", "Plan execution in the last 7 days"),
					planWeek.rate === null
						? "—"
						: tx("stats.planValue", "{completed}/{planned}", {
								completed: planWeek.completed.length,
								planned: planWeek.planned.length,
							}),
					"calendar-check",
				],
				[
					tx("stats.focus", "Focus in the last 7 days"),
					tx("common.minutes", "{count} min", { count: focusWeek }),
					"timer",
				],
				[
					tx("stats.habits", "Habit completion in the last 7 days"),
					habitScheduled ? `${Math.round((habitCompleted / habitScheduled) * 100)}%` : "—",
					"flame",
				],
			].map(([label, value, icon]) => ({ label, value, icon })),
			completionDays: dates.map((date) => ({
				date,
				label: date.slice(8),
				count: completedTaskCount(tasks, date, date),
			})),
			priorities: [
				[3, tx("priority.high", "High")],
				[2, tx("priority.medium", "Medium")],
				[1, tx("priority.normal", "Normal")],
				[0, tx("priority.low", "Low")],
			]
				.map(([priority, label]) => ({
					label,
					count: open.filter((task) => task.priority === priority).length,
				}))
				.filter((item) => item.count > 0),
			lists: [...listCounts.entries()]
				.toSorted((a, b) => b[1] - a[1])
				.slice(0, 6)
				.map(([label, count]) => ({ label, count })),
			openCount: open.length,
			overdueCount: open.filter((task) => task.due && task.due < currentDate).length,
		};
	}

	return { statsSnapshot };
}

module.exports = { createStatsDomain };
