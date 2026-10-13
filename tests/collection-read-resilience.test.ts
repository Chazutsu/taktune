import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const {
	readWithDeadline,
	settleAvailable,
} = require("../src/collection-read-resilience-domain.cjs");

describe("Taktune collection read resilience", () => {
	afterEach(() => vi.useRealTimers());

	it("永続pendingのノートを待ち続けず、正常なノートの結果を保持する", async () => {
		vi.useFakeTimers();
		const files = [{ path: "daily/good.md" }, { path: "daily/icloud-placeholder.md" }];
		const pending = new Promise<string>(() => undefined);
		const resultPromise = settleAvailable(files, (file: { path: string }) =>
			readWithDeadline(
				() => (file === files[1] ? pending : Promise.resolve("- [ ] available task")),
				file.path,
				25,
			),
		);

		await vi.advanceTimersByTimeAsync(25);
		const result = await resultPromise;

		expect(result.values).toEqual(["- [ ] available task"]);
		expect(result.failedFiles).toEqual([files[1]]);
	});

	it("全ノートを並行に読み、失敗があっても成功値を順序通り返す", async () => {
		const started: string[] = [];
		const files = [{ path: "a.md" }, { path: "b.md" }, { path: "c.md" }];
		const result = await settleAvailable(files, async (file: { path: string }) => {
			started.push(file.path);
			if (file.path === "b.md") throw new Error("evicted");
			return file.path;
		});

		expect(started).toEqual(["a.md", "b.md", "c.md"]);
		expect(result.values).toEqual(["a.md", "c.md"]);
		expect(result.failedFiles).toEqual([files[1]]);
	});
});
