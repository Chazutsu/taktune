import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	CalendarBatchActions,
	type CalendarBatchActionsModel,
} from "../src/ui/calendar-batch-actions";

function model(overrides: Partial<CalendarBatchActionsModel> = {}): CalendarBatchActionsModel {
	return {
		date: "2026-10-09",
		selectedCount: 2,
		onClear: vi.fn(async () => undefined),
		onMoveTo: vi.fn(async () => undefined),
		onShift: vi.fn(async () => undefined),
		...overrides,
	};
}

describe("CalendarBatchActions", () => {
	it("翌日・翌週・指定日への移動と選択解除をモデルへ伝える", async () => {
		const value = model();
		render(<CalendarBatchActions model={value} />);
		fireEvent.click(screen.getByRole("button", { name: "+1日" }));
		await waitFor(() => expect(value.onShift).toHaveBeenCalledWith(1));
		fireEvent.change(screen.getByLabelText("移動先の日付"), { target: { value: "2026-10-12" } });
		fireEvent.click(screen.getByRole("button", { name: "指定日へ" }));
		await waitFor(() => expect(value.onMoveTo).toHaveBeenCalledWith("2026-10-12"));
		fireEvent.click(screen.getByRole("button", { name: "選択解除" }));
		await waitFor(() => expect(value.onClear).toHaveBeenCalledOnce());
	});

	it("未選択時は変更を無効化し、モバイル操作領域を確保する", () => {
		render(<CalendarBatchActions model={model({ selectedCount: 0 })} />);
		expect(screen.getByRole("button", { name: "+1日" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "指定日へ" })).toHaveClass("max-[620px]:min-h-11");
		expect(screen.getByLabelText("移動先の日付")).toHaveClass("max-[620px]:min-h-11");
	});

	it("保存失敗を行内へ表示して選択を維持する", async () => {
		const value = model({
			onShift: vi.fn(async () => {
				throw new Error("時間枠を保存できない");
			}),
		});
		render(<CalendarBatchActions model={value} />);
		fireEvent.click(screen.getByRole("button", { name: "+1週" }));
		await waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent("時間枠を保存できない"),
		);
		expect(screen.getByText("2件選択")).toBeInTheDocument();
	});
});
