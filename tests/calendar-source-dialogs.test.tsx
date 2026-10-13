import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	CalendarListFilterDialog,
	GoogleCalendarSourcesDialog,
} from "../src/ui/calendar-source-dialogs";

describe("CalendarListFilterDialog", () => {
	it("選択したリストだけを適用する", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		render(
			<CalendarListFilterDialog
				model={{ lists: ["Inbox", "仕事"], selected: ["Inbox"], onCancel: vi.fn(), onSave }}
			/>,
		);
		fireEvent.click(screen.getByLabelText("仕事"));
		fireEvent.click(screen.getByRole("button", { name: "適用" }));
		await waitFor(() => expect(onSave).toHaveBeenCalledWith(["Inbox", "仕事"]));
	});

	it("すべて表示は空配列を保存する", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		render(
			<CalendarListFilterDialog
				model={{ lists: ["Inbox"], selected: ["Inbox"], onCancel: vi.fn(), onSave }}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "すべて表示" }));
		await waitFor(() => expect(onSave).toHaveBeenCalledWith([]));
	});
});

describe("GoogleCalendarSourcesDialog", () => {
	const calendars = [
		{ id: "primary@example.com", name: "個人", primary: true, color: "#3366ff" },
		{ id: "team@example.com", name: "チーム" },
	];
	it("検索し、選択数を示して適用する", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		render(
			<GoogleCalendarSourcesDialog
				model={{ calendars, selected: ["primary@example.com"], onCancel: vi.fn(), onSave }}
			/>,
		);
		fireEvent.change(screen.getByLabelText("カレンダーを検索"), { target: { value: "チーム" } });
		expect(screen.queryByText("個人")).not.toBeInTheDocument();
		fireEvent.click(screen.getByLabelText("チーム"));
		fireEvent.click(screen.getByRole("button", { name: "適用（2）" }));
		await waitFor(() =>
			expect(onSave).toHaveBeenCalledWith(
				expect.arrayContaining(["primary@example.com", "team@example.com"]),
			),
		);
	});

	it("未選択なら理由を画面内に示す", () => {
		render(
			<GoogleCalendarSourcesDialog
				model={{ calendars, selected: [], onCancel: vi.fn(), onSave: vi.fn() }}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "適用（0）" }));
		expect(screen.getByRole("alert")).toHaveTextContent("1つ以上のカレンダーを選択する");
	});
});
