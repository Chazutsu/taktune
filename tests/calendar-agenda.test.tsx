import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	CalendarAgenda,
	type CalendarAgendaDay,
	type CalendarAgendaModel,
} from "../src/ui/calendar-agenda";

function title(text: string): HTMLElement {
	const element = document.createElement("span");
	element.textContent = text;
	return element;
}

function day(overrides: Partial<CalendarAgendaDay> = {}): CalendarAgendaDay {
	return {
		count: 0,
		date: "2026-10-09",
		day: 9,
		entries: [],
		label: "10月 金",
		onDrop: vi.fn(),
		onOpenDay: vi.fn(),
		today: true,
		...overrides,
	};
}

function model(
	value: CalendarAgendaDay,
	overrides: Partial<CalendarAgendaModel> = {},
): CalendarAgendaModel {
	return { compact: false, days: [value], hideDetails: false, ...overrides };
}

describe("CalendarAgenda", () => {
	it("予定・タスク・活動を区別して詳細を表示する", () => {
		const value = day({
			count: 3,
			entries: [
				{
					kind: "event",
					color: "#7693e8",
					meta: "Google Calendar",
					time: "10:00",
					title: "開発定例",
					url: "https://example.com",
				},
				{
					kind: "task",
					color: "#4778ff",
					done: false,
					dragPayload: null,
					list: "仕事",
					onEdit: vi.fn(),
					onToggle: vi.fn(),
					repeat: false,
					time: "13:30",
					title: title("設計を直す"),
				},
				{
					kind: "activity",
					achieved: true,
					icon: "flame",
					label: "集中",
					meta: "60分",
					title: "集中時間",
					type: "focus",
				},
			],
		});
		render(<CalendarAgenda model={model(value)} />);
		expect(screen.getByRole("link", { name: "予定: 開発定例" })).toHaveAttribute(
			"href",
			"https://example.com",
		);
		expect(screen.getByLabelText("タスク: 設計を直す")).toBeInTheDocument();
		expect(screen.getByLabelText("活動: 集中時間")).toBeInTheDocument();
		expect(screen.getByText("Google Calendar")).toBeInTheDocument();
	});

	it("日表示・完了・編集操作をモデルへ伝える", () => {
		const onToggle = vi.fn();
		const onEdit = vi.fn();
		const value = day({
			count: 1,
			entries: [
				{
					kind: "task",
					color: "#4778ff",
					done: false,
					dragPayload: null,
					list: "仕事",
					onEdit,
					onToggle,
					repeat: false,
					time: "期限",
					title: title("確認する"),
				},
			],
		});
		render(<CalendarAgenda model={model(value)} />);
		fireEvent.click(screen.getByRole("button", { name: "2026-10-09の日表示を開く" }));
		fireEvent.click(screen.getByRole("button", { name: "完了にする" }));
		fireEvent.click(screen.getByRole("button", { name: "確認する" }));
		expect(value.onOpenDay).toHaveBeenCalledOnce();
		expect(onToggle).toHaveBeenCalledOnce();
		expect(onEdit).toHaveBeenCalledOnce();
	});

	it("タスクDnDのペイロードを日へ渡す", () => {
		const payload = '{"path":"daily.md","line":3}';
		const value = day({
			count: 1,
			entries: [
				{
					kind: "task",
					color: "#4778ff",
					done: false,
					dragPayload: payload,
					list: "仕事",
					onEdit: vi.fn(),
					onToggle: vi.fn(),
					repeat: false,
					time: "期限",
					title: title("配置する"),
				},
			],
		});
		const { container } = render(<CalendarAgenda model={model(value)} />);
		const row = screen.getByLabelText("タスク: 配置する");
		const setData = vi.fn();
		fireEvent.dragStart(row, { dataTransfer: { effectAllowed: "", setData } });
		expect(setData).toHaveBeenCalledWith("application/x-ttd-task", payload);
		const section = container.querySelector("section")!;
		fireEvent.dragOver(section, {
			dataTransfer: { types: ["application/x-ttd-task"], dropEffect: "" },
		});
		fireEvent.drop(section, { dataTransfer: { getData: () => payload } });
		expect(value.onDrop).toHaveBeenCalledWith(payload);
	});

	it("空状態と詳細非表示を扱う", () => {
		const { rerender } = render(
			<CalendarAgenda model={{ compact: false, days: [], hideDetails: false }} />,
		);
		expect(screen.getByText("今後30日に予定はない")).toBeInTheDocument();
		rerender(
			<CalendarAgenda
				model={model(
					day({
						count: 1,
						entries: [
							{
								kind: "event",
								color: "#7693e8",
								meta: "Google Calendar",
								time: "終日",
								title: "休暇",
								url: "https://example.com",
							},
						],
					}),
					{ hideDetails: true },
				)}
			/>,
		);
		expect(screen.queryByText("Google Calendar")).not.toBeInTheDocument();
	});

	it("本文を11px以上、操作標的をデスクトップ32px・モバイル44px以上にする", () => {
		const value = day({
			count: 1,
			entries: [
				{
					kind: "task",
					color: "#4778ff",
					done: false,
					dragPayload: null,
					list: "仕事",
					onEdit: vi.fn(),
					onToggle: vi.fn(),
					repeat: false,
					time: "期限",
					title: title("確認する"),
				},
			],
		});
		render(<CalendarAgenda model={model(value)} />);
		expect(screen.getByRole("button", { name: "2026-10-09の日表示を開く" })).toHaveClass(
			"min-h-8",
			"max-[620px]:min-h-11",
		);
		expect(screen.getByRole("button", { name: "完了にする" })).toHaveClass(
			"size-8",
			"max-[620px]:size-11",
		);
		expect(screen.getByRole("button", { name: "確認する" })).toHaveClass(
			"min-h-8",
			"text-[11px]",
			"max-[620px]:min-h-11",
		);
	});
});
