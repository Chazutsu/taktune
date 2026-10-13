import { describe, expect, it, vi } from "vitest";
import lifecycleDomain from "../src/view-lifecycle-domain.cjs";

const { closeTaktuneView } = lifecycleDomain;

describe("TaktuneView lifecycle", () => {
	it("dirty draftの保存完了を待たずReact rootを即時破棄する", async () => {
		const unmount = vi.fn();
		let resolveSave!: () => void;
		const pendingSave = new Promise<void>((resolve) => {
			resolveSave = resolve;
		});
		const view = {
			persistReviewDraft: vi.fn().mockResolvedValue(undefined),
			reactRoot: { unmount },
			renderTimer: 1,
			reviewDraftDirty: true,
			reviewDraftSavePromise: pendingSave,
		};

		closeTaktuneView(view);
		expect(unmount).toHaveBeenCalledOnce();
		expect(view.reactRoot).toBeNull();
		expect(view.persistReviewDraft).not.toHaveBeenCalled();

		resolveSave();
		await Reflect.get(view, "reviewDraftCloseSavePromise");
		expect(view.persistReviewDraft).toHaveBeenCalledOnce();
	});

	it("先行保存と再保存が失敗しても未処理rejectionを発生させない", async () => {
		const unmount = vi.fn();
		const persistReviewDraft = vi.fn().mockRejectedValue(new Error("retry failed"));
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const view = {
			persistReviewDraft,
			reactRoot: { unmount },
			renderTimer: 1,
			reviewDraftDirty: true,
			reviewDraftSavePromise: Promise.reject(new Error("queued save failed")),
		};

		closeTaktuneView(view);
		await Reflect.get(view, "reviewDraftCloseSavePromise");
		expect(persistReviewDraft).toHaveBeenCalledOnce();
		expect(unmount).toHaveBeenCalledOnce();
		expect(view.reactRoot).toBeNull();
		expect(consoleError).toHaveBeenCalledWith(
			"Taktune: failed to persist review draft while closing",
			expect.any(Error),
		);
		consoleError.mockRestore();
	});

	it("保存完了後にdirtyでなければ重複保存しない", async () => {
		const view = {
			persistReviewDraft: vi.fn(),
			reactRoot: { unmount: vi.fn() },
			renderTimer: 1,
			reviewDraftDirty: false,
			reviewDraftSavePromise: Promise.resolve(),
		};

		closeTaktuneView(view);
		await Reflect.get(view, "reviewDraftCloseSavePromise");
		expect(view.persistReviewDraft).not.toHaveBeenCalled();
	});
});
