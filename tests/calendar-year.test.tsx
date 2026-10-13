import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalendarYear, type CalendarYearModel } from "../src/ui/calendar-year";

function model(): CalendarYearModel {
	return {
		months: [
			{
				month: 10,
				leading: 3,
				days: [
					{ count: 0, date: "2026-10-01", day: 1, onOpen: vi.fn(), today: false },
					{ count: 5, date: "2026-10-02", day: 2, onOpen: vi.fn(), today: true },
				],
			},
		],
	};
}

describe("CalendarYear", () => {
	it("月、曜日、件数強度、今日を表示する", () => {
		const value = model();
		render(<CalendarYear model={value} />);
		expect(screen.getByRole("heading", { name: "10月" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "2026-10-01 0件" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "2026-10-02 5件" })).toHaveAttribute(
			"aria-current",
			"date",
		);
	});

	it("日付選択をモデルへ伝える", () => {
		const value = model();
		render(<CalendarYear model={value} />);
		fireEvent.click(screen.getByRole("button", { name: "2026-10-02 5件" }));
		expect(value.months[0].days[1].onOpen).toHaveBeenCalledOnce();
	});

	it("日付をモバイル44px・デスクトップ32px以上で表示し、動きを抑制できる", () => {
		render(<CalendarYear model={model()} />);
		expect(screen.getByRole("button", { name: "2026-10-01 0件" })).toHaveClass(
			"min-h-11",
			"min-w-11",
			"min-[721px]:min-h-8",
			"min-[721px]:min-w-8",
			"text-[11px]",
			"motion-reduce:transition-none",
			"motion-reduce:hover:scale-100",
		);
	});
});
