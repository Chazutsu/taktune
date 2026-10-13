import { describe, expect, it } from "vitest";
import { jaDomainTranslator } from "./domain-translator";

const {
	mergeCalendarFailure,
	mergeCalendarSnapshot,
	mergeExternalSnapshot,
	withoutCalendarError,
} = require("../src/external-refresh-domain.cjs");

describe("external refresh domain", () => {
	it("予定以外のエラーだけを残す", () => {
		const errors = { calendar: "古い予定エラー", jira: "Jira失敗" };
		expect(withoutCalendarError(errors)).toEqual({ jira: "Jira失敗" });
		expect(errors).toEqual({ calendar: "古い予定エラー", jira: "Jira失敗" });
	});

	it("新しい予定同期と競合した全同期は予定と予定エラーを上書きしない", () => {
		const current = {
			calendar: [{ id: "latest" }],
			linear: [],
			jira: [],
			slack: [],
			errors: { calendar: "最新の予定警告", jira: "古いJira失敗" },
		};
		const loaded = {
			calendar: [{ id: "stale" }],
			linear: [{ id: "L-1" }],
			jira: [],
			slack: [],
			errors: { calendar: "古い予定警告", linear: "Linear一部失敗" },
		};
		expect(mergeExternalSnapshot(current, loaded, true)).toEqual({
			calendar: [{ id: "latest" }],
			linear: [{ id: "L-1" }],
			jira: [],
			slack: [],
			errors: { calendar: "最新の予定警告", linear: "Linear一部失敗" },
		});
	});

	it("競合していない全同期は取得結果をそのまま採用する", () => {
		const loaded = { calendar: [{ id: "new" }], linear: [], jira: [], slack: [], errors: {} };
		expect(mergeExternalSnapshot({ calendar: [] }, loaded, false)).toBe(loaded);
	});

	it("予定同期は他サービスのエラーを維持し、古い予定エラーだけを置換する", () => {
		const current = {
			calendar: [{ id: "old" }],
			linear: [],
			errors: { calendar: "古い予定エラー", slack: "Slack失敗" },
		};
		expect(
			mergeCalendarSnapshot(
				current,
				{ items: [{ id: "new" }], errors: ["Google失敗"] },
				jaDomainTranslator,
			),
		).toEqual({
			calendar: [{ id: "new" }],
			linear: [],
			errors: { calendar: "一部の予定を取得できなかった: Google失敗", slack: "Slack失敗" },
		});
		expect(current.calendar).toEqual([{ id: "old" }]);
	});

	it("予定の全面失敗は古い予定を消し、他サービスのエラーを維持する", () => {
		const current = {
			calendar: [{ id: "old" }],
			jira: [],
			errors: { calendar: "古い予定エラー", jira: "Jira失敗" },
		};
		expect(mergeCalendarFailure(current, new Error("認証切れ"), jaDomainTranslator)).toEqual({
			calendar: [],
			jira: [],
			errors: { calendar: "予定を取得できなかった: 認証切れ", jira: "Jira失敗" },
		});
	});
});
