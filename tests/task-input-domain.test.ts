import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { jaDomainTranslator } from "./domain-translator";

const require = createRequire(import.meta.url);
const { addDays, localDate } = require("../src/date-domain.cjs");
const { createTaskInputDomain } = require("../src/task-input-domain.cjs");

const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const weekdaySource = weekdayNames.join("|");
const repeatSource = `(?:every(?:\\s+\\d+)?\\s+months?\\s+on\\s+(?:day\\s+\\d{1,2}|last\\s+day|(?:first|second|third|fourth|last)\\s+(?:${weekdaySource}))|every\\s+(?:${weekdaySource})(?:,(?:${weekdaySource}))*|every\\s+weekday|every(?:\\s+\\d+)?\\s+(?:days?|weeks?|months?|years?))`;
const domain = createTaskInputDomain({
	addDays,
	localDate,
	repeatValuePattern: new RegExp(`^${repeatSource}$`, "u"),
	t: jaDomainTranslator,
	weekdayNames,
	weekdaySource,
});

describe("task input domain", () => {
	it("自然文から期限・時刻・事前通知・優先度・分類・繰り返しを抽出する", () => {
		const parsed = domain.parseQuickTask("企画書 明日9時30分 15分前 !高 ~仕事 #企画 #企画 毎週");
		expect(parsed).toEqual({
			description: "企画書",
			due: addDays(localDate(), 1),
			priority: 3,
			list: "仕事",
			tags: ["企画"],
			repeat: "every week",
			reminderTime: "09:30",
			reminderOffsetMinutes: 15,
		});
		expect(domain.quickTaskPreview(parsed)).toContain("通知 09:30の15分前");
	});

	it("リマインダーを日付境界を越えて前倒しする", () => {
		expect(domain.offsetReminder("2026-10-12", "00:10", 30)).toEqual({
			date: "2026-10-11",
			time: "23:40",
		});
		expect(domain.offsetReminder("", "10:00", 30)).toBeNull();
	});

	it("平日・複数曜日・月末・うるう年の次回日を求める", () => {
		expect(domain.nextRepeatDate("2026-10-09", "every weekday")).toBe("2026-10-12");
		expect(domain.nextRepeatDate("2026-10-12", "every wednesday,friday")).toBe("2026-10-14");
		expect(domain.nextRepeatDate("2026-01-31", "every month")).toBe("2026-02-28");
		expect(domain.nextRepeatDate("2024-02-29", "every year")).toBe("2025-02-28");
		expect(domain.nextRepeatDate("2026-10-12", "every month on last monday")).toBe("2026-11-30");
	});

	it("繰り返し構文の日付範囲を検証する", () => {
		expect(domain.isValidRepeat("every 2 months on day 31")).toBe(true);
		expect(domain.isValidRepeat("every month on day 0")).toBe(false);
		expect(domain.isValidRepeat("sometimes")).toBe(false);
	});

	it("時間枠の長さを保った仮想繰り返しタスクを期間内だけ展開する", () => {
		const source = {
			key: "task",
			due: "",
			repeat: "every week",
			done: false,
			wontDo: false,
			timeBlock: { date: "2026-10-05", start: "23:00", endDate: "2026-10-06", end: "01:00" },
		};
		const result = domain.expandRecurringTasks([source], "2026-10-12", 14);
		expect(result).toHaveLength(3);
		expect(result[1]).toMatchObject({
			key: "task@2026-10-12",
			occurrenceDate: "2026-10-12",
			isVirtualOccurrence: true,
			timeBlock: { date: "2026-10-12", endDate: "2026-10-13" },
		});
		expect(result[2].timeBlock.endDate).toBe("2026-10-20");
		expect(domain.expandRecurringTasks([source], "2026-10-12", 14, false)).toEqual([source]);
	});

	it("予約タグと通常タグ、優先度を区別する", () => {
		expect(domain.tagsOf("作業 #重要 #緊急 #開発 #team/backend")).toEqual(["開発", "team/backend"]);
		expect(["🔽", "", "🔼", "⏫"].map(domain.priorityOf)).toEqual([0, 1, 2, 3]);
	});
});
