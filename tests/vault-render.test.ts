import { describe, expect, it, vi } from "vitest";
import vaultRenderDomain from "../src/vault-render-domain.cjs";

const { isRelevantVaultRenderEvent, markRenderDirtyIfBusy } = vaultRenderDomain;

describe("TaktuneView vault render scheduling", () => {
	it("画像・PDF・Canvas・除外Markdownでは再収集を予約しない", () => {
		const scheduleRender = vi.fn();
		for (const path of [
			"assets/image.png",
			"docs/spec.pdf",
			"boards/plan.canvas",
			"Archive/old.md",
		]) {
			if (isRelevantVaultRenderEvent({ path }, "", (value: string) => value.startsWith("Archive/")))
				scheduleRender();
		}
		expect(scheduleRender).not.toHaveBeenCalled();
	});

	it("対象Markdownと対象フォルダだけ再収集を予約する", () => {
		const scheduleRender = vi.fn();
		if (isRelevantVaultRenderEvent({ path: "daily/today.md" })) scheduleRender();
		if (
			isRelevantVaultRenderEvent({
				path: "daily",
				children: [{ path: "daily/today.md" }],
			})
		)
			scheduleRender();
		expect(scheduleRender).toHaveBeenCalledTimes(2);
	});

	it("空フォルダとMarkdownを含まないフォルダでは再収集を予約しない", () => {
		expect(isRelevantVaultRenderEvent({ path: "empty", children: [] })).toBe(false);
		expect(
			isRelevantVaultRenderEvent({ path: "assets", children: [{ path: "assets/image.png" }] }),
		).toBe(false);
	});

	it("render中の要求はdirtyへまとめる", () => {
		const view = { renderInProgress: true, renderDirty: false, renderTimer: 0 };
		expect(markRenderDirtyIfBusy(view)).toBe(true);
		expect(markRenderDirtyIfBusy(view)).toBe(true);
		expect(view.renderDirty).toBe(true);
		expect(view.renderTimer).toBe(0);
	});
});
