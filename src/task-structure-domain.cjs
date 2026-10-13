const { domainText } = require("./localization-domain.cjs");

const LEGACY_TASK_CREATED_ACTIVITY = "タスクを作成";

function createTaskStructureDomain({
	activityPattern,
	commentPattern,
	datePattern,
	describeTask,
	listPattern,
	noteItemPattern,
	t,
	taskPattern,
	today,
	wontDoPattern,
}) {
	const tx = (key, fallback, params) => domainText(t, key, fallback, params);
	function taskRecordFromLine(line, indent) {
		const expectedIndent = indent + 2;
		const comment = line.match(commentPattern);
		if (comment && comment[1].length === expectedIndent)
			return { type: "comment", timestamp: comment[2], text: comment[3].replace(/\\n/gu, "\n") };
		const activity = line.match(activityPattern);
		if (activity && activity[1].length === expectedIndent)
			return { type: "activity", timestamp: activity[2], text: activity[3].replace(/\\n/gu, "\n") };
		return null;
	}

	function taskTemporalMetadata(file, activities = [], comments = []) {
		const records = [...activities, ...comments]
			.map((record) => Date.parse(record.timestamp || ""))
			.filter(Number.isFinite)
			.toSorted((a, b) => a - b);
		const explicitCreation = activities
			.filter(
				(record) => record.text === LEGACY_TASK_CREATED_ACTIVITY || record.text === "Task created",
			)
			.map((record) => Date.parse(record.timestamp || ""))
			.filter(Number.isFinite)
			.toSorted((a, b) => a - b)[0];
		const fallbackCreated = Number(file?.stat?.ctime || file?.stat?.mtime || 0);
		const fallbackModified = Number(file?.stat?.mtime || file?.stat?.ctime || 0);
		return {
			createdAt: explicitCreation || records[0] || fallbackCreated,
			modifiedAt: records.at(-1) || fallbackModified,
		};
	}

	function taskTimeBucket(timestamp) {
		if (!timestamp) return { label: tx("date.unknown", "Unknown date"), rank: 5 };
		const date = new Date(timestamp);
		const current = new Date(`${today()}T00:00:00`);
		const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		const days = Math.round((current - target) / 86_400_000);
		if (days === 0) return { label: tx("date.today", "Today"), rank: 0 };
		if (days === 1) return { label: tx("date.yesterday", "Yesterday"), rank: 1 };
		if (days > 1 && days < 7) return { label: tx("date.past7Days", "Past 7 days"), rank: 2 };
		if (target.getFullYear() === current.getFullYear() && target.getMonth() === current.getMonth())
			return { label: tx("date.thisMonth", "This month"), rank: 3 };
		return { label: tx("date.earlier", "Earlier"), rank: 4 };
	}

	function filterTaskTemplates(templates, query) {
		const needle = query.trim().toLowerCase();
		if (!needle) return [...templates];
		return templates.filter((template) =>
			[
				template.name,
				template.description,
				template.list,
				template.section,
				...(template.tags || []),
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase()
				.includes(needle),
		);
	}

	function reorderItemsById(items, sourceId, targetId, after = false) {
		if (!sourceId || sourceId === targetId) return [...items];
		const sourceIndex = items.findIndex((item) => item.id === sourceId);
		const targetIndex = items.findIndex((item) => item.id === targetId);
		if (sourceIndex < 0 || targetIndex < 0) return [...items];
		const next = [...items];
		const [source] = next.splice(sourceIndex, 1);
		const adjustedTarget = targetIndex - (sourceIndex < targetIndex ? 1 : 0);
		next.splice(adjustedTarget + (after ? 1 : 0), 0, source);
		return next;
	}

	function moveItemById(items, id, delta) {
		const index = items.findIndex((item) => item.id === id);
		const target = index + delta;
		if (index < 0 || target < 0 || target >= items.length) return [...items];
		const next = [...items];
		[next[index], next[target]] = [next[target], next[index]];
		return next;
	}

	function noteItemBlockRange(lines, start, indent) {
		let end = start + 1;
		while (end < lines.length) {
			const task = lines[end].match(taskPattern);
			const note = lines[end].match(noteItemPattern);
			const nextIndent = task ? task[1].match(/^\s*/u)[0].length : note ? note[1].length : -1;
			if ((task || note) && nextIndent <= indent) break;
			end += 1;
		}
		return { start, end };
	}

	function describeTaskChange(before, after) {
		if (before === after) return "";
		const beforeTask = before.match(taskPattern);
		const afterTask = after.match(taskPattern);
		const beforeRaw = beforeTask?.[4] || before;
		const afterRaw = afterTask?.[4] || after;
		if (beforeTask && afterTask && beforeTask[2].toLowerCase() !== afterTask[2].toLowerCase())
			return afterTask[2].toLowerCase() === "x"
				? tx("activity.completed", "Marked complete")
				: tx("activity.reopened", "Reopened");
		if (wontDoPattern.test(beforeRaw) !== wontDoPattern.test(afterRaw))
			return wontDoPattern.test(afterRaw)
				? tx("activity.wontDo", "Marked won't do")
				: tx("activity.restored", "Restored");
		if (describeTask(beforeRaw) !== describeTask(afterRaw))
			return tx("activity.titleChanged", "Title changed");
		const beforeDue = beforeRaw.match(datePattern)?.[1] || tx("common.none", "none");
		const afterDue = afterRaw.match(datePattern)?.[1] || tx("common.none", "none");
		if (beforeDue !== afterDue)
			return tx("activity.dueChanged", "Due: {before} → {after}", {
				before: beforeDue,
				after: afterDue,
			});
		const beforeList = beforeRaw.match(listPattern)?.[1]?.trim() || tx("common.none", "none");
		const afterList = afterRaw.match(listPattern)?.[1]?.trim() || tx("common.none", "none");
		if (beforeList !== afterList)
			return tx("activity.listChanged", "List: {before} → {after}", {
				before: beforeList,
				after: afterList,
			});
		return tx("activity.updated", "Task updated");
	}

	return {
		describeTaskChange,
		filterTaskTemplates,
		moveItemById,
		noteItemBlockRange,
		reorderItemsById,
		taskRecordFromLine,
		taskTemporalMetadata,
		taskTimeBucket,
	};
}

module.exports = { createTaskStructureDomain };
