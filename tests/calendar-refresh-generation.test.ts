import { describe, expect, it } from "vitest";

const { GuardedWriteQueue } = require("../src/calendar-cache-write-domain.cjs");

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
	let resolve = (_value: T) => undefined;
	const promise = new Promise<T>((resolvePromise) => {
		resolve = resolvePromise;
	});
	return { promise, resolve };
}

describe("calendar refresh generation", () => {
	it("does not enqueue delayed refresh A after newer refresh B completed", async () => {
		const queue = new GuardedWriteQueue();
		const oldLoad = deferred<string>();
		const newLoad = deferred<string>();
		const writes: string[] = [];
		let generation = 1;
		const refresh = async (request: number, load: Promise<string>) => {
			const value = await load;
			return queue.enqueue(
				() => request === generation,
				async () => {
					writes.push(value);
				},
			);
		};

		const refreshA = refresh(1, oldLoad.promise);
		generation = 2;
		const refreshB = refresh(2, newLoad.promise);
		newLoad.resolve("new");
		await refreshB;
		oldLoad.resolve("old");
		await refreshA;

		expect(writes).toEqual(["new"]);
	});

	it("serializes an in-flight old write before the newer write", async () => {
		const queue = new GuardedWriteQueue();
		const oldWrite = deferred<void>();
		const writes: string[] = [];
		const first = queue.enqueue(
			() => true,
			async () => {
				await oldWrite.promise;
				writes.push("old");
			},
		);
		const second = queue.enqueue(
			() => true,
			async () => {
				writes.push("new");
			},
		);
		oldWrite.resolve();
		await Promise.all([first, second]);
		expect(writes).toEqual(["old", "new"]);
	});
});
