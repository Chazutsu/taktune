import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalendarSubscriptionsDialog } from "../src/ui/calendar-subscriptions-dialog";

const initial = [
	{ id: "one", name: "仕事", url: "https://example.com/work.ics", color: "#5aa38b", enabled: true },
];

describe("CalendarSubscriptionsDialog", () => {
	it("購読を編集して保存する", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		render(<CalendarSubscriptionsDialog model={{ initial, onCancel: vi.fn(), onSave }} />);
		fireEvent.change(screen.getByLabelText("カレンダー名 1"), { target: { value: " 仕事予定 " } });
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		await waitFor(() => expect(onSave).toHaveBeenCalledWith([{ ...initial[0], name: "仕事予定" }]));
	});

	it("不正なURLは保存せず理由を示す", () => {
		render(
			<CalendarSubscriptionsDialog
				model={{
					initial: [{ ...initial[0], url: "ftp://example.com/work.ics" }],
					onCancel: vi.fn(),
					onSave: vi.fn(),
				}}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		expect(screen.getByRole("alert")).toHaveTextContent("https://またはwebcal://");
	});

	it("追加・削除と空URLの除外に対応する", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		render(<CalendarSubscriptionsDialog model={{ initial, onCancel: vi.fn(), onSave }} />);
		fireEvent.click(screen.getByRole("button", { name: "+ 購読を追加" }));
		expect(screen.getByLabelText("ICS購読URL 2")).toHaveAttribute("type", "password");
		fireEvent.click(screen.getByRole("button", { name: "仕事を削除" }));
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		await waitFor(() => expect(onSave).toHaveBeenCalledWith([]));
	});

	it("保存失敗時に入力を保持する", async () => {
		render(
			<CalendarSubscriptionsDialog
				model={{
					initial,
					onCancel: vi.fn(),
					onSave: vi.fn().mockRejectedValue(new Error("保存失敗")),
				}}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "保存" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("保存失敗");
		expect(screen.getByLabelText("カレンダー名 1")).toHaveValue("仕事");
	});
});
