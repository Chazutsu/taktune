const NON_TASK_LIST_FILTERS = new Set([
	"calendar",
	"issues",
	"review",
	"matrix",
	"board",
	"focus",
	"habits",
	"countdown",
	"stats",
	"notes",
]);
const NON_SEARCHABLE_FILTERS = new Set([
	"calendar",
	"review",
	"focus",
	"habits",
	"countdown",
	"stats",
	"notes",
]);
const NON_SELECTABLE_FILTERS = new Set([
	"calendar",
	"issues",
	"review",
	"matrix",
	"board",
	"focus",
	"habits",
	"countdown",
	"stats",
	"trash",
	"notes",
]);
const SYNC_FILTERS = new Set(["calendar", "issues", "inbox"]);
const PRIMARY_IDS = new Set(["today", "inbox", "next", "calendar"]);

function usesTaskList(filter) {
	return !NON_TASK_LIST_FILTERS.has(filter);
}

function screenCapabilities(filter) {
	const taskList = usesTaskList(filter);
	return {
		searchable: !NON_SEARCHABLE_FILTERS.has(filter),
		selectable: !NON_SELECTABLE_FILTERS.has(filter),
		showSync: SYNC_FILTERS.has(filter),
		taskList,
		taskViewOptions: taskList && filter !== "trash",
	};
}

function primaryNavigation(items, t) {
	return items
		.filter((item) => PRIMARY_IDS.has(item.id))
		.map((item) =>
			item.id === "next"
				? { ...item, label: domainText(t, "navigation.nextShort", "Next 7") }
				: item,
		);
}

function screenValues({
	filter,
	groupMode = "auto",
	query = "",
	selectionMode = false,
	sortMode = "smart",
	subtitle,
	title,
}) {
	const capabilities = screenCapabilities(filter);
	return {
		capabilities,
		groupMode: capabilities.taskViewOptions ? groupMode : undefined,
		query: capabilities.searchable ? query : undefined,
		selectionMode: capabilities.selectable ? selectionMode : undefined,
		sortMode: capabilities.taskViewOptions ? sortMode : undefined,
		subtitle,
		title,
	};
}

module.exports = { primaryNavigation, screenCapabilities, screenValues, usesTaskList };
const { domainText } = require("./localization-domain.cjs");
