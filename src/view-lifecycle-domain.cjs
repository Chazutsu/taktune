function closeTaktuneView(view) {
	globalThis.clearTimeout(view.renderTimer);
	const pendingSave = Promise.resolve(view.reviewDraftSavePromise)
		.catch(() => undefined)
		.then(() => (view.reviewDraftDirty ? view.persistReviewDraft() : undefined))
		.catch((error) => {
			console.error("Taktune: failed to persist review draft while closing", error);
		});
	view.reviewDraftCloseSavePromise = pendingSave;

	const root = view.reactRoot;
	view.reactRoot = null;
	try {
		root?.unmount();
	} catch (error) {
		console.error("Taktune: failed to unmount task view", error);
	}
}

module.exports = { closeTaktuneView };
