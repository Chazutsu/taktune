import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuickAdd, type QuickAddModel } from "../src/ui/quick-add";

function model(overrides: Partial<QuickAddModel> = {}): QuickAddModel {
	return {
		templates: [
			{
				id: "weekly",
				name: "週次確認",
				description: "進捗を確認 #weekly",
				resolvedDue: "2026-10-12",
			},
		],
		onPreview: (description, due) => [description.trim(), due].filter(Boolean),
		onSubmit: vi.fn().mockResolvedValue(true),
		...overrides,
	};
}

describe("QuickAdd", () => {
	it("内容がない時は追加できない", () => {
		render(<QuickAdd model={model()} />);
		expect(screen.getByRole("button", { name: "追加" })).toBeDisabled();
	});

	it("テンプレートから内容と期限を展開する", () => {
		render(<QuickAdd model={model()} />);
		fireEvent.change(screen.getByLabelText("タスクテンプレート"), { target: { value: "weekly" } });
		expect(screen.getByLabelText("タスク内容")).toHaveValue("進捗を確認 #weekly");
		expect(screen.getByLabelText("期限")).toHaveValue("2026-10-12");
		expect(screen.getByText("進捗を確認 #weekly")).toBeInTheDocument();
	});

	it("解析した内容を登録して入力を空に戻す", async () => {
		const value = model();
		render(<QuickAdd model={value} />);
		fireEvent.change(screen.getByLabelText("タスク内容"), { target: { value: "明日 レビュー" } });
		fireEvent.change(screen.getByLabelText("期限"), { target: { value: "2026-10-10" } });
		fireEvent.click(screen.getByRole("button", { name: "追加" }));
		await waitFor(() =>
			expect(value.onSubmit).toHaveBeenCalledWith({
				description: "明日 レビュー",
				due: "2026-10-10",
				templateId: "",
			}),
		);
		await waitFor(() => expect(screen.getByLabelText("タスク内容")).toHaveValue(""));
	});

	it("登録失敗時は入力を保持する", async () => {
		const value = model({ onSubmit: vi.fn().mockResolvedValue(false) });
		render(<QuickAdd model={value} />);
		fireEvent.change(screen.getByLabelText("タスク内容"), { target: { value: "保持する" } });
		fireEvent.click(screen.getByRole("button", { name: "追加" }));
		await waitFor(() => expect(value.onSubmit).toHaveBeenCalledOnce());
		expect(screen.getByLabelText("タスク内容")).toHaveValue("保持する");
	});
});
