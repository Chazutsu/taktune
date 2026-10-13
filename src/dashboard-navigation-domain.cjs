const { domainText } = require("./localization-domain.cjs");

function createDashboardNavigationDomain({
	addDays,
	completedTaskCount,
	habitValue,
	isHabitScheduled,
	localDate,
	taskListDomain,
	t,
	weekStart,
}) {
	const tx = (key, fallback, params) => domainText(t, key, fallback, params);
	function countFor(filter, tasks, context = {}) {
		const settings = context.settings || {};
		if (filter === "notes") return (context.notes || []).length;
		if (filter === "calendar") return context.external?.calendar?.length || 0;
		if (filter === "issues")
			return (
				(context.external?.linear?.length || 0) +
				(context.external?.jira?.length || 0) +
				(context.external?.slack?.length || 0)
			);
		if (filter === "review") return completedTaskCount(tasks, weekStart(localDate()));
		if (filter === "focus")
			return (settings.focusLog || [])
				.filter((entry) => entry.date === localDate())
				.reduce((sum, entry) => sum + Number(entry.minutes || 0), 0);
		if (filter === "habits")
			return (settings.habits || []).filter(
				(habit) =>
					!habit.archived &&
					habitValue(settings.habitLog, habit.id, localDate()) >= (habit.target || 1),
			).length;
		if (filter === "countdown") return (settings.countdowns || []).length;
		if (filter === "stats") return completedTaskCount(tasks, addDays(localDate(), -6));
		if (filter === "matrix") return tasks.filter((task) => !task.done && !task.wontDo).length;
		if (filter === "trash")
			return (context.trashTasks || []).filter((task) => !task.parentKey).length;
		return taskListDomain.filteredTasks(tasks, {
			filter,
			overflowTaskKeys: context.overflowTaskKeys || new Set(),
			query: "",
			smartFilters: settings.smartFilters || [],
			sortMode: settings.sortMode || "smart",
			taskMap: context.taskMap || null,
		}).length;
	}

	function labelFor(filter, context = {}) {
		if (filter.startsWith("smart:"))
			return (
				(context.settings?.smartFilters || []).find((item) => item.id === filter.slice(6))?.name ||
				tx("navigation.filter", "Filter")
			);
		if (filter.startsWith("list:")) return filter.slice(5);
		if (filter.startsWith("tag:")) return `#${filter.slice(4)}`;
		if (filter.startsWith("status:")) return context.statusById(filter.slice(7)).name;
		const labels = {
			inbox: "Inbox",
			today: "Today",
			tomorrow: "Tomorrow",
			next: "Next 7 days",
			overdue: "Overdue",
			scheduled: "Scheduled",
			recurring: "Recurring",
			all: "All tasks",
			completed: "Completed",
			wontdo: "Won't do",
			notes: "Notes",
			trash: "Trash",
			matrix: "Eisenhower matrix",
			board: "Kanban",
			calendar: "Calendar",
			focus: "Focus",
			habits: "Habits",
			countdown: "Countdown",
			stats: "Achievements",
			issues: "Issues",
			review: "Review",
			"review-overflow": "Unreviewed carryovers",
		};
		return labels[filter] ? tx(`navigation.${filter}`, labels[filter]) : undefined;
	}

	function subtitleFor(filter, tasks, context = {}) {
		const count = countFor(filter, tasks, context);
		if (filter === "matrix")
			return tx("navigation.subtitle.matrix", "Choose the next action by importance and urgency");
		if (filter === "calendar")
			return tx("navigation.subtitle.calendar", "{count} events · drag tasks onto the timeline", {
				count,
			});
		if (filter === "focus")
			return tx("navigation.subtitle.focus", "Today {count} min · choose one task and focus", {
				count,
			});
		if (filter === "habits") {
			const scheduled = (context.settings?.habits || []).filter((habit) =>
				isHabitScheduled(habit, localDate()),
			).length;
			return tx(
				"navigation.subtitle.habits",
				"Today {count}/{scheduled} · keep small actions going",
				{ count, scheduled },
			);
		}
		if (filter === "countdown")
			return tx("navigation.subtitle.countdown", "{count} · see the time until important dates", {
				count,
			});
		if (filter === "stats")
			return tx(
				"navigation.subtitle.stats",
				"{count} completed in 7 days · task, focus, and habit trends",
				{ count },
			);
		if (filter === "issues")
			return tx("navigation.subtitle.issues", "{count} · filter Linear, Jira, and Slack by label", {
				count,
			});
		if (filter === "review")
			return tx("navigation.subtitle.review", "{count} completed · review the last 7 days", {
				count,
			});
		if (filter === "trash")
			return tx("navigation.subtitle.trash", "{count} · restore tasks to their original note", {
				count,
			});
		if (filter === "wontdo")
			return tx("navigation.subtitle.wontdo", "{count} · return tasks with the check button", {
				count,
			});
		if (filter === "notes")
			return tx("navigation.subtitle.notes", "{count} · convert between notes and tasks", {
				count,
			});
		if (filter === "today")
			return tx("navigation.subtitle.today", "{date} · {count}", { date: localDate(), count });
		return tx("navigation.subtitle.tasks", "{count} tasks", { count });
	}

	return { countFor, labelFor, subtitleFor };
}

module.exports = { createDashboardNavigationDomain };
