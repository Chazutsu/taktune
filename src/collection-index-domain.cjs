function collectionEntryNeedsRefresh(entry, file, signature) {
	if (!entry?.value) return true;
	if (entry.file !== file) return true;
	if (!signature) return true;
	return entry.signature !== signature;
}

function createCollectionRunMetrics() {
	return { lookups: 0, cacheHits: 0, reparsedFiles: 0 };
}

function recordCollectionLookup(metrics, reparsed) {
	if (!metrics) return;
	metrics.lookups += 1;
	if (reparsed) metrics.reparsedFiles += 1;
	else metrics.cacheHits += 1;
}

function statusCollectionSignature(statuses = []) {
	return JSON.stringify(
		statuses.map((status) =>
			Object.fromEntries(
				Object.entries(status || {})
					.filter(([, value]) => value !== undefined)
					.toSorted(([left], [right]) => left.localeCompare(right)),
			),
		),
	);
}

module.exports = {
	collectionEntryNeedsRefresh,
	createCollectionRunMetrics,
	recordCollectionLookup,
	statusCollectionSignature,
};
