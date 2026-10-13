import { describe, expect, it } from "vitest";
import { taskEditInitialValue } from "../src/ui/task-edit-model";

describe("taskEditInitialValue", () => {
	it("タスクを詳細フォームの初期値へ変換する", () => {
		const result = taskEditInitialValue(
			{
				raw: "- [ ] 企画書を書く #work",
				timeBlock: { date: "2026-10-13", start: "09:00", end: "10:30", endDate: "2026-10-14" },
				priority: 3,
				tags: ["work"],
				reminders: [{ date: "2026-10-13", time: "08:45" }],
				autoProgress: 50,
				subtasks: [
					{ line: 2, raw: "- [ ] 構成を作る", reminders: [{ date: "2026-10-12", time: "18:00" }] },
				],
			},
			[{ id: "next" }],
			(raw) => raw.replace(/^- \[ \] /u, "").replace(/ #\w+$/u, ""),
		);

		expect(result).toMatchObject({
			description: "企画書を書く",
			startAt: "2026-10-13T09:00",
			endAt: "2026-10-14T10:30",
			status: "next",
			priority: 3,
			reminders: ["2026-10-13T08:45"],
			progress: 50,
			progressAuto: true,
			existingSubtasks: [{ line: 2, description: "構成を作る", reminders: ["2026-10-12T18:00"] }],
		});
	});

	it("単一リマインダーと既定値を引き継ぐ", () => {
		const result = taskEditInitialValue(
			{ raw: "Task", reminder: { date: "2026-10-13", time: "12:00" }, progress: 25 },
			[],
			(raw) => raw,
		);

		expect(result.status).toBe("todo");
		expect(result.reminders).toEqual(["2026-10-13T12:00"]);
		expect(result.progress).toBe(25);
		expect(result.progressAuto).toBe(false);
		expect(result.attachments).toEqual([]);
	});
});
