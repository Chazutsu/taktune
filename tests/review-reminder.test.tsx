import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReviewReminder } from "../src/ui/review-reminder";

const focusItems = (...titles: string[]) =>
	titles.map((title) => ({ title, label: "未配置" as const, action: "plan" as const }));

describe("ReviewReminder", () => {
	it("振り返りへ進む", () => {
		const onOpen = vi.fn();
		render(
			<ReviewReminder
				model={{
					detail: "前回から7日。",
					focus: null,
					reviewDue: true,
					onOpen,
					onDismiss: vi.fn(),
					onPlanFocus: vi.fn(),
				}}
			/>,
		);
		expect(screen.getByRole("region", { name: "週次振り返りの案内" })).toHaveTextContent(
			"前回から7日。",
		);
		expect(screen.getByRole("heading", { name: "直近7日を振り返る" })).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "振り返る" }));
		expect(onOpen).toHaveBeenCalledOnce();
	});

	it("次の週まで閉じられ、モバイルでも操作領域を保つ", () => {
		const onDismiss = vi.fn();
		render(
			<ReviewReminder
				model={{
					detail: "最初の振り返り。",
					focus: null,
					reviewDue: true,
					onOpen: vi.fn(),
					onDismiss,
					onPlanFocus: vi.fn(),
				}}
			/>,
		);
		const dismiss = screen.getByRole("button", { name: "次の金曜まで閉じる" });
		expect(dismiss).toHaveClass("max-[620px]:min-h-11");
		expect(screen.getByRole("button", { name: "振り返る" })).toHaveClass("max-[620px]:min-h-11");
		fireEvent.click(dismiss);
		expect(onDismiss).toHaveBeenCalledOnce();
	});

	it("閉じる設定の保存中は重複操作を止め、失敗後に再試行できる", async () => {
		let reject: (error: Error) => void = () => undefined;
		const onDismiss = vi.fn(
			() =>
				new Promise<void>((_resolve, rejectPromise) => {
					reject = rejectPromise;
				}),
		);
		render(
			<ReviewReminder
				model={{
					detail: "前回から7日。",
					focus: null,
					reviewDue: true,
					onOpen: vi.fn(),
					onDismiss,
					onPlanFocus: vi.fn(),
				}}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "次の金曜まで閉じる" }));
		expect(screen.getByRole("button", { name: "保存中…" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "振り返る" })).toBeDisabled();
		reject(new Error("設定を保存できなかった"));
		expect(await screen.findByRole("alert")).toHaveTextContent("設定を保存できなかった");
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "次の金曜まで閉じる" })).toBeEnabled(),
		);
		fireEvent.click(screen.getByRole("button", { name: "次の金曜まで閉じる" }));
		expect(onDismiss).toHaveBeenCalledTimes(2);
	});

	it("振り返り直後も今週の重点を表示して時間割へ送れる", () => {
		const onPlanFocus = vi.fn();
		render(
			<ReviewReminder
				model={{
					detail: "2026-10-09に決めた重点。",
					focus: { date: "2026-10-09", items: focusItems("配布を安定させる", "レビューを返す") },
					reviewDue: false,
					onOpen: vi.fn(),
					onDismiss: vi.fn(),
					onPlanFocus,
				}}
			/>,
		);
		expect(screen.getByRole("region", { name: "次の7日間の重点" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "次の7日間の重点" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "振り返る" })).not.toBeInTheDocument();
		const disclosure = screen.getByText("他の重点 1件を表示");
		expect(disclosure.closest("details")).not.toHaveAttribute("open");
		fireEvent.click(disclosure);
		const plan = screen.getByRole("button", { name: /配布を安定させる/u });
		expect(plan).toHaveClass("max-[620px]:min-h-11");
		fireEvent.click(plan);
		expect(onPlanFocus).toHaveBeenCalledWith("配布を安定させる");
	});

	it("長い重点はモバイルで2行まで表示し、全文を保持する", () => {
		const title = "次回リリースに向けて移行順序とロールバック条件を関係者と確定する";
		render(
			<ReviewReminder
				model={{
					detail: "次の7日間の重点。",
					focus: { date: "2026-10-09", items: focusItems(title) },
					reviewDue: false,
					onOpen: vi.fn(),
					onDismiss: vi.fn(),
					onPlanFocus: vi.fn(),
				}}
			/>,
		);
		const label = screen.getByTitle(title);
		expect(label).toHaveClass(
			"truncate",
			"max-[620px]:line-clamp-2",
			"max-[620px]:whitespace-normal",
		);
		expect(label).toHaveTextContent(title);
	});

	it("今週の重点の進捗を表示し、完了項目は操作不能にする", () => {
		render(
			<ReviewReminder
				model={{
					detail: "次の7日間の重点。",
					focus: {
						date: "2026-10-09",
						items: [
							{ title: "完了した重点", label: "完了", action: null },
							{ title: "予定済みの重点", label: "時間割済み", action: "open" },
						],
					},
					reviewDue: false,
					onOpen: vi.fn(),
					onDismiss: vi.fn(),
					onPlanFocus: vi.fn(),
				}}
			/>,
		);
		fireEvent.click(screen.getByText("他の重点 1件を表示"));
		expect(screen.getByRole("button", { name: /完了した重点/u })).toBeDisabled();
		expect(screen.getByRole("button", { name: /予定済みの重点/u })).toBeEnabled();
		expect(screen.getByText("時間割済み")).toBeInTheDocument();
	});

	it("代表重点は未配置を優先し、残りは保存順を保って段階開示する", () => {
		const { container } = render(
			<ReviewReminder
				model={{
					detail: "次の7日間の重点。",
					focus: {
						date: "2026-10-09",
						items: [
							{ title: "完了A", label: "完了", action: null },
							{ title: "予定済みB", label: "時間割済み", action: "open" },
							{ title: "未配置C", label: "未配置", action: "plan" },
							{ title: "完了D", label: "完了", action: null },
						],
					},
					reviewDue: false,
					onOpen: vi.fn(),
					onDismiss: vi.fn(),
					onPlanFocus: vi.fn(),
				}}
			/>,
		);

		expect(screen.getByRole("button", { name: /未配置C/u })).toBeVisible();
		expect(screen.getByTitle("予定済みB").closest("details")).not.toHaveAttribute("open");
		fireEvent.click(screen.getByText("他の重点 3件を表示"));
		expect(
			Array.from(container.querySelectorAll("button")).map((button) => button.textContent),
		).toEqual(["未配置C未配置", "完了A完了", "予定済みB時間割済み", "完了D完了"]);
	});

	it("重点の移動中は重複操作を止め、失敗後に再試行できる", async () => {
		let reject: (error: Error) => void = () => undefined;
		const onPlanFocus = vi.fn(
			() =>
				new Promise<void>((_resolve, rejectPromise) => {
					reject = rejectPromise;
				}),
		);
		render(
			<ReviewReminder
				model={{
					detail: "次の7日間の重点。",
					focus: { date: "2026-10-09", items: focusItems("配布を安定させる", "レビューを返す") },
					reviewDue: false,
					onOpen: vi.fn(),
					onDismiss: vi.fn(),
					onPlanFocus,
				}}
			/>,
		);
		fireEvent.click(screen.getByText("他の重点 1件を表示"));
		fireEvent.click(screen.getByRole("button", { name: /配布を安定させる/u }));
		expect(screen.getByRole("button", { name: /移動中/u })).toBeDisabled();
		expect(screen.getByRole("button", { name: /レビューを返す/u })).toBeDisabled();
		reject(new Error("タスクを作成できなかった"));
		expect(await screen.findByRole("alert")).toHaveTextContent("タスクを作成できなかった");
		await waitFor(() =>
			expect(screen.getByRole("button", { name: /配布を安定させる/u })).toBeEnabled(),
		);
		fireEvent.click(screen.getByRole("button", { name: /配布を安定させる/u }));
		expect(onPlanFocus).toHaveBeenCalledTimes(2);
	});
});
