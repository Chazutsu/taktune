import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../src/ui/i18n";
import { extractTodayFocus, TodayFocus } from "../src/ui/today-focus";
import type { TaskListItem, TaskListModel } from "../src/ui/task-list";

function item(key: string, depth = 0): TaskListItem {
	const title = document.createElement("div");
	title.textContent = key;
	return {
		key,
		depth,
		title,
		actions: [],
		completeLabel: `${key}を完了`,
		disabled: false,
		done: false,
		draggable: false,
		meta: [{ label: "今日" }],
		onComplete: vi.fn(),
		onEdit: vi.fn(),
		priority: 1,
		selected: false,
		wontDo: false,
	};
}

describe("TodayFocus", () => {
	it("親の部分木を分離し、兄弟と他groupの階層と順序を維持する", () => {
		const first = item("最初");
		const doneChild = { ...item("完了した子", 1), done: true };
		const wontDoChild = { ...item("やらない子", 1), wontDo: true };
		const disabledChild = { ...item("無効な子", 1), disabled: true };
		const model: TaskListModel = {
			empty: { icon: "check", title: "空", description: "空" },
			groups: [
				{
					label: "今日",
					items: [
						first,
						item("未完了の子", 1),
						item("孫", 2),
						doneChild,
						wontDoChild,
						disabledChild,
						item("次"),
						item("次の子", 1),
					],
				},
				{ label: "後続", items: [item("別group")] },
			],
		};
		const result = extractTodayFocus(model);
		expect(result.focus?.item).toBe(first);
		expect(result.focus).toMatchObject({ directSubtaskCount: 4, incompleteSubtaskCount: 1 });
		expect(result.remaining.groups[0].items.map((value) => [value.key, value.depth])).toEqual([
			["次", 0],
			["次の子", 1],
		]);
		expect(result.remaining.groups.map((group) => group.label)).toEqual(["今日", "後続"]);
		expect(result.remaining.groups[1].items[0]?.key).toBe("別group");
	});

	it("次タスクを開いて完了できる", () => {
		const value = item("企画書を書く");
		render(
			<I18nProvider locale="ja">
				<TodayFocus model={{ item: value, directSubtaskCount: 0, incompleteSubtaskCount: 0 }} />
			</I18nProvider>,
		);
		expect(screen.getByText("次にやる")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: /企画書を書く 今日/u }));
		fireEvent.click(screen.getByRole("button", { name: "企画書を書くを完了" }));
		expect(value.onEdit).toHaveBeenCalledOnce();
		expect(value.onComplete).toHaveBeenCalledOnce();
	});

	it("親タスクでは直下サブタスクと未完了の件数を表示する", () => {
		const value = item("リリース準備");
		render(
			<I18nProvider locale="ja">
				<TodayFocus model={{ item: value, directSubtaskCount: 4, incompleteSubtaskCount: 1 }} />
			</I18nProvider>,
		);
		expect(screen.getByText("直下 4件 · 未完了 1件")).toBeInTheDocument();
	});
});
