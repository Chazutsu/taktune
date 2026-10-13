import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalendarControls, type CalendarControlsModel } from "../src/ui/calendar-controls";

function model(overrides: Partial<CalendarControlsModel> = {}): CalendarControlsModel {
	return {
		activeMode: "day",
		filterLabel: "絞り込み",
		googleLabel: "Google Calendar",
		label: "10月12日",
		modes: [{ id: "day", label: "日" }],
		nextLabel: "次の日",
		onMode: vi.fn(),
		onNext: vi.fn(),
		onOpenFilter: vi.fn(),
		onOpenGoogle: vi.fn(),
		onOpenSubscriptions: vi.fn(),
		onOpenViewOptions: vi.fn(),
		onPrevious: vi.fn(),
		onSearch: vi.fn(),
		onSelectMode: vi.fn(),
		onToday: vi.fn(),
		previousLabel: "前の日",
		search: "",
		selectionMode: false,
		subscriptionLabel: "購読カレンダー",
		...overrides,
	};
}

describe("CalendarControls", () => {
	it("表示メニューのfocus、Escape復帰、action後closeを管理する", async () => {
		const onOpenFilter = vi.fn();
		render(<CalendarControls model={model({ onOpenFilter })} />);
		const trigger = screen.getByLabelText("時間割の表示と連携");
		fireEvent.click(trigger);
		await waitFor(() => expect(screen.getByRole("menuitem", { name: "絞り込み" })).toHaveFocus());
		fireEvent.keyDown(document, { key: "Escape" });
		await waitFor(() => expect(trigger).toHaveFocus());
		expect(trigger).toHaveAttribute("aria-expanded", "false");

		fireEvent.click(trigger);
		await waitFor(() => expect(screen.getByRole("menuitem", { name: "絞り込み" })).toHaveFocus());
		fireEvent.click(screen.getByRole("menuitem", { name: "絞り込み" }));
		expect(onOpenFilter).toHaveBeenCalledOnce();
		await waitFor(() => expect(trigger).toHaveFocus());
		expect(trigger).toHaveAttribute("aria-expanded", "false");
	});
});
