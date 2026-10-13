import { describe, expect, it } from "vitest";
import { jaDomainTranslator } from "./domain-translator";
import {
	appendReviewFocus,
	previousReviewFocus,
	reviewFocusCandidates,
	reviewFocusItems,
	reviewFocusProgress,
} from "../src/ui/contracts";

describe("UI model contracts", () => {
	it("保存した次週重点をReactの前回重点モデルへ変換する", () => {
		expect(
			previousReviewFocus({
				date: "2026-10-02",
				next: [" 配布を安定させる ", "レビューを返す", "", "三件目", "四件目"],
			}),
		).toEqual({
			date: "2026-10-02",
			ids: {},
			items: ["配布を安定させる", "レビューを返す", "三件目"],
		});
	});

	it("重点がなければ前回重点欄を表示しない", () => {
		expect(previousReviewFocus({ date: "2026-10-02", next: [] })).toBeNull();
		expect(previousReviewFocus(null)).toBeNull();
	});

	it("入力時と旧設定読込時の重点を重複なく3件へ正規化する", () => {
		expect(
			reviewFocusItems(" 配布を安定させる\nレビューを返す\n配布を安定させる\n\n三件目\n四件目"),
		).toEqual(["配布を安定させる", "レビューを返す", "三件目"]);
		expect(reviewFocusCandidates("一\n二\n一\n三\n四")).toEqual(["一", "二", "三", "四"]);
		expect(previousReviewFocus({ date: "2026-10-02", next: ["一", "一", "二"] })).toEqual({
			date: "2026-10-02",
			ids: {},
			items: ["一", "二"],
		});
	});

	it("持ち越しを重複なく最大3件の次週重点へ追加する", () => {
		expect(appendReviewFocus("一\n二", " 三 ")).toEqual({ added: true, value: "一\n二\n三" });
		expect(appendReviewFocus("一\n二", "二")).toEqual({ added: false, value: "一\n二" });
		expect(appendReviewFocus("一\n二\n三", "四")).toEqual({ added: false, value: "一\n二\n三" });
	});

	it("重点を振り返り日以後の完了、時間割済み、未配置、未作成へ分類する", () => {
		const focus = {
			date: "2026-10-02",
			ids: {},
			items: ["完了", "予定", "未配置", "未作成", "再挑戦"],
		};
		expect(
			reviewFocusProgress(
				focus,
				[
					{ title: "完了", doneDate: "2026-10-08", scheduled: true },
					{ title: "予定", scheduled: true },
					{ title: "未配置", scheduled: false },
					{ title: "再挑戦", doneDate: "2026-09-20", scheduled: false },
					{ title: "再挑戦", scheduled: false },
				],
				jaDomainTranslator,
			),
		).toEqual({
			date: "2026-10-02",
			items: [
				{ title: "完了", label: "完了", action: null },
				{ title: "予定", label: "時間割済み", action: "open" },
				{ title: "未配置", label: "未配置", action: "plan" },
				{ title: "未作成", label: "未作成", action: "plan" },
				{ title: "再挑戦", label: "未配置", action: "plan" },
			],
		});
	});

	it("タイトル変更後も永続IDで同じ重点タスクを追跡する", () => {
		const focus = previousReviewFocus({
			date: "2026-10-02",
			next: ["旧タイトル"],
			focusIds: { 旧タイトル: "focus-12345678" },
		});
		expect(
			reviewFocusProgress(
				focus,
				[{ id: "focus-12345678", title: "新タイトル", scheduled: true }],
				jaDomainTranslator,
			),
		).toEqual({
			date: "2026-10-02",
			items: [{ title: "旧タイトル", label: "時間割済み", action: "open" }],
		});
	});

	it("永続IDの対象が消えても同名の別タスクへすり替えない", () => {
		const focus = previousReviewFocus({
			date: "2026-10-02",
			next: ["配布する"],
			focusIds: { 配布する: "focus-original1" },
		});
		expect(
			reviewFocusProgress(
				focus,
				[{ id: "focus-another22", title: "配布する", doneDate: "2026-10-08", scheduled: true }],
				jaDomainTranslator,
			),
		).toEqual({
			date: "2026-10-02",
			items: [{ title: "配布する", label: "未作成", action: "plan" }],
		});
	});
});
