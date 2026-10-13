import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalendarTaskDialog, type CalendarTaskDialogModel } from "../src/ui/calendar-task-dialog";

function model(
	overrides: Partial<CalendarTaskDialogModel<{ description: string }>> = {},
): CalendarTaskDialogModel<{ description: string }> {
	return {
		dateLabel: "2026-10-09 13:00",
		lists: ["仕事", "個人"],
		parse: (description) => ({ description }),
		onCancel: vi.fn(),
		onSubmit: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe("CalendarTaskDialog", () => {
	it("既定リスト名を日本語化する", () => {
		render(<CalendarTaskDialog model={model()} />);
		expect(screen.getByRole("option", { name: "受信箱" })).toBeInTheDocument();
	});

	it("空入力では追加できない", () => {
		render(<CalendarTaskDialog model={model()} />);
		expect(screen.getByRole("button", { name: "追加" })).toBeDisabled();
	});

	it("時間とリストを選び、解析結果を送信する", async () => {
		const value = model();
		render(<CalendarTaskDialog model={value} />);
		fireEvent.change(screen.getByLabelText("タスク内容"), { target: { value: "設計レビュー" } });
		fireEvent.change(screen.getByLabelText("所要時間"), { target: { value: "90" } });
		fireEvent.change(screen.getByLabelText("リスト"), { target: { value: "仕事" } });
		fireEvent.click(screen.getByRole("button", { name: "追加" }));
		await waitFor(() =>
			expect(value.onSubmit).toHaveBeenCalledWith({ description: "設計レビュー" }, 90, "仕事"),
		);
	});

	it("保存失敗を行内表示し、再操作できる", async () => {
		render(
			<CalendarTaskDialog
				model={model({ onSubmit: vi.fn().mockRejectedValue(new Error("保存失敗")) })}
			/>,
		);
		fireEvent.change(screen.getByLabelText("タスク内容"), { target: { value: "保持する" } });
		fireEvent.click(screen.getByRole("button", { name: "追加" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("保存失敗");
		expect(screen.getByRole("button", { name: "追加" })).not.toBeDisabled();
	});
});
