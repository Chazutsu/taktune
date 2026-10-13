import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Review, type ReviewModel } from "../src/ui/review";

function model(overrides: Partial<ReviewModel> = {}): ReviewModel {
	return {
		previousFocus: null,
		history: [],
		summary: [
			{ label: "完了", value: "3件" },
			{ label: "集中", value: "90分" },
			{ label: "継続中", value: "2件" },
		],
		achievements: [{ title: "設計を完了する", meta: "2026-10-09", source: "Linear" }],
		focus: [{ title: "実装", meta: "2026-10-09 · 60分" }],
		carryovers: [
			{
				key: "task-1",
				plainTitle: "レビューを返す",
				title: "レビューを返す",
				reason: "",
				context: "時間割・期限超過",
				source: "Jira",
			},
		],
		carryoverOverflowCount: 0,
		draft: { wins: "", friction: "", lessons: "", next: "" },
		onPlanPreviousFocus: vi.fn(),
		onReasonChange: vi.fn(),
		onFocusSourceChange: vi.fn(),
		onDraftChange: vi.fn(),
		onPersistDraft: vi.fn(),
		onOpenRemainingCarryovers: vi.fn(),
		onSave: vi.fn(),
		...overrides,
	};
}

const focusItems = (...titles: string[]) =>
	titles.map((title) => ({ title, label: "未配置" as const, action: "plan" as const }));

describe("Review", () => {
	it("モバイルでは判断を3ステップに分け、現在の情報だけを前面に出す", () => {
		const { container } = render(<Review model={model()} />);
		const tabs = screen.getByRole("navigation", { name: "振り返りの手順" });
		expect(tabs).toHaveClass("max-[620px]:grid");
		expect(screen.getByRole("button", { name: "1実績" })).toHaveAttribute("aria-selected", "true");
		expect(screen.getByRole("region", { name: "持ち越しを判断する" })).toHaveClass(
			"max-[620px]:hidden",
		);
		fireEvent.click(screen.getByRole("button", { name: "持ち越しを判断" }));
		expect(screen.getByRole("button", { name: "2持ち越し" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(screen.getByRole("region", { name: "直近7日を確認する" })).toHaveClass(
			"max-[620px]:hidden",
		);
		expect(screen.getByRole("region", { name: "持ち越しを判断する" })).not.toHaveClass(
			"max-[620px]:hidden",
		);
		fireEvent.click(screen.getByRole("button", { name: "次の7日間を決める" }));
		expect(screen.getByRole("button", { name: "3次週" })).toHaveAttribute("aria-selected", "true");
		expect(container.querySelector("[data-mobile-safe-area='review-action']")).not.toHaveClass(
			"max-[620px]:hidden",
		);
	});
	it("確認・判断・学び・保存の順で表示する", () => {
		const { container } = render(<Review model={model()} />);
		const headings = Array.from(container.querySelectorAll("h2")).map(
			(heading) => heading.textContent,
		);
		expect(headings).toEqual(["直近7日を確認する", "持ち越しを判断する", "学びを残す"]);
		expect(screen.getByText("設計を完了する")).toBeInTheDocument();
		expect(screen.getByText("Linear")).toBeInTheDocument();
		expect(screen.getByText("実装")).toBeInTheDocument();
		expect(screen.getByText("時間割・期限超過")).toBeInTheDocument();
		expect(screen.getByText("Jira")).toBeInTheDocument();
		expect(screen.getByRole("status")).toHaveTextContent("未選択 1件");
	});

	it("持ち越し理由を更新して未選択件数を解消する", () => {
		const value = model();
		render(<Review model={value} />);
		fireEvent.change(screen.getByLabelText("レビューを返すの持ち越し理由"), {
			target: { value: "blocked" },
		});
		expect(value.onReasonChange).toHaveBeenCalledWith("task-1", "blocked");
		expect(screen.queryByText("未選択 1件")).not.toBeInTheDocument();
		expect(screen.getByText("次の7日間の重点を1件以上決める")).toBeInTheDocument();
		expect(screen.getByText("1行に1件、最大3件")).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText(/次の7日間で重視すること/u), {
			target: { value: "レビューを前倒しする" },
		});
		expect(screen.getByText("記録の準備ができた")).toBeInTheDocument();
	});

	it("持ち越しを1タップで次週重点へ追加し、重複操作を止める", () => {
		const value = model();
		render(<Review model={value} />);
		const add = screen.getByRole("button", { name: "レビューを返すを次週重点に追加" });
		expect(add).toHaveClass("max-[620px]:min-h-11");
		fireEvent.click(add);
		expect(screen.getByLabelText(/次の7日間で重視すること/u)).toHaveValue("レビューを返す");
		expect(value.onDraftChange).toHaveBeenCalledWith("next", "レビューを返す");
		expect(value.onFocusSourceChange).toHaveBeenCalledWith("レビューを返す", "task-1");
		expect(screen.getByRole("button", { name: "レビューを返すを次週重点に追加" })).toBeDisabled();
		expect(screen.getByText("重点済み")).toBeInTheDocument();
	});

	it("Markdownリンク付き持ち越しは表示名だけを次週重点へ追加する", () => {
		const title = document.createElement("span");
		title.innerHTML = '<a href="https://linear.app/PPR-1">PPR-1</a>を確認する';
		render(
			<Review
				model={model({
					carryovers: [
						{ key: "linked", plainTitle: "PPR-1を確認する", title, reason: "", source: "Linear" },
					],
				})}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "PPR-1を確認するを次週重点に追加" }));
		expect(screen.getByLabelText(/次の7日間で重視すること/u)).toHaveValue("PPR-1を確認する");
		expect(screen.getByLabelText(/次の7日間で重視すること/u)).not.toHaveValue(
			expect.stringContaining("https://"),
		);
	});

	it("上限を超えた持ち越し件数を明示し、下書き保存後に全タスクへ進む", async () => {
		const onPersistDraft = vi.fn().mockResolvedValue(undefined);
		const onOpenRemainingCarryovers = vi.fn().mockResolvedValue(undefined);
		render(
			<Review
				model={model({ carryoverOverflowCount: 4, onPersistDraft, onOpenRemainingCarryovers })}
			/>,
		);
		expect(screen.getByRole("note")).toHaveTextContent("重要度の高い1件を表示中");
		expect(screen.getByRole("note")).toHaveTextContent("ほか4件は今回の判断対象に含まれない");
		fireEvent.click(screen.getByRole("button", { name: "残り4件を確認" }));
		await waitFor(() => expect(onOpenRemainingCarryovers).toHaveBeenCalledOnce());
		expect(onPersistDraft).toHaveBeenCalledOnce();
		expect(screen.getByRole("button", { name: "残り4件を確認" })).toHaveClass(
			"max-[620px]:min-h-11",
		);
	});

	it("全タスクへの遷移前に下書き保存が失敗したら振り返りへ留まる", async () => {
		const onPersistDraft = vi.fn().mockRejectedValue(new Error("保存失敗"));
		const onOpenRemainingCarryovers = vi.fn();
		render(
			<Review
				model={model({ carryoverOverflowCount: 2, onPersistDraft, onOpenRemainingCarryovers })}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "残り2件を確認" }));
		await waitFor(() => expect(onPersistDraft).toHaveBeenCalledOnce());
		expect(onOpenRemainingCarryovers).not.toHaveBeenCalled();
		expect(screen.getByText("下書きを保存できなかった")).toBeInTheDocument();
	});

	it("全タスク画面の描画失敗を示し、その場で再試行できる", async () => {
		const onOpenRemainingCarryovers = vi
			.fn()
			.mockRejectedValueOnce(new Error("一覧を描画できなかった"))
			.mockResolvedValueOnce(undefined);
		render(<Review model={model({ carryoverOverflowCount: 2, onOpenRemainingCarryovers })} />);
		fireEvent.click(screen.getByRole("button", { name: "残り2件を確認" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("一覧を描画できなかった");
		fireEvent.click(screen.getByRole("button", { name: "残り2件を確認" }));
		await waitFor(() => expect(onOpenRemainingCarryovers).toHaveBeenCalledTimes(2));
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("実績と持ち越しのMarkdownリンクをリンクとして表示する", () => {
		const achievement = document.createElement("span");
		achievement.innerHTML =
			'<p><a href="https://linear.app/example/issue/PPR-1">PPR-1</a>を完了する</p>';
		const carryover = document.createElement("span");
		carryover.innerHTML =
			'<p><a href="https://linear.app/example/issue/PPR-2">PPR-2</a>を判断する</p>';
		render(
			<Review
				model={model({
					achievements: [{ title: achievement, meta: "2026-10-09", source: "Linear" }],
					carryovers: [
						{
							key: "task-2",
							plainTitle: "PPR-2を判断する",
							title: carryover,
							reason: "",
							context: "期限超過",
							source: "Linear",
						},
					],
				})}
			/>,
		);
		expect(screen.getByRole("link", { name: "PPR-1" })).toHaveAttribute(
			"href",
			"https://linear.app/example/issue/PPR-1",
		);
		expect(screen.getByRole("link", { name: "PPR-2" })).toHaveAttribute(
			"href",
			"https://linear.app/example/issue/PPR-2",
		);
		expect(screen.getByLabelText("PPR-2を判断するの持ち越し理由")).toBeInTheDocument();
		expect(screen.queryByText(/\[PPR-2\]/u)).not.toBeInTheDocument();
	});

	it("記述内容と保存操作をモデルへ伝える", async () => {
		const value = model({ carryovers: [] });
		render(<Review model={value} />);
		fireEvent.change(screen.getByLabelText("学んだこと"), { target: { value: "分割すると進む" } });
		fireEvent.change(screen.getByLabelText(/次の7日間で重視すること/u), {
			target: { value: "小さく分割する" },
		});
		expect(value.onDraftChange).toHaveBeenCalledWith("lessons", "分割すると進む");
		fireEvent.click(screen.getByRole("button", { name: "保存して今日へ" }));
		await waitFor(() => expect(value.onSave).toHaveBeenCalledOnce());
	});

	it("入力直後の確定は遅延保存を止め、最新下書きを同期してから保存する", async () => {
		const order: string[] = [];
		const onPersistDraft = vi.fn(async () => {
			order.push("draft");
		});
		const onSave = vi.fn(async () => {
			order.push("review");
		});
		render(<Review model={model({ carryovers: [], onPersistDraft, onSave })} />);
		fireEvent.change(screen.getByLabelText(/次の7日間で重視すること/u), {
			target: { value: "次週の計画を固める" },
		});
		fireEvent.click(screen.getByRole("button", { name: "保存して今日へ" }));
		await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
		expect(onPersistDraft).toHaveBeenCalledWith(
			expect.objectContaining({ next: "次週の計画を固める" }),
			{},
		);
		expect(order).toEqual(["draft", "review"]);
	});

	it("確定前の下書き同期に失敗したら振り返りを保存しない", async () => {
		const onPersistDraft = vi.fn().mockRejectedValue(new Error("設定保存失敗"));
		const onSave = vi.fn();
		render(<Review model={model({ carryovers: [], onPersistDraft, onSave })} />);
		fireEvent.change(screen.getByLabelText(/次の7日間で重視すること/u), {
			target: { value: "同期を確認する" },
		});
		fireEvent.click(screen.getByRole("button", { name: "保存して今日へ" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("下書きを保存できなかったため");
		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByLabelText(/次の7日間で重視すること/u)).toHaveValue("同期を確認する");
	});

	it("保存失敗を表示し、内容を保持したまま再試行できる", async () => {
		const onSave = vi
			.fn()
			.mockRejectedValueOnce(new Error("設定を書き込めなかった"))
			.mockResolvedValueOnce(undefined);
		const value = model({ carryovers: [], onSave });
		render(<Review model={value} />);
		fireEvent.change(screen.getByLabelText("学んだこと"), { target: { value: "再試行する" } });
		fireEvent.change(screen.getByLabelText(/次の7日間で重視すること/u), {
			target: { value: "再試行手順を整える" },
		});
		fireEvent.click(screen.getByRole("button", { name: "保存して今日へ" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("設定を書き込めなかった");
		expect(screen.getByLabelText("学んだこと")).toHaveValue("再試行する");
		fireEvent.click(screen.getByRole("button", { name: "保存して今日へ" }));
		await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("入力した下書きを遅延保存し、保存済みを示す", async () => {
		const onPersistDraft = vi.fn().mockResolvedValue(undefined);
		render(<Review model={model({ carryovers: [], onPersistDraft })} />);
		fireEvent.change(screen.getByLabelText("学んだこと"), {
			target: { value: "中断前に保存する" },
		});
		expect(screen.getByRole("status")).toHaveTextContent("下書きの保存待ち");
		await waitFor(
			() =>
				expect(onPersistDraft).toHaveBeenCalledWith(
					expect.objectContaining({ lessons: "中断前に保存する" }),
					{},
				),
			{ timeout: 1200 },
		);
		expect(screen.getByRole("status")).toHaveTextContent("下書き保存済み");
	});

	it("下書き保存失敗を示し、手動で再試行できる", async () => {
		const onPersistDraft = vi
			.fn()
			.mockRejectedValueOnce(new Error("保存失敗"))
			.mockResolvedValueOnce(undefined);
		render(<Review model={model({ carryovers: [], onPersistDraft })} />);
		fireEvent.change(screen.getByLabelText("学んだこと"), { target: { value: "再試行する" } });
		expect(
			await screen.findByText("下書きを保存できなかった", {}, { timeout: 1200 }),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "再試行" }));
		await waitFor(() => expect(onPersistDraft).toHaveBeenCalledTimes(2));
		expect(screen.getByRole("status")).toHaveTextContent("下書き保存済み");
	});

	it("実績・集中・持ち越しがない空状態を示す", () => {
		render(<Review model={model({ achievements: [], focus: [], carryovers: [] })} />);
		expect(screen.getByText("完了したタスクはまだない。")).toBeInTheDocument();
		expect(screen.getByText("集中セッションの記録はまだない。")).toBeInTheDocument();
		expect(screen.getByText("時間割または期限から持ち越すタスクはない。")).toBeInTheDocument();
	});

	it("過去の振り返りを折りたたみ履歴から開ける", () => {
		const onOpen = vi.fn();
		render(
			<Review
				model={model({
					history: [
						{ path: "private/reviews/2026-10-09.md", label: "2026-10-09", onOpen },
						{ path: "private/reviews/2026-10-02.md", label: "2026-10-02", onOpen: vi.fn() },
					],
				})}
			/>,
		);
		const history = screen.getByText("過去の振り返り").closest("details");
		expect(history).not.toHaveAttribute("open");
		expect(history).toHaveTextContent("2件");
		fireEvent.click(screen.getByRole("button", { name: "2026-10-09" }));
		expect(onOpen).toHaveBeenCalledOnce();
		expect(screen.getByRole("button", { name: "2026-10-09" })).toHaveClass("max-[620px]:min-h-11");
	});

	it("計画実行を含む4指標を狭幅では2列で表示する", () => {
		const value = model({
			summary: [
				{ label: "完了", value: "3件" },
				{ label: "計画実行", value: "2/3件" },
				{ label: "集中", value: "90分" },
				{ label: "継続中", value: "2件" },
			],
		});
		const { container } = render(<Review model={value} />);
		expect(screen.getByText("計画実行")).toBeInTheDocument();
		expect(screen.getByText("2/3件")).toBeInTheDocument();
		expect(container.querySelector(".grid-cols-2")).toHaveClass("min-[721px]:grid-cols-4");
	});

	it("前回の振り返り指標との差を判断材料として表示する", () => {
		render(
			<Review
				model={model({
					summary: [
						{ label: "完了", value: "3件", comparison: "前回 2件 · +1件" },
						{ label: "計画実行", value: "2/3件", comparison: "前回 25% · +42pt" },
						{ label: "集中", value: "90分", comparison: "前回 120分 · -30分" },
					],
				})}
			/>,
		);
		expect(screen.getByText("前回 2件 · +1件")).toBeInTheDocument();
		expect(screen.getByText("前回 25% · +42pt")).toBeInTheDocument();
		expect(screen.getByText("前回 120分 · -30分")).toBeInTheDocument();
	});

	it("前回の重点を表示し、時間割へ送れる", () => {
		const value = model({
			previousFocus: {
				date: "2026-10-02",
				items: focusItems("配布を安定させる", "レビューを返す"),
			},
		});
		render(<Review model={value} />);
		expect(screen.getByRole("heading", { name: "前回から引き継ぐ重点" })).toBeInTheDocument();
		expect(screen.getByText("配布を安定させる")).toBeInTheDocument();
		expect(screen.getByText("2026-10-02")).toBeInTheDocument();
		fireEvent.click(screen.getAllByRole("button", { name: "時間割へ" })[0]);
		expect(value.onPlanPreviousFocus).toHaveBeenCalledWith("配布を安定させる");
	});

	it("前回重点の完了・時間割済み・未配置を区別し、完了は再作成しない", () => {
		const value = model({
			previousFocus: {
				date: "2026-10-02",
				items: [
					{ title: "完了した重点", label: "完了", action: null },
					{ title: "予定済みの重点", label: "時間割済み", action: "open" },
					{ title: "未配置の重点", label: "未配置", action: "plan" },
				],
			},
		});
		render(<Review model={value} />);
		expect(screen.getByText("完了した重点").closest("li")).toHaveTextContent("完了");
		expect(screen.getByRole("button", { name: "時間割を見る" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "時間割へ" })).toBeInTheDocument();
		expect(screen.getByText("完了した重点").closest("li")?.querySelector("button")).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "時間割を見る" }));
		expect(value.onPlanPreviousFocus).toHaveBeenCalledWith("予定済みの重点");
	});

	it("前回重点の計画中は重複操作を止め、失敗後に再試行できる", async () => {
		let reject: (error: Error) => void = () => undefined;
		const onPlanPreviousFocus = vi.fn(
			() =>
				new Promise<void>((_resolve, rejectPromise) => {
					reject = rejectPromise;
				}),
		);
		render(
			<Review
				model={model({
					previousFocus: {
						date: "2026-10-02",
						items: focusItems("配布を安定させる", "レビューを返す"),
					},
					onPlanPreviousFocus,
				})}
			/>,
		);
		fireEvent.click(screen.getAllByRole("button", { name: "時間割へ" })[0]);
		expect(screen.getByRole("button", { name: "移動中…" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "時間割へ" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "移動中…" }));
		expect(onPlanPreviousFocus).toHaveBeenCalledOnce();
		reject(new Error("Inboxへタスクを作成できなかった"));
		expect(await screen.findByRole("alert")).toHaveTextContent("Inboxへタスクを作成できなかった");
		await waitFor(() =>
			expect(screen.getAllByRole("button", { name: "時間割へ" })[0]).toBeEnabled(),
		);
		fireEvent.click(screen.getAllByRole("button", { name: "時間割へ" })[0]);
		expect(onPlanPreviousFocus).toHaveBeenCalledTimes(2);
	});

	it("次週の重点が4件以上なら保存を止める", () => {
		const value = model({ carryovers: [] });
		render(<Review model={value} />);
		fireEvent.change(screen.getByLabelText(/次の7日間で重視すること/u), {
			target: { value: "一\n二\n三\n四" },
		});
		expect(screen.getByRole("alert")).toHaveTextContent("重点は3件までに絞る");
		expect(screen.getAllByText("重点は3件までに絞る")).toHaveLength(2);
		expect(screen.queryByText("記録の準備ができた")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "保存して今日へ" })).toBeDisabled();
	});

	it("次週の重点が空なら保存を止め、次の行動を示す", () => {
		render(<Review model={model({ carryovers: [] })} />);
		expect(screen.getByText("次の7日間の重点を1件以上決める")).toBeInTheDocument();
		expect(screen.getByText("1行に1件、最大3件")).toBeInTheDocument();
		const save = screen.getByRole("button", { name: "保存して今日へ" });
		expect(save).toBeDisabled();
		expect(save).toHaveClass(
			"disabled:!bg-ttd-surface",
			"disabled:!text-ttd-muted",
			"disabled:!opacity-100",
		);
	});

	it("重複する次週重点は1件として数える", () => {
		const value = model({ carryovers: [] });
		render(<Review model={value} />);
		fireEvent.change(screen.getByLabelText(/次の7日間で重視すること/u), {
			target: { value: "一\n二\n一\n三" },
		});
		expect(screen.getByText(/3\/3/u)).toBeInTheDocument();
		expect(screen.queryByText("重点は3件までに絞る")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "保存して今日へ" })).toBeEnabled();
	});

	it("持ち越し理由が未選択なら保存を止める", () => {
		render(<Review model={model()} />);
		expect(screen.getByRole("button", { name: "保存して今日へ" })).toBeDisabled();
	});

	it("狭い画面では計画・判断・保存操作を十分なタップ領域にする", () => {
		const { container } = render(
			<Review
				model={model({
					previousFocus: { date: "2026-10-02", items: focusItems("配布を安定させる") },
				})}
			/>,
		);
		expect(container.querySelector("[data-mobile-safe-area='review-action']")).toHaveClass(
			"max-[620px]:static",
			"max-[620px]:grid-cols-[minmax(0,1fr)]",
			"max-[620px]:pb-[calc(8px+env(safe-area-inset-bottom,0px))]",
		);
		expect(screen.getByRole("button", { name: "時間割へ" })).toHaveClass("max-[620px]:min-h-11");
		expect(screen.getByLabelText("レビューを返すの持ち越し理由")).toHaveClass(
			"max-[620px]:min-h-11",
		);
		expect(screen.getByRole("button", { name: "保存して今日へ" })).toHaveClass(
			"max-[620px]:min-h-11",
			"max-[620px]:!min-w-full",
			"max-[620px]:!w-full",
		);
	});
});
