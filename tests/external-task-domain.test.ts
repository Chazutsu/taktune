import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
	externalIssuesData,
	externalItemStateForTasks,
	externalProviderLabel,
	externalReferenceTag,
	externalSourceLabel,
	externalTaskMetadata,
} = require("../src/external-task-domain.cjs");

describe("external task domain", () => {
	it("サービスIDを安定したMarkdownタグへ正規化する", () => {
		expect(externalReferenceTag("linear:PPR-123")).toBe("external/linear/PPR-123");
		expect(externalReferenceTag(" slack : C 1 : bookmark/42 ")).toBe(
			"external/slack/C-1/bookmark-42",
		);
		expect(externalReferenceTag("")).toBe("");
	});

	it("外部候補を出所・URL・ラベル付きタスクメタデータへ変換する", () => {
		expect(
			externalTaskMetadata({
				externalId: "jira:OPS-42",
				labels: ["source:jira", "High Priority", "#High Priority"],
				url: "https://jira.example/OPS-42",
				meta: "進行中 · 期限 2026-10-15",
			}),
		).toEqual({
			list: "External",
			tags: ["source-jira", "High-Priority", "external/jira/OPS-42"],
			note: "[Open in source](https://jira.example/OPS-42)\n進行中 · 期限 2026-10-15",
		});
	});

	it("Markdown正本がない取込済み状態を候補へ戻し、出所を復元する", () => {
		const state = {
			imported: { "linear:PPR-1": 1, "slack:C1:B1": 2 },
			dismissed: { "jira:OPS-1": 3 },
		};
		const tasks = [{ tags: ["external/linear/PPR-1"] }];
		expect(externalItemStateForTasks(state, tasks)).toEqual({
			imported: { "linear:PPR-1": 1 },
			dismissed: state.dismissed,
		});
		expect(externalSourceLabel(tasks[0])).toBe("Linear");
		expect(externalSourceLabel({ tags: ["source-slack"] })).toBe("Slack");
		expect(externalProviderLabel("jira:OPS-1")).toBe("Jira");
		expect(externalProviderLabel("custom:item-1")).toBe("External");
	});

	it("Issue一覧の検索・ラベル・処理状態・計画先を一度に解決する", () => {
		const external = {
			linear: [
				{
					externalId: "linear:ENG-1",
					title: "認証を直す",
					meta: "進行中",
					labels: ["backend"],
					due: "2026-10-15",
				},
			],
			jira: [{ externalId: "jira:OPS-1", title: "運用確認", labels: ["ops"] }],
			slack: [{ externalId: "slack:C1:B1", title: "設計を読む" }],
			errors: { linear: "", jira: "Jira失敗", slack: "" },
		};
		const state = { imported: { "linear:ENG-1": 1 }, dismissed: { "jira:OPS-1": 1 } };
		const tasks = [
			{
				key: "task-1",
				due: "2026-10-16",
				timeBlock: { date: "2026-10-17" },
				tags: ["external/linear/ENG-1"],
			},
		];
		const hidden = externalIssuesData(external, state, tasks, { query: "設計" });
		expect(hidden.items.map((item: { externalId: string }) => item.externalId)).toEqual([
			"slack:C1:B1",
		]);
		const shown = externalIssuesData(external, state, tasks, {
			label: "backend",
			showHandled: true,
		});
		expect(shown.items[0]).toMatchObject({
			state: "imported",
			sourceLabel: "Linear",
			importedTaskKey: "task-1",
			planDate: "2026-10-17",
			scheduled: true,
		});
		expect(shown.labels).toEqual(["backend", "ops"]);
		expect(shown.sources).toEqual([
			{ label: "Linear", count: 1 },
			{ label: "Jira", count: 1 },
			{ label: "Slack", count: 1 },
		]);
		expect(shown.errors).toEqual(["Jira失敗"]);
	});
});
