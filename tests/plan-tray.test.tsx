import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanTray, type PlanTrayModel } from "../src/ui/plan-tray";

function title(text: string): HTMLElement {
	const element = document.createElement("div");
	element.textContent = text;
	return element;
}

function model(overrides: Partial<PlanTrayModel> = {}): PlanTrayModel {
	return {
		collapsed: false,
		date: "2026-10-09",
		items: [
			{
				key: "a",
				plainTitle: "設計を確認する",
				title: title("設計を確認する"),
				searchText: "設計を確認する 仕事",
				selected: false,
				dragPayload: '{"path":"a.md","line":1}',
				onSelect: vi.fn(),
			},
			{
				key: "b",
				plainTitle: "資料を更新する",
				title: title("資料を更新する"),
				searchText: "資料を更新する 作業",
				selected: false,
				dragPayload: '{"path":"b.md","line":2}',
				onSelect: vi.fn(),
			},
		],
		onSchedule: vi.fn(),
		onScheduleAvailable: vi.fn(),
		onSort: vi.fn(),
		onToggleCollapsed: vi.fn(),
		onToggleSelection: vi.fn(),
		selectedCount: 0,
		selectionMode: false,
		sort: "priority",
		...overrides,
	};
}

describe("PlanTray", () => {
	it("検索で未配置タスクを絞り込む", () => {
		render(<PlanTray model={model()} />);
		fireEvent.change(screen.getByLabelText("未配置タスクを検索"), { target: { value: "資料" } });
		expect(screen.queryByText("設計を確認する")).not.toBeInTheDocument();
		expect(screen.getByText("資料を更新する")).toBeInTheDocument();
	});

	it("検索条件に一致しなくても選択中の配置対象を隠さない", () => {
		render(
			<PlanTray
				model={model({
					selectionMode: true,
					selectedCount: 1,
					items: [
						{
							key: "a",
							plainTitle: "選択済みの設計",
							title: title("選択済みの設計"),
							searchText: "選択済みの設計 仕事",
							selected: true,
							dragPayload: '{"path":"a.md","line":1}',
							onSelect: vi.fn(),
						},
						{
							key: "b",
							plainTitle: "資料を更新する",
							title: title("資料を更新する"),
							searchText: "資料を更新する 作業",
							selected: false,
							dragPayload: '{"path":"b.md","line":2}',
							onSelect: vi.fn(),
						},
					],
				})}
			/>,
		);
		fireEvent.change(screen.getByLabelText("未配置タスクを検索"), { target: { value: "資料" } });
		expect(screen.getByText("選択済みの設計")).toBeInTheDocument();
		expect(screen.getByText("資料を更新する")).toBeInTheDocument();
	});

	it("並び替えと選択モードをモデルへ伝える", () => {
		const value = model();
		render(<PlanTray model={value} />);
		fireEvent.change(screen.getByLabelText("未配置タスクの並び順"), { target: { value: "due" } });
		fireEvent.click(screen.getByRole("button", { name: "複数選択" }));
		expect(value.onSort).toHaveBeenCalledWith("due");
		expect(value.onToggleSelection).toHaveBeenCalledOnce();
	});

	it("選択タスクを指定日時から順番に配置する", () => {
		const value = model({ selectionMode: true, selectedCount: 2 });
		render(<PlanTray model={value} />);
		fireEvent.change(screen.getByLabelText("配置開始時刻"), { target: { value: "10:30" } });
		fireEvent.change(screen.getByLabelText("1件の所要時間"), { target: { value: "30" } });
		fireEvent.click(screen.getByRole("button", { name: "指定時刻に配置" }));
		expect(value.onSchedule).toHaveBeenCalledWith("2026-10-09", "10:30", 30);
	});

	it("選択タスクを既存予定に重ならない空き時間へ配置する", () => {
		const value = model({ selectionMode: true, selectedCount: 2 });
		render(<PlanTray model={value} />);
		fireEvent.change(screen.getByLabelText("配置開始時刻"), { target: { value: "10:30" } });
		fireEvent.click(screen.getByRole("button", { name: "空き時間に配置" }));
		expect(value.onScheduleAvailable).toHaveBeenCalledWith("2026-10-09", "10:30", 60);
	});

	it("表示日を移動したら配置日も追従する", () => {
		const { rerender } = render(<PlanTray model={model({ selectionMode: true })} />);
		rerender(<PlanTray model={model({ date: "2026-10-10", selectionMode: true })} />);
		expect(screen.getByLabelText("配置日")).toHaveValue("2026-10-10");
	});

	it("時間軸DnD用のペイロードを設定する", () => {
		render(<PlanTray model={model()} />);
		const setData = vi.fn();
		fireEvent.dragStart(screen.getByText("設計を確認する").closest("div[draggable]")!, {
			dataTransfer: { effectAllowed: "", setData },
		});
		expect(setData).toHaveBeenCalledWith("application/x-ttd-task", '{"path":"a.md","line":1}');
	});

	it("Calendar本体と同じタスク行契約を使う", () => {
		render(<PlanTray model={model()} />);
		const row = screen.getByText("設計を確認する").closest("[data-calendar-task-row]");
		expect(row).not.toBeNull();
		expect(row).toHaveClass("border-l-[var(--entry-color)]");
		expect(row?.querySelector("button")).toHaveAttribute("aria-label", "完了にする");
	});

	it("モバイルでDnDに依存せず、選択から日時指定まで押しやすくする", () => {
		const value = model({
			selectionMode: true,
			selectedCount: 1,
			items: [
				{
					key: "a",
					plainTitle: "設計を確認する",
					title: title("設計を確認する"),
					searchText: "設計を確認する",
					selected: true,
					dragPayload: '{"path":"a.md","line":1}',
					onSelect: vi.fn(),
				},
			],
		});
		render(<PlanTray model={value} />);
		expect(screen.getByText("複数選択で配置")).toHaveClass("max-[720px]:inline");
		expect(screen.getByRole("button", { name: "選択終了" })).toHaveClass("max-[720px]:min-h-11");
		expect(screen.getByRole("button", { name: "選択を解除" })).toHaveClass("max-[720px]:size-11");
		expect(screen.getByLabelText("未配置タスクを検索")).toHaveClass("max-[720px]:h-11");
		expect(screen.getByLabelText("配置日")).toHaveClass("max-[720px]:h-11");
		expect(screen.getByLabelText("配置開始時刻")).toHaveClass("max-[720px]:h-11");
		expect(screen.getByRole("button", { name: "空き時間に配置" })).toHaveClass(
			"max-[720px]:min-h-11",
		);
		expect(screen.getByRole("button", { name: "指定時刻に配置" })).toHaveClass(
			"max-[720px]:min-h-11",
		);
	});

	it("モバイルで未配置候補を明示的にたたみ、時間軸を広げられる", () => {
		const value = model();
		const { container, rerender } = render(<PlanTray model={value} />);
		const collapse = screen.getByRole("button", { name: "未配置タスクをたたむ" });
		expect(collapse).toHaveAttribute("aria-expanded", "true");
		expect(collapse).toHaveClass("size-11", "max-[720px]:grid");
		fireEvent.click(collapse);
		expect(value.onToggleCollapsed).toHaveBeenCalledOnce();
		rerender(<PlanTray model={model({ collapsed: true })} />);
		expect(screen.getByText("タスク候補をたたんでいる")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "未配置タスクを開く" })).toHaveAttribute(
			"aria-expanded",
			"false",
		);
		expect(container.querySelector("aside")).toHaveClass("max-[720px]:h-auto");
		expect(screen.getByLabelText("未配置タスクを検索").parentElement).toHaveClass(
			"max-[720px]:hidden",
		);
	});

	it("配置中の重複操作を止め、失敗理由を示して再試行できる", async () => {
		let reject: (error: Error) => void = () => undefined;
		const onScheduleAvailable = vi.fn(
			() =>
				new Promise<void>((_resolve, rejectPromise) => {
					reject = rejectPromise;
				}),
		);
		render(
			<PlanTray model={model({ selectionMode: true, selectedCount: 1, onScheduleAvailable })} />,
		);
		fireEvent.click(screen.getByRole("button", { name: "空き時間に配置" }));
		expect(screen.getByRole("button", { name: "配置中…" })).toBeDisabled();
		expect(screen.getByLabelText("配置日")).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "配置中…" }));
		expect(onScheduleAvailable).toHaveBeenCalledOnce();
		reject(new Error("タスクを書き込めなかった"));
		expect(await screen.findByRole("alert")).toHaveTextContent("タスクを書き込めなかった");
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "空き時間に配置" })).toBeEnabled(),
		);
	});
});
