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

async function settleAvailable(files, load) {
	const settled = await Promise.allSettled(files.map(load));
	const values = [];
	const failedFiles = [];
	for (let index = 0; index < settled.length; index += 1) {
		const result = settled[index];
		if (result.status === "fulfilled") values.push(result.value);
		else failedFiles.push(files[index]);
	}
	return { values, failedFiles };
}

module.exports = { readWithDeadline, settleAvailable };
