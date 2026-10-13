import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HabitDialog, type HabitDialogModel } from "../src/ui/habit-dialog";

const initial = {
	name: "",
	target: 1,
	unit: "回",
	scheduleMode: "weekdays" as const,
	weekdays: [1, 2, 3, 4, 5],
	weeklyTarget: 3,
	reminders: [],
	archived: false,
};
function model(overrides: Partial<HabitDialogModel> = {}): HabitDialogModel {
	return {
		title: "習慣を作成",
		initial,
		canManage: false,
		onCancel: vi.fn(),
		onDelete: vi.fn(),
		onArchive: vi.fn().mockResolvedValue(undefined),
		onSave: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe("HabitDialog", () => {
	it("曜日指定と目標を保存する", async () => {
		const value = model();
		render(<HabitDialog model={value} />);
		expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
		fireEvent.change(screen.getByLabelText("習慣名"), { target: { value: " 読書 " } });
		fireEvent.change(screen.getByLabelText("目標値"), { target: { value: "30" } });
		fireEvent.change(screen.getByLabelText("単位"), { target: { value: "分" } });
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		await waitFor(() =>
			expect(value.onSave).toHaveBeenCalledWith({
				...initial,
				name: "読書",
				target: 30,
				unit: "分",
			}),
		);
	});

	it("週N回へ切り替え、通知を重複排除して保存する", async () => {
		const value = model({ initial: { ...initial, name: "運動", reminders: ["09:00"] } });
		render(<HabitDialog model={value} />);
		fireEvent.change(screen.getByLabelText("頻度"), { target: { value: "weekly" } });
		fireEvent.change(screen.getByLabelText("週の目標回数"), { target: { value: "4" } });
		fireEvent.click(screen.getByRole("button", { name: "+ 通知を追加" }));
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		await waitFor(() =>
			expect(value.onSave).toHaveBeenCalledWith({
				...initial,
				name: "運動",
				scheduleMode: "weekly",
				weekdays: [0, 1, 2, 3, 4, 5, 6],
				weeklyTarget: 4,
				reminders: ["09:00"],
			}),
		);
	});

	it("曜日が空なら保存できず理由を示す", () => {
		render(<HabitDialog model={model({ initial: { ...initial, name: "瞑想", weekdays: [] } })} />);
		expect(screen.getByRole("alert")).toHaveTextContent("実施曜日を1つ以上選ぶ");
		expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
	});

	it("保存失敗時に入力を保持する", async () => {
		render(
			<HabitDialog
				model={model({
					initial: { ...initial, name: "睡眠" },
					onSave: vi.fn().mockRejectedValue(new Error("保存失敗")),
				})}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("保存失敗");
		expect(screen.getByLabelText("習慣名")).toHaveValue("睡眠");
	});
});
