import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReminderDialog, type ReminderDialogModel } from "../src/ui/reminder-dialog";

function model(overrides: Partial<ReminderDialogModel> = {}): ReminderDialogModel {
	return {
		description: "設計レビューを完了する",
		meta: ["10月9日 09:00", "期限 2026-10-09", "private/tasks/TODO Inbox.md"],
		isCountdown: false,
		onAction: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe("ReminderDialog", () => {
	it("内容と出所を表示して15分後へ延期する", async () => {
		const value = model();
		render(<ReminderDialog model={value} />);
		expect(screen.getByText("設計レビューを完了する")).toBeInTheDocument();
		expect(screen.getByText("private/tasks/TODO Inbox.md")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "15分" }));
		await waitFor(() => expect(value.onAction).toHaveBeenCalledWith("snooze", 15));
	});

	it("通常タスクは開く・完了・解除を選べる", async () => {
		const value = model();
		render(<ReminderDialog model={value} />);
		fireEvent.click(screen.getByRole("button", { name: "完了" }));
		await waitFor(() => expect(value.onAction).toHaveBeenCalledWith("complete", undefined));
	});

	it("カウントダウンでは完了を出さない", () => {
		render(<ReminderDialog model={model({ isCountdown: true })} />);
		expect(screen.getByRole("button", { name: "カウントダウンを開く" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "完了" })).not.toBeInTheDocument();
	});

	it("操作失敗時に内容を残して再試行できる", async () => {
		render(
			<ReminderDialog
				model={model({ onAction: vi.fn().mockRejectedValue(new Error("更新失敗")) })}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "解除" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("更新失敗");
		expect(screen.getByRole("button", { name: "解除" })).toBeEnabled();
	});
});
