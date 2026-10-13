import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BatchActions, type BatchActionsModel } from "../src/ui/batch-actions";

afterEach(() => vi.restoreAllMocks());

function model(overrides: Partial<BatchActionsModel> = {}): BatchActionsModel {
	return {
		canMerge: true,
		lists: ["仕事", "個人"],
		selectedCount: 2,
		wontDoLabel: "やらない",
		wontDoValue: "true",
		onApply: vi.fn(async () => undefined),
		onMerge: vi.fn(),
		...overrides,
	};
}

describe("BatchActions", () => {
	it("選択件数と一括変更を表示し、入力値を操作境界へ渡す", async () => {
		const onApply = vi.fn(async () => undefined);
		render(<BatchActions model={model({ onApply })} />);
		expect(screen.getByText("2件を選択")).toBeInTheDocument();
		expect(screen.getByRole("option", { name: "受信箱" })).toBeInTheDocument();
		fireEvent.change(screen.getByRole("combobox", { name: "移動先リスト" }), {
			target: { value: "仕事" },
		});
		fireEvent.click(screen.getByRole("button", { name: "移動" }));
		await waitFor(() => expect(onApply).toHaveBeenCalledWith("list", "仕事"));
	});

	it("タグと期限は値が入るまで実行できず、狭幅では44pxを確保する", () => {
		render(<BatchActions model={model()} />);
		const tagAdd = screen.getByRole("button", { name: "タグ追加" });
		const dueApply = screen.getByRole("button", { name: "期限適用" });
		expect(tagAdd).toBeDisabled();
		expect(dueApply).toBeDisabled();
		fireEvent.change(screen.getByRole("textbox", { name: "一括タグ" }), {
			target: { value: "確認" },
		});
		fireEvent.change(screen.getByLabelText("一括期限"), { target: { value: "2026-10-10" } });
		expect(tagAdd).toBeEnabled();
		expect(dueApply).toBeEnabled();
		expect(tagAdd).toHaveClass("max-[620px]:min-h-11");
		expect(screen.getByRole("combobox", { name: "移動先リスト" })).toHaveClass("max-[620px]:h-11");
	});

	it("削除は確認後だけ実行し、失敗理由を行内へ残す", async () => {
		const confirm = vi.spyOn(window, "confirm");
		const onApply = vi.fn(async () => {
			throw new Error("Vaultへ保存できない");
		});
		render(<BatchActions model={model({ onApply })} />);
		confirm.mockReturnValueOnce(false);
		fireEvent.click(screen.getByRole("button", { name: "削除" }));
		expect(onApply).not.toHaveBeenCalled();
		confirm.mockReturnValueOnce(true);
		fireEvent.click(screen.getByRole("button", { name: "削除" }));
		await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Vaultへ保存できない"));
		expect(onApply).toHaveBeenCalledWith("delete", "");
	});
});
