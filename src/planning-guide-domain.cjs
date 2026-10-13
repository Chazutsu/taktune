const { reviewFocusItemCount } = require("./review-domain.cjs");

function planningGuideState({
	filter,
	tasks = [],
	inboxRemaining = 0,
	overdueRemaining = 0,
	selectedCount = 0,
	reviewNext = "",
}) {
	return {
		available: ["today", "inbox", "overdue", "calendar", "review"].includes(filter),
		inboxRemaining,
		overdueRemaining,
		unplannedRemaining: tasks.filter(
			(task) => !task.done && !task.wontDo && !task.parentKey && !task.timeBlock,
		).length,
		selectedCount,
		focusCount: reviewFocusItemCount(reviewNext),
	};
}

function planningGuideNavigationState(view, today) {
	return view === "calendar"
		? { filter: "calendar", calendarMode: "day", calendarDate: today, calendarTrayCollapsed: false }
		: { filter: view };
}

module.exports = { planningGuideNavigationState, planningGuideState };
