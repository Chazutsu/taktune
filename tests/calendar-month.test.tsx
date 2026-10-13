import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	CalendarMonth,
	type CalendarMonthCellModel,
	type CalendarMonthModel,
} from "../src/ui/calendar-month";

function title(text: string): HTMLElement {
	const element = document.createElement("span");
	element.textContent = text;
	return element;
}

function cell(overrides: Partial<CalendarMonthCellModel> = {}): CalendarMonthCellModel {
	return {
		date: "2026-10-09",
		dayLabel: "9",
		entries: [],
		onDrop: vi.fn(),
		onOpenDay: vi.fn(),
		outside: false,
		today: true,
		...overrides,
	};
}

function model(value: CalendarMonthCellModel): CalendarMonthModel {
	return { cells: [value], multiweek: false };
}

describe("CalendarMonth", () => {
	it("予定・タスク・活動の出所を区別して表示する", () => {
		const value = cell({
			entries: [
				{ kind: "event", color: "#7693e8", title: "開発定例", url: "https://example.com" },
				{
					kind: "task",
					color: "#4778ff",
					done: false,
					dragPayload: null,
					onOpen: vi.fn(),
					repeat: false,
					time: "13:30",
					title: title("設計を直す"),
				},
				{ kind: "activity", achieved: true, icon: "flame", title: "集中時間", type: "focus" },
			],
		});
		render(<CalendarMonth model={model(value)} />);
		expect(screen.getByRole("link", { name: "予定: 開発定例" })).toHaveAttribute(
			"href",
			"https://example.com",
		);
		expect(screen.getByRole("button", { name: "タスク: 設計を直す" })).toBeInTheDocument();
		expect(screen.getByLabelText("活動: 集中時間")).toBeInTheDocument();
	});

	it("日付とタスクの操作をモデルへ伝える", () => {
		const onOpen = vi.fn();
		const value = cell({
			entries: [
				{
					kind: "task",
					color: "#4778ff",
					done: false,
					dragPayload: null,
					onOpen,
					repeat: false,
					time: null,
					title: title("レビューする"),
				},
			],
		});
		render(<CalendarMonth model={model(value)} />);
		fireEvent.click(screen.getByRole("button", { name: "2026-10-09の日表示を開く" }));
		fireEvent.click(screen.getByRole("button", { name: "タスク: レビューする" }));
		expect(value.onOpenDay).toHaveBeenCalledOnce();
		expect(onOpen).toHaveBeenCalledOnce();
	});

	it("タスクDnDのペイロードを設定し、セルのdropへ渡す", () => {
		const payload = '{"path":"daily.md","line":3}';
		const value = cell({
			entries: [
				{
					kind: "task",
					color: "#4778ff",
					done: false,
					dragPayload: payload,
					onOpen: vi.fn(),
					repeat: false,
					time: null,
					title: title("配置する"),
				},
			],
		});
		const { container } = render(<CalendarMonth model={model(value)} />);
		const setData = vi.fn();
		fireEvent.dragStart(screen.getByRole("button", { name: "タスク: 配置する" }), {
			dataTransfer: { effectAllowed: "", setData },
		});
		expect(setData).toHaveBeenCalledWith("application/x-ttd-task", payload);
		const target = container.querySelector<HTMLElement>("section[aria-label='2026-10-09']")!;
		fireEvent.dragOver(target, {
			dataTransfer: { types: ["application/x-ttd-task"], dropEffect: "" },
		});
		fireEvent.drop(target, { dataTransfer: { getData: () => payload } });
		expect(value.onDrop).toHaveBeenCalledWith(payload);
	});

	it("4件を超える項目を件数表示へ畳む", () => {
		const entries = Array.from({ length: 6 }, (_, index) => ({
			kind: "event" as const,
			color: "#7693e8",
			title: `予定${index + 1}`,
			url: `https://example.com/${index}`,
		}));
		render(<CalendarMonth model={model(cell({ outside: true, entries }))} />);
		expect(screen.getByText("ほか2件")).toBeInTheDocument();
		expect(screen.queryByText("予定5")).not.toBeInTheDocument();
	});

	it("月表示の密度を保ちながら日付操作と文字を読みやすくする", () => {
		const value = cell({
			entries: [
				{
					kind: "task",
					color: "#4778ff",
					done: false,
					dragPayload: null,
					onOpen: vi.fn(),
					repeat: false,
					time: null,
					title: title("レビューする"),
				},
			],
		});
		const { container } = render(<CalendarMonth model={model(value)} />);
		expect(screen.getByRole("button", { name: "2026-10-09の日表示を開く" })).toHaveClass(
			"size-8",
			"text-[11px]",
			"max-[720px]:size-11",
			"!bg-[var(--interactive-accent)]",
		);
		expect(screen.getByRole("button", { name: "タスク: レビューする" })).toHaveClass(
			"h-6",
			"text-[11px]",
		);
		expect(container.firstElementChild).toHaveClass("min-w-0", "overflow-x-hidden");
		expect(container.querySelector(".min-w-\\[700px\\]")).not.toBeInTheDocument();
	});

	it("モバイルでは項目詳細を隠し、日付ドリルダウン用の要約を表示する", () => {
		const entries = Array.from({ length: 4 }, (_, index) => ({
			kind: "event" as const,
			color: "#7693e8",
			title: `予定${index + 1}`,
			url: `https://example.com/${index}`,
		}));
		const { container } = render(<CalendarMonth model={model(cell({ entries }))} />);
		expect(screen.getByText("予定1").closest("div.max-\\[720px\\]\\:hidden")).toBeInTheDocument();
		expect(container.querySelectorAll("[aria-hidden='true'] > span")).toHaveLength(3);
	});

	it("359px以下でも7列と曜日順を維持し、DashboardMainのpaddingを一部相殺する", () => {
		const { container } = render(
			<div className="px-2">
				<CalendarMonth model={model(cell())} />
			</div>,
		);
		expect(container.querySelector(".max-\\[359px\\]\\:-mx-1")).toHaveClass(
			"max-[359px]:w-[calc(100%+8px)]",
		);
		const grids = container.querySelectorAll(".grid-cols-7");
		expect(grids).toHaveLength(2);
		expect(grids[0]).toHaveTextContent("月火水木金土日");
		expect(grids[0]).not.toHaveClass("hidden", "max-[359px]:hidden");
	});
});
