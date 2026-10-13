import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { jaDomainTranslator } from "./domain-translator";

const require = createRequire(import.meta.url);
const { createCalendarControlsDomain } = require("../src/calendar-controls-domain.cjs");
const { createCalendarViewDomain } = require("../src/calendar-view-domain.cjs");
const { addDays, localDate } = require("../src/date-domain.cjs");
const { weekStart } = require("../src/review-domain.cjs");

const calendarView = createCalendarViewDomain({ addDays, localDate, weekStart });
const controls = createCalendarControlsDomain({
	addDays,
	addMonths: calendarView.addMonths,
	calendarRange: calendarView.calendarRange,
	locale: "ja-JP",
	t: jaDomainTranslator,
});

describe("calendar controls domain", () => {
	it("日・週・月・年の表示期間と移動ラベルを組み立てる", () => {
		expect(
			controls.calendarControlsState({
				calendarIds: ["primary"],
				date: "2026-10-12",
				error: "",
				mode: "day",
				search: "",
				selectedLists: [],
				selectionMode: false,
				subscriptions: [],
			}),
		).toMatchObject({ label: "10月12日(月)", previousLabel: "前の日", nextLabel: "次の日" });
		expect(
			controls.calendarControlsState({
				calendarIds: [],
				date: "2026-10-12",
				error: "",
				mode: "week",
				search: "",
				selectedLists: [],
				selectionMode: false,
				subscriptions: [],
			}),
		).toMatchObject({ label: "10月12日 – 10月18日", previousLabel: "前の週", nextLabel: "次の週" });
		expect(controls.calendarPeriodLabel("month", "2026-10-12")).toBe("2026年10月");
		expect(controls.calendarPeriodLabel("year", "2028-06-01")).toBe("2028年");
	});

	it("各モードを一画面分だけ移動する", () => {
		expect(controls.moveCalendarDate("day", "2026-10-12", 1)).toBe("2026-10-13");
		expect(controls.moveCalendarDate("week", "2026-10-12", -1)).toBe("2026-10-05");
		expect(controls.moveCalendarDate("multiweek", "2026-10-14", 1)).toBe("2026-11-11");
		expect(controls.moveCalendarDate("month", "2026-12-12", 1)).toBe("2027-01-01");
		expect(controls.moveCalendarDate("year", "2028-06-01", -1)).toBe("2027-06-01");
	});

	it("絞り込みと連携元の件数を副作用なしで要約する", () => {
		const state = controls.calendarControlsState({
			calendarIds: ["primary", "team"],
			date: "2026-10-12",
			error: "HTTP 403",
			mode: "agenda",
			search: "設計",
			selectedLists: ["仕事"],
			selectionMode: true,
			subscriptions: [{ enabled: true }, { enabled: false }, {}],
		});
		expect(state).toMatchObject({
			filterLabel: "リスト 1",
			googleLabel: "Google 2",
			subscriptionLabel: "購読 2",
			error: "HTTP 403",
			search: "設計",
			selectionMode: true,
		});
		expect(state.modes).toHaveLength(7);
	});
});
