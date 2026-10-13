import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
	SETTINGS_SCHEMA_VERSION,
	migrateSettings,
	reviewDraft,
	settingsBackup,
	settingsForPersistence,
	settingsFromBackup,
	statusDefinitions,
	taskStorageSettings,
	isTaskPathExcluded,
} = require("../src/settings.cjs");

describe("settings domain", () => {
	it("legacy tools開閉状態をorganizeとhistoryへ一度だけ移行し再起動後も保持する", () => {
		const migrated = migrateSettings({ sidebarSections: { tools: true } });
		expect(migrated.sidebarSections).toMatchObject({ organize: true, history: true });
		expect(migrated.sidebarSections).not.toHaveProperty("tools");

		migrated.sidebarSections.organize = false;
		const restarted = migrateSettings(migrated);
		expect(restarted.sidebarSections).toMatchObject({ organize: false, history: true });
		expect(restarted.sidebarSections).not.toHaveProperty("tools");
	});

	it("振り返り下書きの元タスク識別子を再起動後も保持する", () => {
		const migrated = migrateSettings({
			settingsVersion: SETTINGS_SCHEMA_VERSION - 1,
			reviewDraft: {
				next: "同名タスク",
				focusTaskKeys: { " 同名タスク ": " private/tasks/Plan.md:8 " },
			},
		});

		expect(migrated.settingsVersion).toBe(SETTINGS_SCHEMA_VERSION);
		expect(migrated.reviewDraft.focusTaskKeys).toEqual({ 同名タスク: "private/tasks/Plan.md:8" });
	});

	it("不正・過大な下書き対応表を除外し100件に制限する", () => {
		const validEntries = Object.fromEntries(
			Array.from({ length: 101 }, (_, index) => [`重点${index}`, `path:${index}`]),
		);
		const draft = reviewDraft({
			focusTaskKeys: {
				...validEntries,
				"": "empty-title",
				空キー: "",
				["長すぎるタイトル".repeat(100)]: "path:oversized-title",
				長すぎるキー: "x".repeat(2049),
			},
		});

		expect(Object.keys(draft.focusTaskKeys)).toHaveLength(100);
		expect(draft.focusTaskKeys["重点0"]).toBe("path:0");
		expect(draft.focusTaskKeys["重点100"]).toBeUndefined();
		expect(draft.focusTaskKeys["空キー"]).toBeUndefined();
		expect(draft.focusTaskKeys["長すぎるキー"]).toBeUndefined();
	});

	it("設定バックアップから秘密情報を除き復元可能な形式にする", () => {
		const source = {
			settingsVersion: SETTINGS_SCHEMA_VERSION,
			linearApiKey: "linear-secret",
			jiraApiToken: "jira-secret",
			slackToken: "slack-secret",
			reviewDraft: { next: "次の重点", focusTaskKeys: { 次の重点: "tasks.md:4" } },
		};
		const persisted = settingsForPersistence(source);
		const backup = settingsBackup(source, "2026-10-12T00:00:00.000Z");

		expect(persisted).not.toHaveProperty("linearApiKey");
		expect(persisted).not.toHaveProperty("jiraApiToken");
		expect(persisted).not.toHaveProperty("slackToken");
		expect(settingsFromBackup(backup).reviewDraft.focusTaskKeys).toEqual({
			次の重点: "tasks.md:4",
		});
		expect(backup.createdAt).toBe("2026-10-12T00:00:00.000Z");
	});

	it("呼び出し間で振り返り下書きの参照を共有しない", () => {
		const first = migrateSettings({});
		const second = migrateSettings({});
		first.reviewDraft.focusTaskKeys["変更"] = "path:1";
		first.reviewDraft.carryoverReasons["task"] = "blocked";

		expect(second.reviewDraft.focusTaskKeys).toEqual({});
		expect(second.reviewDraft.carryoverReasons).toEqual({});
	});

	it("可変なカレンダー・習慣・セクション設定を正規化して参照共有しない", () => {
		const source = {
			googleCalendarIds: ["primary", 42, ""],
			googleCalendarMeta: { primary: { name: "仕事" }, broken: [] },
			calendarListFilter: ["仕事", null],
			calendarTimeZones: ["Asia/Tokyo", false],
			habitLog: { exercise: { "2026-10-12": 1 }, broken: [] },
			sections: { 仕事: ["設計", 42, ""], broken: "not-an-array" },
		};
		const first = migrateSettings(source);
		const second = migrateSettings(source);

		expect(first.googleCalendarIds).toEqual(["primary"]);
		expect(first.googleCalendarMeta).toEqual({ primary: { name: "仕事" } });
		expect(first.calendarListFilter).toEqual(["仕事"]);
		expect(first.calendarTimeZones).toEqual(["Asia/Tokyo"]);
		expect(first.habitLog).toEqual({ exercise: { "2026-10-12": 1 } });
		expect(first.sections).toEqual({ 仕事: ["設計"] });

		first.googleCalendarMeta.primary.name = "変更";
		first.habitLog.exercise["2026-10-12"] = 2;
		first.sections.仕事.push("実装");
		expect(second.googleCalendarMeta.primary.name).toBe("仕事");
		expect(second.habitLog.exercise["2026-10-12"]).toBe(1);
		expect(second.sections.仕事).toEqual(["設計"]);
	});

	it("新規インストールはVault固有でないTaktune配下を使う", () => {
		const migrated = migrateSettings({});
		expect(taskStorageSettings(migrated)).toEqual({
			inboxPath: "Taktune/Inbox.md",
			trashPath: "Taktune/Trash.md",
			excludedTaskPathFragments: ["/archive/"],
		});
		expect(migrated).toMatchObject({
			reviewDirectory: "Taktune/Reviews",
			dataDirectory: "Taktune/.data",
			settingsBackupDirectory: "Taktune/.data",
			dashboardNotePath: "Taktune/TODO.md",
		});
		expect(isTaskPathExcluded("Taktune/archive/old.md", migrated)).toBe(true);
		expect(isTaskPathExcluded("archive/root.md", migrated)).toBe(false);
	});

	it("既存設定に保存先項目がなくても旧privateパスを維持する", () => {
		const migrated = migrateSettings({
			settingsVersion: SETTINGS_SCHEMA_VERSION - 1,
			lists: ["仕事"],
		});
		expect(migrated).toMatchObject({
			inboxPath: "private/tasks/TODO Inbox.md",
			trashPath: "private/tasks/TickTick Trash.md",
			reviewDirectory: "private/reviews",
			dataDirectory: "private/.ticktick-dashboard",
			settingsBackupDirectory: "",
			dashboardNotePath: "private/TODO.md",
		});
	});

	it("保存先を正規化し、設定したパス断片だけを除外する", () => {
		const migrated = migrateSettings({
			inboxPath: "/Tasks//Inbox.md/",
			trashPath: "invalid",
			excludedTaskPathFragments: ["Templates/", "", "Templates/"],
		});
		expect(migrated.inboxPath).toBe("Tasks/Inbox.md");
		expect(migrated.trashPath).toBe("private/tasks/TickTick Trash.md");
		expect(migrated.excludedTaskPathFragments).toEqual(["Templates/"]);
		expect(isTaskPathExcluded("Private/Templates/t.md", migrated)).toBe(true);
	});

	it("組み込みstatusの旧表示名を永続値から除去し、カスタム名は保持する", () => {
		expect(
			statusDefinitions({
				statuses: [
					{ id: "todo", name: "未着手" },
					{ id: "doing", name: "In progress" },
					{ id: "waiting", name: "レビュー待ち" },
				],
			}),
		).toEqual([
			{ id: "todo", name: "", color: "#8b929d" },
			{ id: "doing", name: "", color: "#8b929d" },
			{ id: "waiting", name: "レビュー待ち", color: "#8b929d" },
		]);
	});

	it("schema v13で有効なtask mutation journalだけを保持する", () => {
		const valid = migrateSettings({
			settingsVersion: 12,
			taskMutationJournal: {
				version: 1,
				id: "journal-1",
				createdAt: "2026-10-12T00:00:00.000Z",
				targetPaths: ["Tasks/A.md"],
				operation: { type: "remove-taxonomy", kind: "tag", value: "old" },
			},
		});
		const invalid = migrateSettings({ settingsVersion: 12, taskMutationJournal: { regex: ".*" } });

		expect(valid.settingsVersion).toBe(13);
		expect(valid.taskMutationJournal.operation).toEqual({
			type: "remove-taxonomy",
			kind: "tag",
			value: "old",
		});
		expect(invalid.taskMutationJournal).toBeNull();
	});

	it("task mutation journalを通常settings snapshotへ混入させない", () => {
		const persisted = settingsForPersistence({
			locale: "ja",
			taskMutationJournal: { id: "stale-writer" },
		});

		expect(persisted).toEqual({ locale: "ja" });
	});
});
