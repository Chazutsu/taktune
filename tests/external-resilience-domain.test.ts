import { describe, expect, it, vi } from "vitest";

const {
	ExternalSourceTimeoutError,
	createPageTokenGuard,
	loadWithDeadline,
	shouldApplyRefresh,
} = require("../src/external-resilience-domain.cjs");

describe("external resilience domain", () => {
	it("never-resolving source is released at its deadline and receives an abort signal", async () => {
		vi.useFakeTimers();
		let signal: AbortSignal | undefined;
		const stalled = loadWithDeadline(
			(receivedSignal: AbortSignal) => {
				signal = receivedSignal;
				return new Promise(() => {});
			},
			{ label: "ICS", timeoutMs: 50 },
		);
		const successful = loadWithDeadline(() => Promise.resolve(["JIRA-1"]), {
			label: "Jira",
			timeoutMs: 50,
		});
		const result = Promise.allSettled([stalled, successful]);
		await vi.advanceTimersByTimeAsync(50);
		expect(await result).toEqual([
			{ status: "rejected", reason: expect.any(ExternalSourceTimeoutError) },
			{ status: "fulfilled", value: ["JIRA-1"] },
		]);
		expect(signal?.aborted).toBe(true);
		vi.useRealTimers();
	});

	it("does not apply a delayed result from an older refresh", () => {
		expect(shouldApplyRefresh(2, 3)).toBe(false);
		expect(shouldApplyRefresh(3, 3)).toBe(true);
	});

	it("rejects a repeated page token", () => {
		const pages = createPageTokenGuard();
		pages.accept("next");
		expect(() => pages.accept("next")).toThrow("repeated page token");
	});

	it("rejects pagination beyond its explicit page limit", () => {
		const pages = createPageTokenGuard(2);
		pages.accept("page-2");
		pages.accept("page-3");
		expect(() => pages.accept("page-4")).toThrow("exceeded 2 pages");
	});
});
