import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	CalendarViewOptionsDialog,
	type CalendarViewOptionsModel,
} from "../src/ui/calendar-view-options-dialog";

const initial = {
	colorMode: "list",
	showCompleted: false,
	density: "comfortable",
	showDetails: true,
	showEvents: true,
	showHabits: true,
	showFocus: true,
	showFutureRepeats: true,
	showTasks: true,
	timeZones: [],
};
function model(overrides: Partial<CalendarViewOptionsModel> = {}): CalendarViewOptionsModel {
	return {
		initial,
		onCancel: vi.fn(),
		onSave: vi.fn().mockResolvedValue(undefined),
		validateTimeZone: (zone) => zone === "Asia/Tokyo" || zone === "America/New_York",
		...overrides,
	};
}

describe("CalendarViewOptionsDialog", () => {
	it("色・密度・表示情報をまとめて適用する", async () => {
		const value = model();
		render(<CalendarViewOptionsDialog model={value} />);
		fireEvent.change(screen.getByLabelText("タスクの色"), { target: { value: "priority" } });
		fireEvent.change(screen.getByLabelText("表示密度"), { target: { value: "compact" } });
		fireEvent.click(screen.getByLabelText("完了済みを表示"));
		fireEvent.click(screen.getByRole("button", { name: "適用" }));
		await waitFor(() =>
			expect(value.onSave).toHaveBeenCalledWith({
				...initial,
				colorMode: "priority",
				density: "compact",
				showCompleted: true,
			}),
		);
	});

	it("タスク・予定・習慣・Focusを同じ表示設定で切り替える", async () => {
		const value = model();
		render(<CalendarViewOptionsDialog model={value} />);
		fireEvent.click(screen.getByLabelText("タスクを表示"));
		fireEvent.click(screen.getByLabelText("予定を表示"));
		fireEvent.click(screen.getByLabelText("習慣を表示"));
		fireEvent.click(screen.getByLabelText("フォーカス記録を表示"));
		fireEvent.click(screen.getByRole("button", { name: "適用" }));
		await waitFor(() =>
			expect(value.onSave).toHaveBeenCalledWith({
				...initial,
				showTasks: false,
				showEvents: false,
				showHabits: false,
				showFocus: false,
			}),
		);
	});

	it("タイムゾーンを正規化して保存する", async () => {
		const value = model();
		render(<CalendarViewOptionsDialog model={value} />);
		fireEvent.change(screen.getByLabelText("タイムゾーン 1"), {
			target: { value: " Asia/Tokyo " },
		});
		fireEvent.click(screen.getByRole("button", { name: "適用" }));
		await waitFor(() =>
			expect(value.onSave).toHaveBeenCalledWith({ ...initial, timeZones: ["Asia/Tokyo"] }),
		);
	});

	it("タイムゾーン入力を必要な分だけ段階表示する", () => {
		render(<CalendarViewOptionsDialog model={model()} />);
		expect(screen.getByLabelText("タイムゾーン 1")).toBeInTheDocument();
		expect(screen.queryByLabelText("タイムゾーン 2")).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "タイムゾーンを追加" }));
		expect(screen.getByLabelText("タイムゾーン 2")).toBeInTheDocument();
	});

	it("無効なタイムゾーンは保存しない", () => {
		render(<CalendarViewOptionsDialog model={model()} />);
		fireEvent.change(screen.getByLabelText("タイムゾーン 1"), { target: { value: "Tokyo" } });
		fireEvent.click(screen.getByRole("button", { name: "適用" }));
		expect(screen.getByRole("alert")).toHaveTextContent("Tokyo");
	});

	it("保存失敗時に選択を保持する", async () => {
		render(
			<CalendarViewOptionsDialog
				model={model({ onSave: vi.fn().mockRejectedValue(new Error("保存失敗")) })}
			/>,
		);
		fireEvent.change(screen.getByLabelText("表示密度"), { target: { value: "compact" } });
		fireEvent.click(screen.getByRole("button", { name: "適用" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("保存失敗");
		expect(screen.getByLabelText("表示密度")).toHaveValue("compact");
	});
});
