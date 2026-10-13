const { domainText } = require("./localization-domain.cjs");

function createTaskListDomain({
	addDays,
	cleanDescription,
	locale = "en",
	localDate,
	t,
	taskTimeBucket,
}) {
	const tx = (key, fallback, params) => domainText(t, key, fallback, params);
	function rootTask(task, tasks, taskMap = null) {
		const map = taskMap || new Map(tasks.map((item) => [item.key, item]));
		let root = task;
		const visited = new Set();
		while (root.parentKey && map.has(root.parentKey) && !visited.has(root.key)) {
			visited.add(root.key);
			root = map.get(root.parentKey);
		}
		return root;
	}

	function matchesSavedFilter(task, saved, today, end) {
		if (task.done || task.wontDo) return false;
		if (
			saved.keyword &&
			!`${task.raw} ${task.path}`.toLowerCase().includes(saved.keyword.toLowerCase())
		)
			return false;
		if (saved.list && task.list !== saved.list) return false;
		if (saved.tag && !task.tags.includes(saved.tag)) return false;
		if (saved.priority !== null && saved.priority !== undefined && task.priority !== saved.priority)
			return false;
		if (saved.due === "today" && task.due !== today) return false;
		if (saved.due === "tomorrow" && task.due !== addDays(today, 1)) return false;
		if (saved.due === "next" && (!task.due || task.due < today || task.due > end)) return false;
		if (saved.due === "overdue" && (!task.due || task.due >= today)) return false;
		if (saved.due === "none" && task.due) return false;
		return true;
	}

	function compareTasks(a, b, { mode = "smart", taskMap, tasks }) {
		const rootA = rootTask(a, tasks, taskMap);
		const rootB = rootTask(b, tasks, taskMap);
		if (rootA.key === rootB.key) return a.line - b.line;
		if (mode === "due")
			return (
				(rootA.due || "9999").localeCompare(rootB.due || "9999") || rootB.priority - rootA.priority
			);
		if (mode === "priority")
			return (
				rootB.priority - rootA.priority || (rootA.due || "9999").localeCompare(rootB.due || "9999")
			);
		if (mode === "title")
			return cleanDescription(rootA.raw).localeCompare(cleanDescription(rootB.raw));
		if (mode === "created-desc")
			return (
				rootB.createdAt - rootA.createdAt ||
				rootA.path.localeCompare(rootB.path) ||
				rootA.line - rootB.line
			);
		if (mode === "created-asc")
			return (
				rootA.createdAt - rootB.createdAt ||
				rootA.path.localeCompare(rootB.path) ||
				rootA.line - rootB.line
			);
		if (mode === "modified-desc")
			return (
				rootB.modifiedAt - rootA.modifiedAt ||
				rootA.path.localeCompare(rootB.path) ||
				rootA.line - rootB.line
			);
		if (mode === "modified-asc")
			return (
				rootA.modifiedAt - rootB.modifiedAt ||
				rootA.path.localeCompare(rootB.path) ||
				rootA.line - rootB.line
			);
		if (mode === "manual" || mode === "source")
			return rootA.path.localeCompare(rootB.path) || rootA.line - rootB.line;
		return (
			rootB.priority - rootA.priority ||
			(rootA.due || "9999").localeCompare(rootB.due || "9999") ||
			rootA.path.localeCompare(rootB.path) ||
			rootA.line - rootB.line
		);
	}

	function filteredTasks(
		tasks,
		{
			filter,
			overflowTaskKeys = new Set(),
			query = "",
			smartFilters = [],
			sortMode = "smart",
			taskMap = null,
		},
	) {
		const today = localDate();
		const end = addDays(today, 7);
		const needle = query.trim().toLowerCase();
		return tasks
			.filter((task) => {
				if (filter === "trash") return !task.parentKey;
				if (filter.startsWith("smart:")) {
					const saved = smartFilters.find((item) => item.id === filter.slice(6));
					return saved ? matchesSavedFilter(task, saved, today, end) : false;
				}
				if (filter.startsWith("list:"))
					return !task.done && !task.wontDo && task.list === filter.slice(5);
				if (filter.startsWith("tag:"))
					return !task.done && !task.wontDo && task.tags.includes(filter.slice(4));
				if (filter.startsWith("status:"))
					return !task.done && !task.wontDo && task.status === filter.slice(7);
				if (filter === "review-overflow") return overflowTaskKeys.has(task.key);
				if (filter === "completed") return task.done && !task.wontDo;
				if (filter === "wontdo") return task.wontDo;
				if (task.done || task.wontDo) return false;
				if (filter === "inbox") return !task.due;
				if (filter === "today") return task.due === today;
				if (filter === "tomorrow") return task.due === addDays(today, 1);
				if (filter === "next") return task.due && task.due >= today && task.due <= end;
				if (filter === "overdue") return task.due && task.due < today;
				if (filter === "scheduled") return Boolean(task.due || task.timeBlock);
				if (filter === "recurring") return Boolean(task.repeat);
				return true;
			})
			.filter(
				(task) =>
					!needle ||
					task.raw.toLowerCase().includes(needle) ||
					task.path.toLowerCase().includes(needle),
			)
			.toSorted((a, b) => compareTasks(a, b, { mode: sortMode, taskMap, tasks }));
	}

	function friendlyDate(date) {
		const today = localDate();
		if (date === today) return tx("date.today", "Today");
		if (date === addDays(today, 1)) return tx("date.tomorrow", "Tomorrow");
		return new Intl.DateTimeFormat(typeof locale === "function" ? locale() : locale, {
			month: "short",
			day: "numeric",
			weekday: "short",
		}).format(new Date(`${date}T00:00:00`));
	}

	function groupTasks(
		tasks,
		{ filter, groupMode = "auto", statusById, taskMap = null, allTasks = tasks },
	) {
		if (groupMode === "none") return [["", tasks]];
		if (groupMode !== "auto") {
			const map = new Map();
			const bucketRanks = new Map();
			for (const task of tasks) {
				const root = rootTask(task, allTasks, taskMap);
				let key = tx("task.group.other", "Other");
				if (groupMode === "due") key = root.due || tx("task.group.noDueDate", "No due date");
				if (groupMode === "status") key = statusById(root.status).name;
				if (groupMode === "priority")
					key = {
						3: tx("priority.high", "High"),
						2: tx("priority.medium", "Medium"),
						1: tx("priority.normal", "Normal"),
						0: tx("priority.low", "Low"),
					}[root.priority];
				if (groupMode === "list") key = root.list || "Inbox";
				if (groupMode === "tag")
					key = root.tags?.[0] ? `#${root.tags[0]}` : tx("task.group.noTag", "No tag");
				if (groupMode === "section") key = root.section || tx("task.group.noSection", "No section");
				if (groupMode === "created" || groupMode === "modified") {
					const bucket = taskTimeBucket(groupMode === "created" ? root.createdAt : root.modifiedAt);
					key = bucket.label;
					bucketRanks.set(key, bucket.rank);
				}
				if (!map.has(key)) map.set(key, []);
				map.get(key).push(task);
			}
			const entries = [...map.entries()];
			if (groupMode === "created" || groupMode === "modified") {
				entries.sort(
					(a, b) =>
						(bucketRanks.get(a[0]) ?? Number.MAX_SAFE_INTEGER) -
						(bucketRanks.get(b[0]) ?? Number.MAX_SAFE_INTEGER),
				);
			}
			const noDueDate = tx("task.group.noDueDate", "No due date");
			return entries.map(([key, value]) => [
				groupMode === "due" && key !== noDueDate ? friendlyDate(key) : key,
				value,
			]);
		}
		if (filter.startsWith("list:") && tasks.some((task) => task.section)) {
			const map = new Map();
			for (const task of tasks) {
				const key =
					rootTask(task, allTasks, taskMap).section || tx("task.group.noSection", "No section");
				if (!map.has(key)) map.set(key, []);
				map.get(key).push(task);
			}
			return [...map.entries()];
		}
		if (filter !== "next" && filter !== "all") return [["", tasks]];
		const map = new Map();
		for (const task of tasks) {
			const key = task.due || tx("task.group.noDueDate", "No due date");
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(task);
		}
		const noDueDate = tx("task.group.noDueDate", "No due date");
		return [...map.entries()].map(([key, value]) => [
			key === noDueDate ? key : friendlyDate(key),
			value,
		]);
	}

	return { compareTasks, filteredTasks, friendlyDate, groupTasks, matchesSavedFilter, rootTask };
}

module.exports = { createTaskListDomain };
