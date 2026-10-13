import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MergeTasksDialog, NameDialog } from "../src/ui/common-dialogs";

describe("NameDialog", () => {
	it("空入力を拒否し、入力値を送信する", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		render(
			<NameDialog
				model={{ title: "リストを作成", placeholder: "リスト名", onCancel: vi.fn(), onSubmit }}
			/>,
		);
		expect(screen.getByRole("button", { name: "作成" })).toBeDisabled();
		fireEvent.change(screen.getByLabelText("リスト名"), { target: { value: "仕事" } });
		fireEvent.click(screen.getByRole("button", { name: "作成" }));
		await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("仕事"));
	});

	it("作成失敗を行内表示する", async () => {
		render(
			<NameDialog
				model={{
					title: "タグを作成",
					placeholder: "タグ名",
					onCancel: vi.fn(),
					onSubmit: vi.fn().mockRejectedValue(new Error("重複している")),
				}}
			/>,
		);
		fireEvent.change(screen.getByLabelText("タグ名"), { target: { value: "重複" } });
		fireEvent.click(screen.getByRole("button", { name: "作成" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("重複している");
	});
});

describe("MergeTasksDialog", () => {
	it("残す親タスクを選んで統合する", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		render(
			<MergeTasksDialog
				model={{
					items: [
						{ key: "a", label: "A" },
						{ key: "b", label: "B" },
					],
					onCancel: vi.fn(),
					onSubmit,
				}}
			/>,
		);
		fireEvent.change(screen.getByLabelText("統合先の親タスク"), { target: { value: "b" } });
		fireEvent.click(screen.getByRole("button", { name: "2件を統合" }));
		await waitFor(() => expect(onSubmit).toHaveBeenCalledWith("b"));
	});

	it("統合失敗時に選択を保持して再操作できる", async () => {
		render(
			<MergeTasksDialog
				model={{
					items: [
						{ key: "a", label: "A" },
						{ key: "b", label: "B" },
					],
					onCancel: vi.fn(),
					onSubmit: vi.fn().mockRejectedValue(new Error("保存失敗")),
				}}
			/>,
		);
		fireEvent.change(screen.getByLabelText("統合先の親タスク"), { target: { value: "b" } });
		fireEvent.click(screen.getByRole("button", { name: "2件を統合" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("保存失敗");
		expect(screen.getByLabelText("統合先の親タスク")).toHaveValue("b");
	});
});
