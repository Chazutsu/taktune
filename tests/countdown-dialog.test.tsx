import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CountdownDialog, type CountdownDialogModel } from "../src/ui/countdown-dialog";

const initial = {
	title: "",
	date: "2026-10-20",
	note: "",
	repeat: "none",
	dayMode: "standard",
	reminder: "",
	reminderDays: 0,
	color: "#e58b3e",
};
function model(overrides: Partial<CountdownDialogModel> = {}): CountdownDialogModel {
	return {
		title: "カウントダウンを追加",
		initial,
		canDelete: false,
		onCancel: vi.fn(),
		onDelete: vi.fn(),
		onSave: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe("CountdownDialog", () => {
	it("必須項目を検証して繰り返し・日数計算を保存する", async () => {
		const value = model();
		render(<CountdownDialog model={value} />);
		expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
		fireEvent.change(screen.getByLabelText("名前"), { target: { value: "リリース" } });
		fireEvent.change(screen.getByLabelText("繰り返し"), { target: { value: "yearly-date" } });
		fireEvent.change(screen.getByLabelText("日数計算"), { target: { value: "plus-one" } });
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		await waitFor(() =>
			expect(value.onSave).toHaveBeenCalledWith({
				...initial,
				title: "リリース",
				repeat: "yearly-date",
				dayMode: "plus-one",
			}),
		);
	});

	it("通知を有効化して時刻と事前日数を保存する", async () => {
		const value = model({ initial: { ...initial, title: "試験" } });
		render(<CountdownDialog model={value} />);
		expect(screen.getByLabelText("通知時刻")).toBeDisabled();
		fireEvent.click(screen.getByLabelText("通知を有効にする"));
		fireEvent.change(screen.getByLabelText("通知時刻"), { target: { value: "08:30" } });
		fireEvent.change(screen.getByLabelText("何日前に通知するか"), { target: { value: "7" } });
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		await waitFor(() =>
			expect(value.onSave).toHaveBeenCalledWith({
				...initial,
				title: "試験",
				reminder: "08:30",
				reminderDays: 7,
			}),
		);
	});

	it("保存失敗時に入力を保持して再操作できる", async () => {
		render(
			<CountdownDialog
				model={model({
					initial: { ...initial, title: "記念日" },
					onSave: vi.fn().mockRejectedValue(new Error("保存失敗")),
				})}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("保存失敗");
		expect(screen.getByLabelText("名前")).toHaveValue("記念日");
	});
});
