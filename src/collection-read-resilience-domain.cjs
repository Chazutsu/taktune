function readWithDeadline(read, path, timeoutMs) {
	let timeoutId;
	const readPromise = Promise.resolve().then(read);
	const timeoutPromise = new Promise((_, reject) => {
		timeoutId = setTimeout(() => {
			const error = new Error(`Timed out reading ${path}`);
			error.code = "TAKTUNE_COLLECTION_READ_TIMEOUT";
			reject(error);
		}, timeoutMs);
	});
	return Promise.race([readPromise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

function readThroughPendingCache(cache, key, read) {
	let pending = cache.get(key);
	if (pending) return pending;
	pending = Promise.resolve().then(read);
	cache.set(key, pending);
	const clear = () => {
		if (cache.get(key) === pending) cache.delete(key);
	};
	pending.then(clear, clear);
	return pending;
}

async function settleAvailable(files, load, concurrency = 4, deadlineMs = Number.POSITIVE_INFINITY) {
	const width = Math.max(1, Math.min(files.length || 1, Math.floor(concurrency) || 1));
	const settled = Array.from({ length: files.length });
	let nextIndex = 0;

	async function worker() {
		while (nextIndex < files.length) {
			const index = nextIndex;
			nextIndex += 1;
			try {
				settled[index] = { status: "fulfilled", value: await load(files[index]) };
			} catch (reason) {
				settled[index] = { status: "rejected", reason };
			}
		}
	}

	const workersDone = Promise.all(Array.from({ length: width }, () => worker()));
	if (Number.isFinite(deadlineMs) && deadlineMs >= 0) {
		let timeoutId;
		await Promise.race([
			workersDone,
			new Promise((resolve) => {
				timeoutId = setTimeout(resolve, deadlineMs);
			}),
		]);
		clearTimeout(timeoutId);
	} else {
		await workersDone;
	}
	const values = [];
	const failedFiles = [];
	for (let index = 0; index < settled.length; index += 1) {
		const result = settled[index];
		if (result?.status === "fulfilled") values.push(result.value);
		else failedFiles.push(files[index]);
	}
	return { values, failedFiles };
}

module.exports = { readThroughPendingCache, readWithDeadline, settleAvailable };
