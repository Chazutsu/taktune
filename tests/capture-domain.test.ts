import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { jaDomainTranslator } from "./domain-translator";

const require = createRequire(import.meta.url);
const { createCaptureDomain } = require("../src/capture-domain.cjs");
const { addDays } = require("../src/date-domain.cjs");
const { externalItemStateForTasks } = require("../src/external-task-domain.cjs");
const { externalProviderLabel } = require("../src/external-task-domain.cjs");
const { pendingExternalItems } = require("../src/settings.cjs");
const { createTaskInputDomain } = require("../src/task-input-domain.cjs");

const localDate = () => "2026-10-12";
const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const input = createTaskInputDomain({
	addDays,
	localDate,
	repeatValuePattern: /^(?:every day|every week)$/u,
	t: jaDomainTranslator,
	weekdayNames,
	weekdaySource: weekdayNames.join("|"),
});
const domain = createCaptureDomain({
	addDays,
	externalItemStateForTasks,
	externalProviderLabel,
	localDate,
	parseQuickTask: input.parseQuickTask,
	pendingExternalItems,
	quickTaskPreview: input.quickTaskPreview,
});

describe("capture domain", () => {
	it("処理済み外部候補を除外し、件数・上限・連携元・エラーを返す", () => {
		const external = {
			linear: [{ externalId: "linear:ENG-1" }, { externalId: "linear:ENG-2" }],
			jira: [{ externalId: "jira:PPR-1" }],
			slack: [{ externalId: "slack:C1:B1" }],
			errors: { linear: "Linear失敗", jira: "", slack: "Slack失敗" },
		};
		const state = {
			imported: { "linear:ENG-1": "2026-10-01" },
			dismissed: { "jira:PPR-1": "2026-10-01" },
		};
		const tasks = [
			{ tags: ["external/linear/ENG-1"] },
			{ key: "open" },
			{ key: "planned", timeBlock: { date: "2026-10-12" } },
			{ key: "child", parentKey: "open" },
		];
		const result = domain.inboxModelData(external, state, tasks, 1);
		expect(result.total).toBe(2);
		expect(result.unplannedCount).toBe(2);
		expect(result.items).toEqual([{ externalId: "linear:ENG-2", sourceLabel: "Linear" }]);
		expect(result.errors).toEqual(["Linear失敗", "Slack失敗"]);
	});

	it("テンプレート期限を今日からの相対日で解決する", () => {
		expect(
			domain.quickAddTemplates([
				{ id: "weekly", name: "週報", description: "週報を書く", dueOffset: 2 },
				{ id: "none", name: "いつか", description: "整理", dueOffset: null },
			]),
		).toEqual([
			{ id: "weekly", name: "週報", description: "週報を書く", resolvedDue: "2026-10-14" },
			{ id: "none", name: "いつか", description: "整理", resolvedDue: "" },
		]);
	});

	it("画面分類・自然文・テンプレートを優先順位どおり統合する", () => {
		const templates = [
			{
				id: "base",
				description: "既定",
				dueOffset: 3,
				list: "テンプレート",
				tags: ["定例"],
				priority: 2,
				repeat: "every week",
			},
		];
		const resolved = domain.resolveQuickAdd({
			description: "実装 明日 !高 ~入力 #開発 毎日",
			filter: "list:画面",
			templateId: "base",
			templates,
		});
		expect(resolved).toMatchObject({
			description: "実装",
			due: "2026-10-13",
			metadata: { list: "画面", tags: ["定例", "開発"], priority: 3, repeat: "every day" },
		});
	});

	it("タグ画面のタグを重複なく追加し、明示期限を最優先する", () => {
		const resolved = domain.resolveQuickAdd({
			description: "確認 #開発",
			due: "2026-10-20",
			filter: "tag:開発",
			templates: [],
		});
		expect(resolved).toMatchObject({ due: "2026-10-20", metadata: { tags: ["開発"] } });
		expect(domain.resolveQuickAdd({ description: "   " })).toBeNull();
	});

	it("プレビューも保存と同じ自然文解析を使う", () => {
		expect(domain.quickAddPreview("提出 明日 9時", "")).toEqual([
			"提出",
			"期限 2026-10-13",
			"通知 09:00",
		]);
	});
});
