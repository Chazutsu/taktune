import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Stats, type StatsModel } from "../src/ui/stats";

function model(overrides: Partial<StatsModel> = {}): StatsModel {
	return {
		summary: [
			{ icon: "circle-check-big", label: "直近7日の完了", value: "5件" },
			{ icon: "calendar-check", label: "直近7日の計画実行", value: "3/4件" },
			{ icon: "timer", label: "直近7日の集中", value: "120分" },
			{ icon: "flame", label: "直近7日の習慣達成率", value: "80%" },
		],
		completionDays: Array.from({ length: 14 }, (_, index) => ({
			count: index === 13 ? 3 : index === 6 ? 1 : 0,
			date: `2026-10-${String(index + 1).padStart(2, "0")}`,
			label: String(index + 1).padStart(2, "0"),
		})),
		priorities: [
			{ label: "高", count: 2 },
			{ label: "通常", count: 1 },
		],
		lists: [
			{ label: "仕事", count: 2 },
			{ label: "Inbox", count: 1 },
		],
		openCount: 3,
		overdueCount: 1,
		onOpenReview: vi.fn(),
		...overrides,
	};
}

describe("Stats", () => {
	it("直近7日の概要、14日推移、未完了の偏りを表示する", () => {
		render(<Stats model={model()} />);
		expect(screen.getByLabelText("直近7日の実績概要")).toHaveTextContent("120分");
		expect(screen.getByLabelText("直近7日の実績概要")).toHaveTextContent("計画実行3/4件");
		expect(screen.getByLabelText("直近7日の実績概要")).toHaveClass(
			"grid-cols-4",
			"max-[800px]:grid-cols-2",
		);
		expect(screen.getByRole("img", { name: "14日間で4件完了" })).toBeInTheDocument();
		expect(screen.getByText("前週比").parentElement).toHaveTextContent("+2件");
		expect(screen.getByText("未完了の優先度").parentElement).toHaveTextContent("高2");
		expect(screen.getByText("未完了のリスト").parentElement).toHaveTextContent("仕事2");
	});

	it("期限超過を次の判断として示し振り返りへ遷移する", () => {
		const value = model();
		const { container } = render(<Stats model={value} />);
		expect(container.querySelector("[data-stats-analysis]")).toHaveClass(
			"min-[721px]:grid-cols-2",
			"min-[900px]:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)_minmax(220px,1fr)]",
		);
		expect(screen.getByRole("img", { name: "14日間で4件完了" })).toHaveClass(
			"h-28",
			"max-[620px]:h-24",
		);
		expect(screen.getByText(/期限超過が1件/)).toBeInTheDocument();
		const action = screen.getByRole("button", { name: "振り返りを始める" });
		expect(action).toHaveClass("max-[620px]:min-h-11", "max-[620px]:w-full");
		fireEvent.click(action);
		expect(value.onOpenReview).toHaveBeenCalledOnce();
	});

	it("振り返りへの移動中は重複操作を止め、失敗後に再試行できる", async () => {
		let reject: (error: Error) => void = () => undefined;
		const onOpenReview = vi.fn(
			() =>
				new Promise<void>((_resolve, rejectPromise) => {
					reject = rejectPromise;
				}),
		);
		render(<Stats model={model({ onOpenReview })} />);
		fireEvent.click(screen.getByRole("button", { name: "振り返りを始める" }));
		const pending = screen.getByRole("button", { name: "移動中…" });
		expect(pending).toBeDisabled();
		fireEvent.click(pending);
		expect(onOpenReview).toHaveBeenCalledOnce();
		reject(new Error("振り返り画面を描画できなかった"));
		expect(await screen.findByRole("alert")).toHaveTextContent("振り返り画面を描画できなかった");
		const retry = screen.getByRole("button", { name: "振り返りを始める" });
		expect(retry).toBeEnabled();
		fireEvent.click(retry);
		await waitFor(() => expect(onOpenReview).toHaveBeenCalledTimes(2));
	});

	it("未完了ゼロの空状態と再現判断を示す", () => {
		render(<Stats model={model({ priorities: [], lists: [], openCount: 0, overdueCount: 0 })} />);
		expect(screen.getAllByText("未完了タスクはない。")).toHaveLength(2);
		expect(screen.getByText(/うまくいった条件を記録/)).toBeInTheDocument();
	});

	it("チャートと概要の補助情報を11px以上で表示する", () => {
		render(<Stats model={model()} />);
		expect(screen.getByText("直近7日の完了")).toHaveClass("text-[11px]");
		expect(screen.getByText("前週比")).toHaveClass("text-[11px]");
		expect(screen.getByTitle("2026-10-14: 3件").querySelector("small")).toHaveClass("text-[11px]");
	});
});
