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
	it("最初のルートタスクだけを分離し、配下を一覧へ残す", () => {
		const first = item("最初");
		const model: TaskListModel = {
			empty: { icon: "check", title: "空", description: "空" },
			groups: [{ items: [first, item("子", 1), item("次")] }],
		};
		const result = extractTodayFocus(model);
		expect(result.focus?.item).toBe(first);
		expect(result.remaining.groups[0].items.map((value) => [value.key, value.depth])).toEqual([
			["子", 0],
			["次", 0],
		]);
	});

	it("次タスクを開いて完了できる", () => {
		const value = item("企画書を書く");
		render(
			<I18nProvider locale="ja">
				<TodayFocus model={{ item: value }} />
			</I18nProvider>,
		);
		expect(screen.getByText("次にやる")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: /企画書を書く 今日/u }));
		fireEvent.click(screen.getByRole("button", { name: "企画書を書くを完了" }));
		expect(value.onEdit).toHaveBeenCalledOnce();
		expect(value.onComplete).toHaveBeenCalledOnce();
	});
});
