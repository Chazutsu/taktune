import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	TaskEditDialog,
	type TaskEditDialogModel,
	type TaskEditValue,
} from "../src/ui/task-edit-dialog";

const initial: TaskEditValue = {
	description: "既存タスク",
	due: "2026-10-09",
	startAt: "",
	endAt: "",
	status: "todo",
	priority: 1,
	important: false,
	urgent: false,
	list: "Inbox",
	section: "",
	tags: ["確認"],
	repeat: "",
	reminders: [],
	progress: 0,
	progressAuto: false,
	estimatedPomos: 0,
	estimatedMinutes: 0,
	note: "",
	newComment: "",
	attachments: [],
	existingSubtasks: [
		{ line: 2, description: "調査", reminders: [] },
		{ line: 3, description: "実装", reminders: [] },
	],
	newSubtasks: [],
};
function model(overrides: Partial<TaskEditDialogModel> = {}): TaskEditDialogModel {
	return {
		initial,
		lists: ["Inbox", "仕事"],
		statuses: [
			{ id: "todo", name: "未着手" },
			{ id: "doing", name: "進行中" },
		],
		comments: [],
		activities: [],
		validateRepeat: (value) => value === "every day",
		attachmentsOf: () => [],
		removeAttachment: (note) => note,
		onOpenAttachment: vi.fn(),
		onCancel: vi.fn(),
		onSave: vi.fn().mockResolvedValue(undefined),
		onSaveTemplate: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe("TaskEditDialog", () => {
	it("主要項目と追加サブタスクを保存する", async () => {
		const value = model();
		render(<TaskEditDialog model={value} />);
		fireEvent.change(screen.getByLabelText("タスク内容"), { target: { value: " 更新する " } });
		fireEvent.change(screen.getByLabelText("ステータス"), { target: { value: "doing" } });
		fireEvent.change(screen.getByLabelText("タグ"), { target: { value: "設計, #確認" } });
		fireEvent.change(screen.getByLabelText("サブタスク追加"), {
			target: { value: "確認する\n共有する" },
		});
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		await waitFor(() =>
			expect(value.onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					description: "更新する",
					status: "doing",
					tags: ["設計", "確認"],
					newSubtasks: ["確認する", "共有する"],
				}),
			),
		);
	});

	it("時間枠の片側だけでは保存しない", () => {
		render(<TaskEditDialog model={model()} />);
		fireEvent.change(screen.getByLabelText("開始日時"), { target: { value: "2026-10-09T10:00" } });
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		expect(screen.getByRole("alert")).toHaveTextContent("両方入力する");
	});

	it("時間枠の終了時刻を通知へ重複なく追加する", async () => {
		const value = model({
			initial: { ...initial, startAt: "2026-10-09T10:00", endAt: "2026-10-09T11:00" },
		});
		render(<TaskEditDialog model={value} />);
		fireEvent.click(screen.getByRole("button", { name: "終了時刻を追加" }));
		expect(screen.getByRole("button", { name: "終了時刻を追加済み" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		await waitFor(() =>
			expect(value.onSave).toHaveBeenCalledWith(
				expect.objectContaining({ reminders: ["2026-10-09T11:00"] }),
			),
		);
	});

	it("不正な繰り返しとサブタスク通知を拒否する", () => {
		render(<TaskEditDialog model={model()} />);
		fireEvent.change(screen.getByLabelText("繰り返し"), { target: { value: "sometimes" } });
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		expect(screen.getByRole("alert")).toHaveTextContent("繰り返し形式");
	});

	it("サブタスクを並べ替えてテンプレートへ渡す", async () => {
		const value = model();
		render(<TaskEditDialog model={value} />);
		fireEvent.click(screen.getAllByRole("button", { name: "下へ移動" })[0]!);
		fireEvent.click(screen.getByRole("button", { name: "テンプレート保存" }));
		await waitFor(() =>
			expect(value.onSaveTemplate).toHaveBeenCalledWith(
				expect.objectContaining({
					existingSubtasks: [
						expect.objectContaining({ description: "実装" }),
						expect.objectContaining({ description: "調査" }),
					],
				}),
			),
		);
	});

	it("保存失敗時に入力を保持する", async () => {
		render(
			<TaskEditDialog
				model={model({ onSave: vi.fn().mockRejectedValue(new Error("保存失敗")) })}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("保存失敗");
		expect(screen.getByLabelText("タスク内容")).toHaveValue("既存タスク");
	});

	it("Markdown書式と既存添付のリンク解除をメモへ反映する", () => {
		render(
			<TaskEditDialog
				model={model({
					initial: { ...initial, note: "資料 [[private/file.pdf]]" },
					attachmentsOf: (note) =>
						note.includes("[[private/file.pdf]]")
							? [{ token: "[[private/file.pdf]]", path: "private/file.pdf" }]
							: [],
					removeAttachment: (note, token) => note.replace(token, "").trim(),
				})}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "private/file.pdfのリンクを外す" }));
		const note = screen.getByLabelText("メモ") as HTMLTextAreaElement;
		expect(note).toHaveValue("資料");
		note.setSelectionRange(0, 2);
		fireEvent.click(screen.getByRole("button", { name: "太字" }));
		expect(note).toHaveValue("**資料**");
	});

	it("不正なサブタスク通知を保存しない", () => {
		render(
			<TaskEditDialog
				model={model({
					initial: {
						...initial,
						existingSubtasks: [{ line: 2, description: "調査", reminders: ["invalid"] }],
					},
				})}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		expect(screen.getByRole("alert")).toHaveTextContent("サブタスクの通知日時");
	});
});
