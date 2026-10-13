const { addDays, localDate } = require("./date-domain.cjs");
const { domainText } = require("./localization-domain.cjs");

function weeklyReviewPrompt(lastReview, today = localDate(), snoozedUntil = "", t) {
	if (snoozedUntil && snoozedUntil >= today) return null;
	const lastDate = /^\d{4}-\d{2}-\d{2}$/u.test(lastReview?.date || "") ? lastReview.date : "";
	if (!lastDate) {
		const weekday = new Date(`${today}T00:00:00`).getDay();
		if (weekday < 5) return null;
		return {
			daysSince: null,
			detail: domainText(
				t,
				"review.prompt.first",
				"Use your first review to connect the last 7 days to the next 7 days.",
			),
		};
	}
	const daysSince = Math.floor(
		(Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastDate}T00:00:00Z`)) / 86_400_000,
	);
	if (!Number.isFinite(daysSince) || daysSince < 7) return null;
	return {
		daysSince,
		detail: domainText(
			t,
			"review.prompt.due",
			"{days} days since the last review. Choose up to three priorities for the next 7 days.",
			{ days: daysSince },
		),
	};
}

function weeklyReviewSnoozeUntil(today = localDate()) {
	const weekday = new Date(`${today}T00:00:00`).getDay();
	const daysToNextFriday = (5 - weekday + 7) % 7 || 7;
	return addDays(today, daysToNextFriday - 1);
}

function reviewMetricComparison(current, previous, unit, t) {
	if (!Number.isFinite(previous)) return "";
	const delta = current - previous;
	return domainText(t, "review.comparison.metric", "Previous {previous}{unit} · {delta}{unit}", {
		previous,
		unit,
		delta: delta === 0 ? "±0" : delta > 0 ? `+${delta}` : delta,
	});
}

function reviewPlanComparison(
	currentCompleted,
	currentPlanned,
	previousCompleted,
	previousPlanned,
	t,
) {
	if (!Number.isFinite(previousCompleted) || !Number.isFinite(previousPlanned)) return "";
	if (!currentPlanned)
		return previousPlanned
			? domainText(t, "review.comparison.noCurrentPlan", "Previous {rate}% · no plan this time", {
					rate: Math.round((previousCompleted / previousPlanned) * 100),
				})
			: domainText(t, "review.comparison.noPlans", "No plan in either period");
	const currentRate = Math.round((currentCompleted / currentPlanned) * 100);
	if (!previousPlanned)
		return domainText(t, "review.comparison.noPreviousPlan", "No previous plan · current {rate}%", {
			rate: currentRate,
		});
	const previousRate = Math.round((previousCompleted / previousPlanned) * 100);
	const delta = currentRate - previousRate;
	return domainText(t, "review.comparison.plan", "Previous {rate}% · {delta}pt", {
		rate: previousRate,
		delta: delta === 0 ? "±0" : delta > 0 ? `+${delta}` : delta,
	});
}

function weekStart(date = localDate()) {
	const value = new Date(`${date}T00:00:00`);
	value.setDate(value.getDate() - ((value.getDay() + 6) % 7));
	return localDate(value);
}

function completedTasksInRange(tasks, start, end = localDate()) {
	return tasks.filter(
		(task) =>
			task.done &&
			task.doneDate &&
			task.doneDate >= start &&
			task.doneDate <= end &&
			!task.parentKey &&
			!task.wontDo &&
			!task.isVirtualOccurrence,
	);
}

function completedTaskCount(tasks, start, end = localDate()) {
	return completedTasksInRange(tasks, start, end).length;
}

function weeklyPlanReview(tasks, start, end) {
	const planned = tasks.filter((task) => {
		if (task.parentKey || task.wontDo || task.isVirtualOccurrence || !task.timeBlock) return false;
		const blockEnd = task.timeBlock.endDate || task.timeBlock.date;
		return task.timeBlock.date <= end && blockEnd >= start;
	});
	const completed = planned.filter(
		(task) => task.done && (!task.doneDate || (task.doneDate >= start && task.doneDate <= end)),
	);
	const completedKeys = new Set(completed.map((task) => task.key));
	return {
		planned,
		completed,
		missed: planned.filter((task) => !completedKeys.has(task.key)),
		rate: planned.length ? Math.round((completed.length / planned.length) * 100) : null,
	};
}

function reviewPeriodSnapshot(tasks, focusLog = [], today = localDate(), t) {
	const start = addDays(today, -6);
	const completed = completedTasksInRange(tasks, start, today);
	const focusEntries = focusLog.filter((entry) => entry.date >= start && entry.date <= today);
	const focusMinutes = focusEntries.reduce((sum, entry) => sum + entry.minutes, 0);
	const planReview = weeklyPlanReview(tasks, start, today);
	const overdue = tasks.filter(
		(task) => !task.done && !task.wontDo && !task.parentKey && task.due && task.due < today,
	);
	const missedKeys = new Set(planReview.missed.map((task) => task.key));
	const carryoverByKey = new Map(
		[...planReview.missed, ...overdue].map((task) => [task.key, task]),
	);
	const sortedCarryovers = [...carryoverByKey.values()].toSorted((a, b) => {
		const aScheduled = missedKeys.has(a.key);
		const bScheduled = missedKeys.has(b.key);
		const aOverdue = Boolean(a.due && a.due < today);
		const bOverdue = Boolean(b.due && b.due < today);
		const aContextRank = aScheduled && aOverdue ? 3 : aOverdue ? 2 : 1;
		const bContextRank = bScheduled && bOverdue ? 3 : bOverdue ? 2 : 1;
		return (
			bContextRank - aContextRank ||
			Number(b.priority ?? 1) - Number(a.priority ?? 1) ||
			String(a.due || "9999-12-31").localeCompare(String(b.due || "9999-12-31")) ||
			String(a.timeBlock?.date || "9999-12-31").localeCompare(
				String(b.timeBlock?.date || "9999-12-31"),
			) ||
			String(a.key || "").localeCompare(String(b.key || ""))
		);
	});
	const carryovers = sortedCarryovers.slice(0, 12);
	const carryoverOverflow = sortedCarryovers.slice(12);
	const carryoverContexts = Object.fromEntries(
		carryovers.map((task) => {
			const scheduled = missedKeys.has(task.key);
			const isOverdue = Boolean(task.due && task.due < today);
			return [
				task.key,
				scheduled && isOverdue
					? domainText(t, "review.carryover.scheduledOverdue", "Scheduled and overdue")
					: scheduled
						? domainText(t, "review.carryover.scheduled", "Scheduled")
						: domainText(t, "review.carryover.overdue", "Overdue"),
			];
		}),
	);
	return {
		start,
		completed,
		focusEntries,
		focusMinutes,
		planReview,
		carryovers,
		carryoverContexts,
		carryoverOverflow,
		carryoverOverflowCount: carryoverOverflow.length,
	};
}

function emptyReviewDraft() {
	return { wins: "", friction: "", lessons: "", next: "", carryoverReasons: {}, focusTaskKeys: {} };
}

function reviewDraftSnapshot(draft = {}) {
	return {
		wins: String(draft.wins || ""),
		friction: String(draft.friction || ""),
		lessons: String(draft.lessons || ""),
		next: String(draft.next || ""),
		carryoverReasons: { ...draft.carryoverReasons },
		focusTaskKeys: { ...draft.focusTaskKeys },
	};
}

function requiredReviewFocusItems(value, t) {
	const items = reviewFocusItems(value);
	if (!items.length)
		throw new Error(
			domainText(
				t,
				"review.error.focusRequired",
				"Choose at least one priority for the next 7 days",
			),
		);
	return items;
}

function reviewFocusItems(value) {
	return [
		...new Set(
			String(value || "")
				.split("\n")
				.map((item) => item.trim())
				.filter(Boolean),
		),
	].slice(0, 3);
}

function reviewFocusItemCount(value) {
	return reviewFocusItems(value).length;
}

function reviewSummary(
	{ completedCount, focusMinutes, ongoingCount, planCompleted, planned, previousMetrics },
	t,
) {
	return [
		{
			label: domainText(t, "review.summary.completed", "Completed"),
			value: domainText(t, "common.count", "{count}", { count: completedCount }),
			comparison: previousMetrics
				? reviewMetricComparison(completedCount, previousMetrics.completed, "", t)
				: "",
		},
		{
			label: domainText(t, "review.summary.plan", "Plan execution"),
			value: planned
				? domainText(t, "review.summary.planValue", "{completed}/{planned}", {
						completed: planCompleted,
						planned,
					})
				: "—",
			comparison: previousMetrics
				? reviewPlanComparison(
						planCompleted,
						planned,
						previousMetrics.planCompleted,
						previousMetrics.planned,
						t,
					)
				: "",
		},
		{
			label: domainText(t, "review.summary.focus", "Focus"),
			value: domainText(t, "common.minutes", "{count} min", { count: focusMinutes }),
			comparison: previousMetrics
				? reviewMetricComparison(focusMinutes, previousMetrics.focusMinutes, " min", t)
				: "",
		},
		{
			label: domainText(t, "review.summary.ongoing", "Ongoing"),
			value: domainText(t, "common.count", "{count}", { count: ongoingCount }),
		},
	];
}

function reviewHistoryPaths(files, limit = 8) {
	return files
		.map((file) => (typeof file === "string" ? file : file.path))
		.filter((path) => /^private\/reviews\/\d{4}-\d{2}-\d{2}\.md$/u.test(path))
		.toSorted((a, b) => b.localeCompare(a))
		.slice(0, limit);
}

function completedReviewRecord({
	completedCount,
	date,
	focusIds,
	focusMinutes,
	next,
	planCompleted,
	planned,
}) {
	return {
		date,
		next: [...next],
		focusIds: { ...focusIds },
		metrics: { completed: completedCount, focusMinutes, planned, planCompleted },
	};
}

module.exports = {
	completedReviewRecord,
	completedTaskCount,
	completedTasksInRange,
	emptyReviewDraft,
	requiredReviewFocusItems,
	reviewFocusItemCount,
	reviewDraftSnapshot,
	reviewHistoryPaths,
	reviewMetricComparison,
	reviewPeriodSnapshot,
	reviewPlanComparison,
	reviewSummary,
	weeklyPlanReview,
	weeklyReviewPrompt,
	weeklyReviewSnoozeUntil,
	weekStart,
};
