function externalReferenceTag(externalId) {
	const reference = String(externalId || "")
		.split(":")
		.map((part) => part.trim().replace(/[^\p{L}\p{N}_-]+/gu, "-"))
		.filter(Boolean)
		.join("/");
	return reference ? `external/${reference}` : "";
}

function externalTaskMetadata(item) {
	const labels = (item.labels || []).map((label) =>
		String(label).replace(/:/gu, "-").replace(/\s+/gu, "-").replace(/^#*/u, ""),
	);
	const referenceTag = externalReferenceTag(item.externalId);
	return {
		list: "External",
		tags: [...new Set([...labels, ...(referenceTag ? [referenceTag] : [])])],
		note: item.url
			? `[Open in source](${item.url})${item.meta ? `\n${item.meta}` : ""}`
			: item.meta,
	};
}

function externalItemStateForTasks(state = {}, tasks = []) {
	const references = new Set(
		tasks.flatMap((task) => task.tags || []).filter((tag) => tag.startsWith("external/")),
	);
	const imported = Object.fromEntries(
		Object.entries(state.imported || {}).filter(([externalId]) =>
			references.has(externalReferenceTag(externalId)),
		),
	);
	return { ...state, imported };
}

function externalSourceLabel(task) {
	const source =
		(task.tags || []).find((tag) => tag.startsWith("source-"))?.slice(7) ||
		(task.tags || []).find((tag) => tag.startsWith("external/"))?.split("/")[1];
	return (
		{ linear: "Linear", jira: "Jira", slack: "Slack" }[String(source || "").toLowerCase()] || ""
	);
}

function externalProviderLabel(itemOrId) {
	const externalId = typeof itemOrId === "string" ? itemOrId : itemOrId?.externalId;
	return (
		{ linear: "Linear", jira: "Jira", slack: "Slack" }[
			String(externalId || "")
				.split(":")[0]
				.toLowerCase()
		] || "External"
	);
}

function externalIssuesData(
	external,
	state,
	tasks,
	{ label = "", query = "", showHandled = false } = {},
) {
	const allItems = [
		...(external.linear || []),
		...(external.jira || []),
		...(external.slack || []),
	];
	const handled = externalItemStateForTasks(state || { imported: {}, dismissed: {} }, tasks);
	const normalizedQuery = query.trim().toLocaleLowerCase();
	const labels = [...new Set(allItems.flatMap((item) => item.labels || []))].toSorted((a, b) =>
		a.localeCompare(b),
	);
	const items = allItems.flatMap((item) => {
		const referenceTag = externalReferenceTag(item.externalId);
		const importedTask = handled.imported?.[item.externalId]
			? tasks.find((task) => task.tags?.includes(referenceTag))
			: null;
		const itemState = importedTask
			? "imported"
			: handled.dismissed?.[item.externalId]
				? "dismissed"
				: null;
		const searchable =
			`${item.title || ""} ${item.meta || ""} ${(item.labels || []).join(" ")}`.toLocaleLowerCase();
		if (
			(!showHandled && itemState) ||
			(label && !item.labels?.includes(label)) ||
			(normalizedQuery && !searchable.includes(normalizedQuery))
		)
			return [];
		return [
			{
				...item,
				labels: item.labels || [],
				sourceLabel: externalProviderLabel(item),
				state: itemState,
				importedTaskKey: importedTask?.key || "",
				planDate: importedTask?.timeBlock?.date || importedTask?.due || item.due || "",
				scheduled: Boolean(importedTask?.timeBlock),
			},
		];
	});
	return {
		errors: [external.errors?.linear, external.errors?.jira, external.errors?.slack].filter(
			Boolean,
		),
		sources: [
			["Linear", external.linear?.length || 0],
			["Jira", external.jira?.length || 0],
			["Slack", external.slack?.length || 0],
		].map(([sourceLabel, count]) => ({ label: sourceLabel, count })),
		labels,
		items,
	};
}

module.exports = {
	externalIssuesData,
	externalItemStateForTasks,
	externalProviderLabel,
	externalReferenceTag,
	externalSourceLabel,
	externalTaskMetadata,
};
