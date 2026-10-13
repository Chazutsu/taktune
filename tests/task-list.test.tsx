import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskList, type TaskListItem, type TaskListModel } from "../src/ui/task-list";

function element(text: string): HTMLElement {
	const value = document.createElement("div");
	value.textContent = text;
	return value;
}

function item(overrides: Partial<TaskListItem> = {}): TaskListItem {
	return {
		actions: [],
		completeLabel: "完了にする",
		depth: 0,
		disabled: false,
		done: false,
		draggable: false,
		key: "task-1",
		meta: [
			{ label: "今日", icon: "calendar-days" },
			{ label: "private/tasks", tone: "muted" },
		],
		onComplete: vi.fn(),
		onEdit: vi.fn(),
		priority: 3,
		selected: false,
		title: element("設計を確認する"),
		wontDo: false,
		...overrides,
	};
}

function model(items: TaskListItem[]): TaskListModel {
	return {
		empty: {
			icon: "check-check",
			title: "ここは空だ",
			description: "新しいタスクを追加すると、ここに表示される。",
		},
		groups: items.length ? [{ label: "今日", items }] : [],
	};
}

describe("TaskList", () => {
	it("タスク名を単クリックとキーボードで詳細へ開く", () => {
		const task = item();
		const value = model([task]);
		render(<TaskList model={value} />);
		const title = screen.getByRole("button", { name: "設計を確認する" });
		fireEvent.click(title);
		fireEvent.keyDown(title, { key: "Enter" });
		expect(task.onEdit).toHaveBeenCalledTimes(2);
	});
	it("空状態で次の行動を示す", () => {
		render(<TaskList model={model([])} />);
		expect(screen.getByRole("heading", { name: "ここは空だ" })).toBeInTheDocument();
		expect(screen.getByText("新しいタスクを追加すると、ここに表示される。")).toBeInTheDocument();
	});

	it("完了と状態変更を主要操作として実行する", () => {
		const onComplete = vi.fn();
		const onStatus = vi.fn();
		render(
			<TaskList
				model={model([
					item({
						onComplete,
						nextStatus: {
							icon: "refresh-cw",
							label: "ステータスを「進行中」へ変更",
							onAction: onStatus,
						},
					}),
				])}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "完了にする" }));
		fireEvent.click(screen.getByRole("button", { name: "ステータスを「進行中」へ変更" }));
		expect(onComplete).toHaveBeenCalledOnce();
		expect(onStatus).toHaveBeenCalledOnce();
	});

	it("副操作をその他メニューへまとめる", () => {
		const onEdit = vi.fn();
		render(
			<TaskList
				model={model([item({ actions: [{ icon: "pencil", label: "編集", onAction: onEdit }] })])}
			/>,
		);
		fireEvent.click(screen.getByLabelText("その他の操作"));
		fireEvent.click(screen.getByRole("menuitem", { name: "編集" }));
		expect(onEdit).toHaveBeenCalledOnce();
	});

	it("副操作メニューの初期focus、Escape復帰、外側pointerを管理する", async () => {
		render(
			<>
				<TaskList
					model={model([item({ actions: [{ icon: "pencil", label: "編集", onAction: vi.fn() }] })])}
				/>
				<button type="button">外側</button>
			</>,
		);
		const trigger = screen.getByLabelText("その他の操作");
		fireEvent.click(trigger);
		await waitFor(() => expect(screen.getByRole("menuitem", { name: "編集" })).toHaveFocus());
		fireEvent.keyDown(document, { key: "Escape" });
		await waitFor(() => expect(trigger).toHaveFocus());
		expect(trigger).toHaveAttribute("aria-expanded", "false");

		fireEvent.click(trigger);
		await waitFor(() => expect(screen.getByRole("menuitem", { name: "編集" })).toHaveFocus());
		const outside = screen.getByRole("button", { name: "外側" });
		outside.focus();
		fireEvent.pointerDown(outside);
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(outside).toHaveFocus();
	});

	it("進捗を値付きprogressbarとして公開する", () => {
		render(<TaskList model={model([item({ progress: 65 })])} />);
		const progress = screen.getByRole("progressbar", { name: "進捗 65%" });
		expect(progress).toHaveAttribute("aria-valuemin", "0");
		expect(progress).toHaveAttribute("aria-valuemax", "100");
		expect(progress).toHaveAttribute("aria-valuenow", "65");
	});

	it("手動順をキーボードで変更し、境界を無効化してフォーカスを維持する", async () => {
		const moveDown = vi.fn();
		let rerenderList = () => undefined;
		const moving = item({
			actions: [
				{
					icon: "arrow-up",
					label: "手動順で上へ移動",
					disabled: true,
					focusAfterAction: true,
					onAction: vi.fn(),
				},
				{
					icon: "arrow-down",
					label: "手動順で下へ移動",
					focusAfterAction: true,
					onAction: async () => {
						moveDown();
						rerenderList();
					},
				},
			],
			focusKey: "stable-task",
			key: "before-move",
		});
		const view = render(<TaskList model={model([moving])} />);
		rerenderList = () =>
			view.rerender(<TaskList model={model([{ ...moving, key: "after-move" }])} />);
		const menu = screen.getByLabelText("その他の操作");
		menu.focus();
		fireEvent.click(menu);
		expect(screen.getByRole("menuitem", { name: "手動順で上へ移動" })).toBeDisabled();
		fireEvent.click(screen.getByRole("menuitem", { name: "手動順で下へ移動" }));
		await waitFor(() => expect(moveDown).toHaveBeenCalledOnce());
		await waitFor(() => expect(screen.getByLabelText("その他の操作")).toHaveFocus());
		expect(screen.getByLabelText("その他の操作")).toHaveAttribute("aria-expanded", "false");
	});

	it("複数ペインでは操作元のTaskList内へfocusを戻す", async () => {
		const left = item({
			focusKey: "shared",
			actions: [
				{ icon: "arrow-down", label: "左を移動", focusAfterAction: true, onAction: vi.fn() },
			],
		});
		let rerenderRight = () => undefined;
		const right = item({
			focusKey: "shared",
			actions: [
				{
					icon: "arrow-down",
					label: "右を移動",
					focusAfterAction: true,
					onAction: async () => rerenderRight(),
				},
			],
		});
		const view = render(
			<>
				<TaskList model={model([left])} />
				<TaskList model={model([right])} />
			</>,
		);
		rerenderRight = () =>
			view.rerender(
				<>
					<TaskList model={model([left])} />
					<TaskList model={model([{ ...right, key: "after" }])} />
				</>,
			);
		fireEvent.click(screen.getAllByLabelText("その他の操作")[1]!);
		fireEvent.click(screen.getByRole("menuitem", { name: "右を移動" }));
		await waitFor(() => expect(screen.getAllByLabelText("その他の操作")[1]).toHaveFocus());
	});

	it("選択モードをキーボード操作可能なボタンで提供する", () => {
		const onSelect = vi.fn();
		render(<TaskList model={model([item({ onSelect, selectionLabel: "選択" })])} />);
		fireEvent.click(screen.getByRole("button", { name: "選択" }));
		expect(onSelect).toHaveBeenCalledOnce();
		expect(screen.queryByRole("button", { name: "完了にする" })).not.toBeInTheDocument();
	});

	it("デスクトップでも主要操作へ32px以上のヒット領域を確保する", () => {
		render(
			<TaskList
				model={model([
					item({
						nextStatus: { icon: "refresh-cw", label: "次の状態", onAction: vi.fn() },
						actions: [{ icon: "pencil", label: "編集", onAction: vi.fn() }],
					}),
				])}
			/>,
		);
		expect(screen.getByRole("button", { name: "完了にする" })).toHaveClass("size-9");
		expect(screen.getByRole("button", { name: "次の状態" })).toHaveClass("size-9");
		expect(screen.getByLabelText("その他の操作")).toHaveClass("size-8");
	});

	it("狭い画面では主要操作のタップ領域を広げる", () => {
		render(
			<TaskList
				model={model([
					item({
						onSelect: vi.fn(),
						selectionLabel: "選択",
						nextStatus: { icon: "refresh-cw", label: "次の状態", onAction: vi.fn() },
						actions: [{ icon: "pencil", label: "編集", onAction: vi.fn() }],
					}),
				])}
			/>,
		);
		expect(screen.getByRole("button", { name: "選択" })).toHaveClass("max-[620px]:size-11");
		expect(screen.queryByRole("button", { name: "完了にする" })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "次の状態" })).toHaveClass("max-[620px]:size-11");
		expect(screen.getByLabelText("その他の操作")).toHaveClass("max-[620px]:size-11");
	});
});
