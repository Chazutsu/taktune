class GuardedWriteQueue {
	constructor() {
		this.tail = Promise.resolve();
	}

	enqueue(shouldWrite, write) {
		const operation = this.tail
			.catch(() => undefined)
			.then(async () => {
				if (!shouldWrite()) return false;
				await write(shouldWrite);
				return true;
			});
		this.tail = operation.then(
			() => undefined,
			() => undefined,
		);
		return operation;
	}
}

module.exports = { GuardedWriteQueue };
