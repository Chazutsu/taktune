import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { jaDomainTranslator } from "./domain-translator";

const require = createRequire(import.meta.url);
const {
	primaryNavigation,
	screenCapabilities,
	screenValues,
	usesTaskList,
} = require("../src/dashboard-shell-domain.cjs");

describe("dashboard shell domain", () => {
	it("一覧・専用画面・ゴミ箱で利用可能な操作を区別する", () => {
		expect(screenCapabilities("today")).toEqual({
			searchable: true,
			selectable: true,
			showSync: false,
			taskList: true,
			taskViewOptions: true,
		});
		expect(screenCapabilities("inbox")).toEqual({
			searchable: true,
			selectable: true,
			showSync: true,
			taskList: true,
			taskViewOptions: true,
		});
		expect(screenCapabilities("issues")).toEqual({
			searchable: true,
			selectable: false,
			showSync: true,
			taskList: false,
			taskViewOptions: false,
		});
		expect(screenCapabilities("calendar")).toEqual({
			searchable: false,
			selectable: false,
			showSync: true,
			taskList: false,
			taskViewOptions: false,
		});
		expect(screenCapabilities("trash")).toEqual({
			searchable: true,
			selectable: false,
			showSync: false,
			taskList: true,
			taskViewOptions: false,
		});
		expect(usesTaskList("board")).toBe(false);
	});

	it("主要導線だけを元の順序で残し、次の7日を短い表記にする", () => {
		const items = [
			{ id: "inbox", label: "受信箱" },
			{ id: "completed", label: "完了" },
			{ id: "next", label: "次の7日間" },
			{ id: "today", label: "今日" },
			{ id: "calendar", label: "時間割" },
		];
		expect(primaryNavigation(items, jaDomainTranslator)).toEqual([
			{ id: "inbox", label: "受信箱" },
			{ id: "next", label: "次の7日" },
			{ id: "today", label: "今日" },
			{ id: "calendar", label: "時間割" },
		]);
	});

	it("無効な操作値をundefinedにしてReactへ渡さない", () => {
		const common = {
			groupMode: "list",
			query: "検索",
			selectionMode: true,
			sortMode: "priority",
			subtitle: "副題",
			title: "画面",
		};
		expect(screenValues({ ...common, filter: "today" })).toMatchObject({
			groupMode: "list",
			query: "検索",
			selectionMode: true,
			sortMode: "priority",
		});
		expect(screenValues({ ...common, filter: "calendar" })).toMatchObject({
			groupMode: undefined,
			query: undefined,
			selectionMode: undefined,
			sortMode: undefined,
		});
		expect(screenValues({ ...common, filter: "trash" })).toMatchObject({
			groupMode: undefined,
			query: "検索",
			selectionMode: undefined,
			sortMode: undefined,
		});
	});
});
