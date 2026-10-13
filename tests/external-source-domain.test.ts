import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { jaDomainTranslator } from "./domain-translator";

const require = createRequire(import.meta.url);
const { addDays, localDate } = require("../src/date-domain.cjs");
const { createExternalSourceDomain } = require("../src/external-source-domain.cjs");
const domain = createExternalSourceDomain({ addDays, localDate, t: jaDomainTranslator });

describe("external source domain", () => {
	it("Googleの時刻・複数日予定を正規化しキャンセル・日時欠損を除外する", () => {
		const result = domain.googleCalendarEvents(
			[
				{
					id: "timed",
					summary: "定例",
					htmlLink: "https://calendar/timed",
					start: { dateTime: "2026-10-12T10:00:00" },
					end: { dateTime: "2026-10-12T11:30:00" },
				},
				{
					id: "all-day",
					summary: "合宿",
					start: { date: "2026-10-12" },
					end: { date: "2026-10-14" },
				},
				{
					id: "cancelled",
					status: "cancelled",
					start: { date: "2026-10-12" },
					end: { date: "2026-10-13" },
				},
				{ id: "broken", start: {}, end: {} },
			],
			"team",
			{ name: "開発", color: "#123456" },
		);
		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({
			eventId: "timed",
			meta: "10:00–11:30",
			date: "2026-10-12",
			startMinutes: 600,
			endMinutes: 690,
			calendarName: "開発",
			calendarColor: "#123456",
		});
		expect(result[1]).toMatchObject({
			eventId: "all-day",
			allDay: true,
			meta: "終日",
			dates: ["2026-10-12", "2026-10-13"],
		});
	});

	it("Googleカレンダー一覧のprimary IDと表示値を統一する", () => {
		expect(
			domain.googleCalendarList([
				{
					id: "mail@example.com",
					summary: "個人",
					primary: true,
					selected: true,
					backgroundColor: "#fff",
				},
				{ id: "team", summary: "チーム", summaryOverride: "開発" },
			]),
		).toEqual([
			{ id: "primary", name: "個人", color: "#fff", primary: true, selectedInGoogle: true },
			{ id: "team", name: "開発", color: "#7693e8", primary: false, selectedInGoogle: false },
		]);
	});

	it("Linear Issueへ出所・状態・期限ラベルを付ける", () => {
		expect(
			domain.linearIssues([
				{
					identifier: "ENG-1",
					title: "修正",
					url: "https://linear/1",
					dueDate: "2026-10-20",
					state: { name: "In Progress" },
				},
			])[0],
		).toEqual({
			externalId: "linear:ENG-1",
			title: "ENG-1 修正",
			meta: "In Progress · 期限 2026-10-20",
			due: "2026-10-20",
			url: "https://linear/1",
			icon: "square-kanban",
			labels: ["source:linear", "status:In Progress"],
		});
	});

	it("Jira Issueへ出所・状態・優先度ラベルと正規URLを付ける", () => {
		const issue = {
			key: "PPR-10",
			fields: {
				summary: "移行",
				status: { name: "進行中" },
				duedate: "2026-10-21",
				priority: { name: "High" },
			},
		};
		expect(domain.jiraIssues([issue], "https://jira.example.com/")[0]).toMatchObject({
			externalId: "jira:PPR-10",
			url: "https://jira.example.com/browse/PPR-10",
			due: "2026-10-21",
			labels: ["source:jira", "status:進行中", "priority:High"],
		});
	});

	it("Slackブックマークへチャンネルを含む安定IDと分類を付ける", () => {
		const result = domain.slackBookmarks(
			[
				{ id: "B1", title: "仕様", link: "https://slack/bookmark" },
				{ id: "B2", channel_id: "C2", link: "https://slack/2" },
			],
			"C1",
		);
		expect(result[0]).toMatchObject({
			externalId: "slack:C1:B1",
			title: "仕様",
			labels: ["source:slack", "type:bookmark", "channel:C1"],
		});
		expect(result[1]).toMatchObject({ externalId: "slack:C2:B2", title: "https://slack/2" });
	});
});
