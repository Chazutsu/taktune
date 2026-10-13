import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Habits, type HabitCardModel, type HabitsModel } from "../src/ui/habits";

function habit(overrides: Partial<HabitCardModel> = {}): HabitCardModel {
	return {
		id: "habit-1",
		name: "水を飲む",
		archived: false,
		streakLabel: "3日連続",
		targetLabel: "目標 2杯",
		reminders: ["09:00"],
		days: Array.from({ length: 7 }, (_, index) => ({
			date: `2026-10-0${index + 3}`,
			done: index === 6,
			label: `${index + 3}`,
			scheduled: true,
			today: index === 6,
			value: index === 6 ? 2 : 0,
		})),
		heatmap: Array.from({ length: 35 }, (_, index) => ({
			date: `day-${index}`,
			scheduled: true,
			state: index === 34 ? ("done" as const) : ("empty" as const),
			title: `day-${index}`,
		})),
		weeklyProgress: null,
		target: 2,
		unit: "杯",
		onEdit: vi.fn(),
		onToggle: vi.fn(),
		...overrides,
	};
}

function model(overrides: Partial<HabitsModel> = {}): HabitsModel {
	return {
		archivedCount: 1,
		showArchived: false,
		todayScheduled: 2,
		todayCompleted: 1,
		habits: [habit()],
		onAdd: vi.fn(),
		onToggleArchiveView: vi.fn(),
		...overrides,
	};
}

describe("Habits", () => {
	it("今日の達成状況、連続日数、目標、履歴を表示する", () => {
		render(<Habits model={model()} />);
		expect(screen.getByText("1/2件達成")).toBeInTheDocument();
		expect(screen.getByText("3日連続")).toBeInTheDocument();
		expect(screen.getByText(/目標 2杯/)).toBeInTheDocument();
		expect(screen.getByLabelText("水を飲むの過去35日の達成状況").children).toHaveLength(35);
	});

	it("日次記録、編集、追加、アーカイブ表示をモデルへ伝える", () => {
		const value = model();
		render(<Habits model={value} />);
		fireEvent.click(screen.getByLabelText("2026-10-09: 2/2杯。0に戻す"));
		fireEvent.click(screen.getByRole("button", { name: "水を飲むを編集" }));
		fireEvent.click(screen.getByRole("button", { name: "習慣を追加" }));
		fireEvent.click(screen.getByRole("button", { name: "アーカイブ 1" }));
		expect(value.habits[0].onToggle).toHaveBeenCalledWith("2026-10-09");
		expect(value.habits[0].onEdit).toHaveBeenCalledOnce();
		expect(value.onAdd).toHaveBeenCalledOnce();
		expect(value.onToggleArchiveView).toHaveBeenCalledOnce();
	});

	it("対象外の日は操作できない", () => {
		const off = habit({
			days: [
				{ date: "2026-10-09", done: false, label: "金", scheduled: false, today: true, value: 0 },
			],
		});
		render(<Habits model={model({ habits: [off] })} />);
		expect(screen.getByLabelText("2026-10-09: 0/2杯。1増やす")).toBeDisabled();
	});

	it("進行中とアーカイブの空状態を区別する", () => {
		const { rerender } = render(
			<Habits
				model={model({ habits: [], archivedCount: 0, todayScheduled: 0, todayCompleted: 0 })}
			/>,
		);
		expect(screen.getByText("最初の習慣を作る")).toBeInTheDocument();
		rerender(<Habits model={model({ habits: [], showArchived: true })} />);
		expect(screen.getByText("アーカイブは空だ")).toBeInTheDocument();
	});

	it("日次操作を44px以上、補助情報を11px以上にする", () => {
		render(<Habits model={model()} />);
		expect(screen.getByLabelText("2026-10-09: 2/2杯。0に戻す")).toHaveClass(
			"min-h-11",
			"text-[11px]",
		);
		expect(screen.getByText("3日連続").parentElement).toHaveClass("text-[11px]");
		expect(screen.getByRole("button", { name: "水を飲むを編集" })).toHaveClass(
			"size-8",
			"max-[620px]:size-11",
		);
	});
});
