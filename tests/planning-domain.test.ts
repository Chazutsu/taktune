import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { createPlanningDomain, resolveReviewFocusTaskKey } = require("../src/planning-domain.cjs");
const domain = createPlanningDomain({
	describeTask: (raw: string) => raw.replace(/\s+#\S+/gu, ""),
	matchesQuery: (value: string, query: string) =>
		value.toLowerCase().includes(query.trim().toLowerCase()),
	today: () => "2026-10-12",
});

describe("planning domain", () => {
	it("新規計画は過去日を今日へ補正し、既存時間枠は実配置日を保つ", () => {
		const unscheduled = domain.calendarPlanningState("task-1", "2026-10-01");
		expect(unscheduled.date).toBe("2026-10-12");
		expect(unscheduled.selectionMode).toBe(true);
		expect([...unscheduled.selectedTaskKeys]).toEqual(["task-1"]);

		const scheduled = domain.calendarPlanningState("task-1", "2026-10-01", "2026-10-12", true);
		expect(scheduled.date).toBe("2026-10-01");
		expect(scheduled.selectionMode).toBe(false);
	});

	it("明示選択を検索・リスト条件より優先し、トレイ先頭へ固定する", () => {
		const tasks = [
			{ key: "normal", raw: "リリース準備 #ops", list: "仕事", priority: 3, due: "2026-10-13" },
			{ key: "selected", raw: "設計確認 #design", list: "個人", priority: 1, due: "2026-10-20" },
		];
		const selected = new Set(["selected"]);
		const visible = domain.planTrayVisibleTasks(tasks, ["仕事"], "release", selected);
		expect(visible.map((task: { key: string }) => task.key)).toEqual(["selected"]);
		expect(
			domain
				.sortPlanTrayTasks(tasks, "priority", selected)
				.map((task: { key: string }) => task.key),
		).toEqual(["selected", "normal"]);
	});

	it("重点タスク作成の再試行ではキャッシュ済みキーを再利用する", async () => {
		const cache = new Map<string, string>();
		const createTask = vi.fn().mockResolvedValue("created-key");
		expect(await resolveReviewFocusTaskKey("配布を安定させる", "", cache, createTask)).toBe(
			"created-key",
		);
		expect(await resolveReviewFocusTaskKey("配布を安定させる", "", cache, createTask)).toBe(
			"created-key",
		);
		expect(createTask).toHaveBeenCalledOnce();
	});
});
