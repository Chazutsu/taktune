function isRelevantVaultRenderEvent(file, oldPath = "", isExcluded = () => false) {
	const paths = [file?.path, oldPath].filter((path) => typeof path === "string" && path);
	return paths.some((path) => {
		if (path.endsWith(".md")) return !isExcluded(path);
		if (!Array.isArray(file?.children) || isExcluded(path)) return false;
		const currentRoot = typeof file.path === "string" ? file.path : path;
		const containsRelevantMarkdown = (entry) => {
			if (Array.isArray(entry?.children)) return entry.children.some(containsRelevantMarkdown);
			if (typeof entry?.path !== "string" || !entry.path.endsWith(".md")) return false;
			const projectedPath = `${path}${entry.path.slice(currentRoot.length)}`;
			return !isExcluded(projectedPath);
		};
		return file.children.some(containsRelevantMarkdown);
	});
}

function markRenderDirtyIfBusy(state) {
	if (!state.renderInProgress) return false;
	state.renderDirty = true;
	return true;
}

module.exports = { isRelevantVaultRenderEvent, markRenderDirtyIfBusy };
