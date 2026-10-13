import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuickAddDialog, type QuickAddDialogModel } from "../src/ui/quick-add-dialog";

function model(
	overrides: Partial<QuickAddDialogModel<{ description: string }>> = {},
): QuickAddDialogModel<{ description: string }> {
	return {
		templates: [
			{
				id: "weekly",
				name: "週次確認",
				description: "進捗を確認 #weekly",
				resolvedDue: "2026-10-12",
			},
		],
		parse: (description) => ({ description }),
		preview: (description, due) => [description.trim(), due].filter(Boolean),
		onCancel: vi.fn(),
		onSubmit: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe("QuickAddDialog", () => {
	it("空入力では追加できず、キャンセルを通知する", () => {
		const value = model();
		render(<QuickAddDialog model={value} />);
		expect(screen.getByRole("button", { name: "追加" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
		expect(value.onCancel).toHaveBeenCalledOnce();
	});

	it("テンプレートを検索して内容と期限を反映する", () => {
		render(<QuickAddDialog model={model()} />);
		fireEvent.change(screen.getByLabelText("テンプレート検索"), { target: { value: "週次" } });
		fireEvent.change(screen.getByLabelText("テンプレート"), { target: { value: "weekly" } });
		expect(screen.getByLabelText("タスク内容")).toHaveValue("進捗を確認 #weekly");
		expect(screen.getByLabelText("期限")).toHaveValue("2026-10-12");
	});

	it("送信中は操作をロックし、解析結果を渡す", async () => {
		let resolve: (() => void) | undefined;
		const value = model({
			onSubmit: vi.fn(
				() =>
					new Promise<void>((done) => {
						resolve = done;
					}),
			),
		});
		render(<QuickAddDialog model={value} />);
		fireEvent.change(screen.getByLabelText("タスク内容"), { target: { value: "明日 レビュー" } });
		fireEvent.click(screen.getByRole("button", { name: "追加" }));
		expect(screen.getByRole("button", { name: "追加中…" })).toBeDisabled();
		expect(value.onSubmit).toHaveBeenCalledWith({ description: "明日 レビュー" }, "", "");
		resolve?.();
		await waitFor(() => expect(value.onSubmit).toHaveBeenCalledOnce());
	});

	it("保存失敗を行内表示して入力を保持する", async () => {
		render(
			<QuickAddDialog
				model={model({ onSubmit: vi.fn().mockRejectedValue(new Error("保存失敗")) })}
			/>,
		);
		fireEvent.change(screen.getByLabelText("タスク内容"), { target: { value: "保持する" } });
		fireEvent.click(screen.getByRole("button", { name: "追加" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("保存失敗");
		expect(screen.getByLabelText("タスク内容")).toHaveValue("保持する");
	});
});
