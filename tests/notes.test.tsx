import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Notes, type NoteItemModel, type NotesModel } from "../src/ui/notes";

function item(overrides: Partial<NoteItemModel> = {}): NoteItemModel {
	const title = document.createElement("div");
	title.innerHTML = '<p><a href="https://example.com">設計メモ</a></p>';
	const note = document.createElement("div");
	note.innerHTML = "<p>判断の背景を残す</p>";
	return {
		key: "1",
		title,
		note,
		path: "private/notes/TODO.md",
		comments: 2,
		onConvert: vi.fn(),
		onOpen: vi.fn(),
		...overrides,
	};
}
function model(overrides: Partial<NotesModel> = {}): NotesModel {
	return { query: "", total: 1, items: [item()], onQueryChange: vi.fn(), ...overrides };
}

describe("Notes", () => {
	it("Markdown、本文、コメント数、出典を表示する", () => {
		render(<Notes model={model()} />);
		expect(screen.getByRole("link", { name: "設計メモ" })).toBeInTheDocument();
		expect(screen.getByText("判断の背景を残す")).toBeInTheDocument();
		expect(screen.getByText("💬 2")).toBeInTheDocument();
		expect(screen.getByText("private/notes/TODO")).toBeInTheDocument();
	});
	it("検索、タスク変換、元ノート表示をモデルへ伝える", () => {
		const value = model();
		render(<Notes model={value} />);
		fireEvent.change(screen.getByLabelText("ノートを検索"), { target: { value: "設計" } });
		fireEvent.click(screen.getByRole("button", { name: "タスクへ変換" }));
		fireEvent.click(screen.getByRole("button", { name: "元ノートを開く" }));
		expect(value.onQueryChange).toHaveBeenCalledWith("設計");
		expect(value.items[0].onConvert).toHaveBeenCalledOnce();
		expect(value.items[0].onOpen).toHaveBeenCalledOnce();
	});
	it("未作成と検索結果なしを区別する", () => {
		const { rerender } = render(<Notes model={model({ total: 0, items: [] })} />);
		expect(screen.getByText("ノートはまだない")).toBeInTheDocument();
		rerender(<Notes model={model({ query: "不一致", items: [] })} />);
		expect(screen.getByText("一致するノートがない")).toBeInTheDocument();
	});
});
