import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../src/ui/i18n";
import { TaskDetail, type TaskDetailModel } from "../src/ui/task-detail";

function model(): TaskDetailModel {
	return {
		key: "task.md:1",
		dialog: {
			initial: {
				description: "企画書を書く",
				due: "",
				startAt: "",
				endAt: "",
				status: "todo",
				priority: 1,
				important: false,
				urgent: false,
				list: "",
				section: "",
				tags: [],
				repeat: "",
				reminders: [],
				progress: 0,
				progressAuto: false,
				estimatedPomos: 0,
				estimatedMinutes: 0,
				note: "",
				newComment: "",
				attachments: [],
				existingSubtasks: [],
				newSubtasks: [],
			},
			lists: [],
			statuses: [{ id: "todo", name: "未着手" }],
			comments: [],
			activities: [],
			validateRepeat: () => true,
			attachmentsOf: () => [],
			removeAttachment: (note) => note,
			onOpenAttachment: vi.fn(),
			onCancel: vi.fn(),
			onSave: vi.fn(),
			onSaveTemplate: vi.fn(),
		},
	};
}

describe("TaskDetail", () => {
	it("詳細フォームを右ペインとして表示し閉じられる", () => {
		const value = model();
		render(
			<I18nProvider locale="ja">
				<TaskDetail model={value} />
			</I18nProvider>,
		);

		expect(screen.getByRole("complementary", { name: "タスクを編集" })).toBeInTheDocument();
		expect(screen.getByDisplayValue("企画書を書く")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "詳細を閉じる" }));
		expect(value.dialog.onCancel).toHaveBeenCalledOnce();
	});

	it("モバイルシートをmodalとして扱い、初期focus・focus trap・Escapeを提供する", () => {
		const original = window.matchMedia;
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: query === "(max-width: 899px)",
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}));
		const value = model();
		try {
			render(
				<I18nProvider locale="ja">
					<TaskDetail model={value} />
				</I18nProvider>,
			);
			const sheet = screen.getByRole("dialog", { name: "タスクを編集" });
			expect(sheet).toHaveAttribute("aria-modal", "true");
			expect(screen.getByRole("textbox", { name: "タスク内容" })).toHaveFocus();

			const close = screen.getByRole("button", { name: "詳細を閉じる" });
			const lastButton = screen.getAllByRole("button").at(-1);
			close.focus();
			fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
			expect(lastButton).toHaveFocus();

			fireEvent.keyDown(sheet, { key: "Escape" });
			expect(value.dialog.onCancel).toHaveBeenCalledOnce();
		} finally {
			window.matchMedia = original;
		}
	});
});
