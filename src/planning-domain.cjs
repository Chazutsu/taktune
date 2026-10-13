function createPlanningDomain({ describeTask, matchesQuery, today }) {
	if (
		typeof describeTask !== "function" ||
		typeof matchesQuery !== "function" ||
		typeof today !== "function"
	) {
		throw new TypeError("planning domain requires describeTask, matchesQuery, and today");
	}

	function calendarPlanningState(taskKey, date, currentDate = today(), scheduled = false) {
		const selectable = Boolean(taskKey) && !scheduled;
		const candidate = /^\d{4}-\d{2}-\d{2}$/u.test(date || "")
			? new Date(`${date}T00:00:00Z`)
			: null;
		const validDate =
			candidate &&
			!Number.isNaN(candidate.getTime()) &&
			candidate.toISOString().slice(0, 10) === date
				? date
				: "";
		const targetDate = scheduled
			? validDate || currentDate
			: !validDate || validDate < currentDate
				? currentDate
				: validDate;
		return {
			filter: "calendar",
			mode: "day",
			date: targetDate,
			selectedTaskKeys: new Set(selectable ? [taskKey] : []),
			selectionMode: selectable,
		};
	}

	function planTrayVisibleTasks(
		tasks,
		selectedLists = [],
		query = "",
		selectedTaskKeys = new Set(),
	) {
		return tasks.filter((task) => {
			if (selectedTaskKeys.has(task.key)) return true;
			if (selectedLists.length && !selectedLists.includes(task.list || "Inbox")) return false;
			return matchesQuery(
				[describeTask(task.raw), task.list, ...(task.tags || []), task.path]
					.filter(Boolean)
					.join(" "),
				query,
			);
		});
	}

	function sortPlanTrayTasks(tasks, sort = "priority", selectedTaskKeys = new Set()) {
		return [...tasks].toSorted((a, b) => {
			const selectionOrder =
				Number(selectedTaskKeys.has(b.key)) - Number(selectedTaskKeys.has(a.key));
			if (selectionOrder) return selectionOrder;
			if (sort === "title") return describeTask(a.raw).localeCompare(describeTask(b.raw));
			if (sort === "due")
				return (
					(a.due || "9999-12-31").localeCompare(b.due || "9999-12-31") ||
					(b.priority || 0) - (a.priority || 0)
				);
			return (
				(b.priority || 0) - (a.priority || 0) ||
				(a.due || "9999-12-31").localeCompare(b.due || "9999-12-31")
			);
		});
	}

	return { calendarPlanningState, planTrayVisibleTasks, sortPlanTrayTasks };
}

async function resolveReviewFocusTaskKey(item, existingKey, cachedKeys, createTask) {
	if (existingKey) {
		cachedKeys.set(item, existingKey);
		return existingKey;
	}
	const cached = cachedKeys.get(item);
	if (cached) return cached;
	const created = await createTask();
	cachedKeys.set(item, created);
	return created;
}

module.exports = { createPlanningDomain, resolveReviewFocusTaskKey };
