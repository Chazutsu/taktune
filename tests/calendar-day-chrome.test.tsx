import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalendarDayChrome, type CalendarDayChromeModel } from "../src/ui/calendar-day-chrome";

function model(overrides: Partial<CalendarDayChromeModel> = {}): CalendarDayChromeModel {
	return {
		activities: [],
		allDayEvents: [],
		date: "2026-10-09",
		dayNumber: 9,
		showHeader: true,
		today: true,
		weekday: "金",
		...overrides,
	};
}

describe("CalendarDayChrome", () => {
	it("週表示の日付ヘッダーで今日を通知する", () => {
		render(<CalendarDayChrome model={model()} />);
		expect(screen.getByText("金")).toBeInTheDocument();
		expect(screen.getByText("9")).toHaveAttribute("aria-current", "date");
	});

	it("終日予定を外部リンクとして表示する", () => {
		render(
			<CalendarDayChrome
				model={model({
					showHeader: false,
					allDayEvents: [
						{ color: "#7693e8", title: "オフィス", url: "https://calendar.example/event" },
					],
				})}
			/>,
		);
		expect(screen.getByText("終日")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "予定: オフィス" })).toHaveAttribute(
			"href",
			"https://calendar.example/event",
		);
	});

	it("習慣・集中・重要日を区別して表示する", () => {
		render(
			<CalendarDayChrome
				model={model({
					activities: [
						{ achieved: true, icon: "repeat-2", meta: "達成", title: "運動", type: "habit" },
						{ achieved: false, icon: "timer", meta: "25分", title: "集中", type: "focus" },
						{
							achieved: false,
							icon: "flag",
							meta: "あと3日",
							title: "リリース",
							type: "countdown",
						},
					],
				})}
			/>,
		);
		expect(screen.getByLabelText("習慣: 運動")).toBeInTheDocument();
		expect(screen.getByLabelText("集中: 集中")).toBeInTheDocument();
		expect(screen.getByLabelText("重要日: リリース")).toBeInTheDocument();
	});

	it("予定がない日の日表示では余分な帯を描画しない", () => {
		const { container } = render(<CalendarDayChrome model={model({ showHeader: false })} />);
		expect(container).toBeEmptyDOMElement();
	});
});
