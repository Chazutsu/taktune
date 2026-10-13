import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SavedFilterDialog, TaxonomyEditDialog } from "../src/ui/taxonomy-filter-dialogs";

describe("TaxonomyEditDialog", () => {
	it("名前と色を保存する", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		render(
			<TaxonomyEditDialog
				model={{
					label: "タグ",
					name: "旧",
					color: "#4772fa",
					showColor: true,
					onCancel: vi.fn(),
					onDelete: vi.fn(),
					onSave,
				}}
			/>,
		);
		fireEvent.change(screen.getByLabelText("名前"), { target: { value: "新" } });
		fireEvent.change(screen.getByLabelText("色"), { target: { value: "#123456" } });
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		await waitFor(() => expect(onSave).toHaveBeenCalledWith("新", "#123456"));
	});

	it("削除キャンセルと保存失敗を復旧する", async () => {
		const onDelete = vi.fn().mockResolvedValue(false);
		render(
			<TaxonomyEditDialog
				model={{
					label: "リスト",
					name: "仕事",
					color: "#4772fa",
					showColor: true,
					onCancel: vi.fn(),
					onDelete,
					onSave: vi.fn().mockRejectedValue(new Error("保存失敗")),
				}}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "削除" }));
		await waitFor(() => expect(screen.getByRole("button", { name: "削除" })).not.toBeDisabled());
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("保存失敗");
	});
});

describe("SavedFilterDialog", () => {
	const initial = { name: "", keyword: "", list: "", tag: "", priority: null, due: "" };
	it("条件をまとめて保存する", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		render(
			<SavedFilterDialog
				model={{
					title: "フィルターを作成",
					initial,
					lists: ["仕事"],
					tags: ["確認"],
					canDelete: false,
					onCancel: vi.fn(),
					onDelete: vi.fn(),
					onSave,
				}}
			/>,
		);
		fireEvent.change(screen.getByLabelText("名前"), { target: { value: "重要" } });
		fireEvent.change(screen.getByLabelText("リスト"), { target: { value: "仕事" } });
		fireEvent.change(screen.getByLabelText("タグ"), { target: { value: "確認" } });
		fireEvent.change(screen.getByLabelText("優先度"), { target: { value: "3" } });
		fireEvent.change(screen.getByLabelText("期限"), { target: { value: "next" } });
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		await waitFor(() =>
			expect(onSave).toHaveBeenCalledWith({
				...initial,
				name: "重要",
				list: "仕事",
				tag: "確認",
				priority: 3,
				due: "next",
			}),
		);
	});

	it("保存失敗時に条件を保持する", async () => {
		render(
			<SavedFilterDialog
				model={{
					title: "フィルターを編集",
					initial: { ...initial, name: "既存" },
					lists: [],
					tags: [],
					canDelete: true,
					onCancel: vi.fn(),
					onDelete: vi.fn(),
					onSave: vi.fn().mockRejectedValue(new Error("保存失敗")),
				}}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("保存失敗");
		expect(screen.getByLabelText("名前")).toHaveValue("既存");
	});
});
