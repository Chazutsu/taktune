import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Focus, type FocusModel } from "../src/ui/focus";

function model(overrides: Partial<FocusModel> = {}): FocusModel {
	return {
		tasks: [{ key: "task-1", title: "設計を仕上げる" }],
		selectedTaskKey: "task-1",
		mode: "timer",
		running: false,
		duration: 1500,
		durationOptions: [
			{ seconds: 1500, label: "25分" },
			{ seconds: 3000, label: "50分" },
		],
		getSeconds: () => 1500,
		days: Array.from({ length: 7 }, (_, index) => ({
			date: `2026-10-0${index + 3}`,
			label: `${index + 3}`,
			minutes: index === 6 ? 50 : 0,
		})),
		summary: [
			{ label: "30日合計", value: "120分" },
			{ label: "セッション", value: "3回" },
			{ label: "タイマー", value: "100分" },
			{ label: "ストップウォッチ", value: "20分" },
		],
		taskStats: [{ title: "設計を仕上げる", minutes: 90 }],
		onTaskChange: vi.fn(),
		onModeChange: vi.fn(),
		onDurationChange: vi.fn(),
		onToggle: vi.fn(),
		onReset: vi.fn(),
		onRecord: vi.fn(),
		...overrides,
	};
}

describe("Focus", () => {
	it("選択タスク、タイマー、集中実績を一画面に表示する", () => {
		render(<Focus model={model()} />);
		expect(screen.getByLabelText("残り 25:00")).toBeInTheDocument();
		expect(screen.getByRole("img", { name: "直近7日で50分集中" })).toBeInTheDocument();
		expect(screen.getByText("30日合計").parentElement).toHaveTextContent("120分");
		expect(screen.getByText("タスク別（30日）").parentElement).toHaveTextContent("90分");
	});

	it("タスク、計測方法、時間、開始、リセットをモデルへ伝える", () => {
		const value = model();
		render(<Focus model={value} />);
		fireEvent.change(screen.getByLabelText("集中するタスク"), { target: { value: "" } });
		fireEvent.click(screen.getByRole("button", { name: "ストップウォッチ" }));
		fireEvent.click(screen.getByRole("button", { name: "50分" }));
		fireEvent.click(screen.getByRole("button", { name: "開始" }));
		fireEvent.click(screen.getByRole("button", { name: "リセット" }));
		expect(value.onTaskChange).toHaveBeenCalledWith("");
		expect(value.onModeChange).toHaveBeenCalledWith("stopwatch");
		expect(value.onDurationChange).toHaveBeenCalledWith(3000);
		expect(value.onToggle).toHaveBeenCalledOnce();
		expect(value.onReset).toHaveBeenCalledOnce();
	});

	it("ストップウォッチを記録でき、ゼロ秒では無効にする", () => {
		const value = model({ mode: "stopwatch", getSeconds: () => 65 });
		const { rerender } = render(<Focus model={value} />);
		fireEvent.click(screen.getByRole("button", { name: "記録" }));
		expect(value.onRecord).toHaveBeenCalledOnce();
		rerender(<Focus model={model({ mode: "stopwatch", getSeconds: () => 0 })} />);
		expect(screen.getByRole("button", { name: "記録" })).toBeDisabled();
	});

	it("記録がない時は空状態を示す", () => {
		render(
			<Focus
				model={model({ taskStats: [], days: model().days.map((day) => ({ ...day, minutes: 0 })) })}
			/>,
		);
		expect(screen.getByText("タスク別の集中記録はまだない。")).toBeInTheDocument();
	});
});
