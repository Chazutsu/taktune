function createCaptureDomain({
	addDays,
	externalItemStateForTasks,
	externalProviderLabel,
	localDate,
	parseQuickTask,
	pendingExternalItems,
	quickTaskPreview,
}) {
	function inboxModelData(external, externalItemState, tasks, limit = 5) {
		const handled = externalItemStateForTasks(
			externalItemState || { imported: {}, dismissed: {} },
			tasks,
		);
		const candidates = pendingExternalItems(external, handled);
		return {
			total: candidates.length,
			unplannedCount: tasks.filter(
				(task) => !task.done && !task.wontDo && !task.parentKey && !task.timeBlock,
			).length,
			items: candidates
				.slice(0, limit)
				.map((item) => ({ ...item, sourceLabel: externalProviderLabel(item) })),
			errors: [external.errors?.linear, external.errors?.jira, external.errors?.slack].filter(
				Boolean,
			),
		};
	}

	function quickAddTemplates(templates) {
		return (templates || []).map((item) => ({
			id: item.id,
			name: item.name,
			description: item.description,
			resolvedDue:
				item.dueOffset === null || item.dueOffset === undefined
					? ""
					: addDays(localDate(), item.dueOffset),
		}));
	}

	function quickAddPreview(description, due) {
		return quickTaskPreview(parseQuickTask(description), due);
	}

	function resolveQuickAdd({
		description,
		due = "",
		filter = "",
		templateId = "",
		templates = [],
	}) {
		const selected = templates.find((item) => item.id === templateId);
		const parsed = parseQuickTask(description);
		if (!parsed.description) return null;
		const contextList = filter.startsWith("list:") ? filter.slice(5) : "";
		const contextTag = filter.startsWith("tag:") ? filter.slice(4) : "";
		return {
			description: parsed.description,
			due:
				due ||
				parsed.due ||
				(selected?.dueOffset === null || selected?.dueOffset === undefined
					? ""
					: addDays(localDate(), selected.dueOffset)),
			metadata: {
				...selected,
				list: contextList || parsed.list || selected?.list || "",
				tags: [
					...new Set([
						...(selected?.tags || []),
						...parsed.tags,
						...(contextTag ? [contextTag] : []),
					]),
				],
				priority: parsed.priority !== 1 ? parsed.priority : selected?.priority,
				repeat: parsed.repeat || selected?.repeat || "",
				reminderTime: parsed.reminderTime || "",
				reminderOffsetMinutes: parsed.reminderOffsetMinutes || 0,
			},
		};
	}

	return { inboxModelData, quickAddPreview, quickAddTemplates, resolveQuickAdd };
}

module.exports = { createCaptureDomain };
