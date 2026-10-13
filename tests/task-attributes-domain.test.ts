import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createTaskAttributesDomain } = require("../src/task-attributes-domain.cjs");
const weekdaySource = "sunday|monday|tuesday|wednesday|thursday|friday|saturday";
const repeatValueSource = `(?:every(?:\\s+\\d+)?\\s+months?\\s+on\\s+(?:day\\s+\\d{1,2}|last\\s+day|(?:first|second|third|fourth|last)\\s+(?:${weekdaySource}))|every\\s+(?:${weekdaySource})(?:,(?:${weekdaySource}))*|every\\s+weekday|every(?:\\s+\\d+)?\\s+(?:days?|weeks?|months?|years?))`;
const domain = createTaskAttributesDomain({
	reminderPattern: /🔔\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/gu,
	repeatValueSource,
});

describe("task attributes domain", () => {
	it("すべての管理属性を除去しMarkdownリンクを含む題名だけを返す", () => {
		const raw =
			"[仕様](https://example.com)を確認 <!-- ttd:abc-123 --> 📋 仕事 🗂️ 開発 📅 2026-10-12 ⏰ 2026-10-12 09:00→2026-10-13 10:00 🔁 every 2 weeks 🔔 2026-10-12 08:30 📊 50% 🚦 doing 🍅 2 ⏳ 45m 🚫 ⏫ #確認";
		expect(domain.cleanDescription(raw)).toBe("[仕様](https://example.com)を確認");
	});

	it("重点照合用の題名はMarkdown記法ではなく表示文字を返す", () => {
		expect(
			domain.plainDescription(
				"[PPR-1](https://linear.app/ppr-1)を確認 [[設計書|仕様]] `API` #開発",
			),
		).toBe("PPR-1を確認 仕様 API");
		expect(domain.plainDescription("画像 ![図](image.png) と [[ノート]] **重要**")).toBe(
			"画像 図 と ノート 重要",
		);
	});

	it("単日時間枠・完了日・予約優先度も題名から除去する", () => {
		expect(
			domain.cleanDescription("作業 ⏰ 2026-10-12 09:00-10:00 ✅ 2026-10-12 🔼 #team/backend"),
		).toBe("作業");
	});

	it("複数通知を順序どおり抽出する", () => {
		expect(domain.remindersOf("作業 🔔 2026-10-12 09:00 🔔 2026-10-13 18:30")).toEqual([
			{ date: "2026-10-12", time: "09:00" },
			{ date: "2026-10-13", time: "18:30" },
		]);
	});

	it("通知は前回確認後かつ現在時刻以前だけを期限到来とする", () => {
		const lastCheck = Date.parse("2026-10-12T08:00:00Z");
		const now = Date.parse("2026-10-12T09:00:00Z");
		expect(domain.isReminderDue("2026-10-12T08:30:00Z", lastCheck, now)).toBe(true);
		expect(domain.isReminderDue("2026-10-12T08:00:00Z", lastCheck, now)).toBe(false);
		expect(domain.isReminderDue("2026-10-12T09:01:00Z", lastCheck, now)).toBe(false);
		expect(domain.isReminderDue("invalid", lastCheck, now)).toBe(false);
	});

	it("子タスクがあれば自動進捗、なければ完了・手動進捗を使う", () => {
		const parent = { key: "parent", progress: 80 };
		const tasks = [
			parent,
			{ parentKey: "parent", done: true },
			{ parentKey: "parent", done: false },
			{ parentKey: "parent", done: true },
		];
		expect(domain.progressFor(parent, tasks)).toBe(67);
		expect(domain.progressFor({ key: "done", done: true }, tasks)).toBe(100);
		expect(domain.progressFor({ key: "manual", progress: 130 }, tasks)).toBe(100);
		expect(domain.progressFor({ key: "manual", progress: -10 }, tasks)).toBe(0);
	});
});
