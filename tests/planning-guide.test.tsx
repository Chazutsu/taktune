import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanningGuide, type PlanningGuideModel } from "../src/ui/planning-guide";

function model(overrides: Partial<PlanningGuideModel> = {}): PlanningGuideModel {
	return {
		available: true,
		inboxRemaining: 2,
		overdueRemaining: 1,
		unplannedRemaining: 3,
		selectedCount: 0,
		focusCount: 1,
		onNavigate: vi.fn(),
		...overrides,
	};
}

describe("PlanningGuide", () => {
	it("最初の未完了手順から開始して既存画面へ順番に遷移する", () => {
		const value = model({ inboxRemaining: 0 });
		render(<PlanningGuide model={value} />);
		fireEvent.click(screen.getByRole("button", { name: "今日を計画" }));

		expect(value.onNavigate).toHaveBeenLastCalledWith("overdue", 1);
		expect(screen.getByRole("heading", { name: "期限切れを確認" })).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "次へ" }));
		expect(value.onNavigate).toHaveBeenLastCalledWith("calendar", 2);
		expect(screen.getByRole("heading", { name: "未配置タスクを選択" })).toBeInTheDocument();
	});

	it("完了条件、スキップ、任意手順への移動を明示する", () => {
		const value = model({ inboxRemaining: 0 });
		render(<PlanningGuide model={value} />);
		fireEvent.click(screen.getByRole("button", { name: "今日を計画" }));
		fireEvent.click(screen.getByRole("button", { name: "今回はスキップ" }));
		expect(screen.getByRole("heading", { name: "未配置タスクを選択" })).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "手順5/5" }));
		expect(screen.getByRole("button", { name: "手順5/5" })).toHaveClass("max-[620px]:min-h-11");
		expect(value.onNavigate).toHaveBeenLastCalledWith("review", 4);
		expect(
			screen.getByText("現在1/3件。振り返りの「次の7日間」で重点を3件に絞る。"),
		).toBeInTheDocument();
		expect(screen.getByRole("status")).toHaveTextContent("確認後に次へ進める");
	});

	it("選択を観測後、配置で選択が空になると配置手順を完了にする", () => {
		const value = model();
		const view = render(<PlanningGuide model={value} />);
		fireEvent.click(screen.getByRole("button", { name: "今日を計画" }));
		fireEvent.click(screen.getByRole("button", { name: "手順4/5" }));
		view.rerender(<PlanningGuide model={{ ...value, selectedCount: 2 }} />);
		view.rerender(<PlanningGuide model={{ ...value, selectedCount: 0, unplannedRemaining: 1 }} />);
		expect(screen.getByRole("status")).toHaveTextContent("完了条件を満たしている");
	});

	it("閉じたガイドを同じ手順から再開する", () => {
		render(<PlanningGuide model={model()} />);
		fireEvent.click(screen.getByRole("button", { name: "今日を計画" }));
		fireEvent.click(screen.getByRole("button", { name: "手順4/5" }));
		fireEvent.click(screen.getByRole("button", { name: "計画ガイドを閉じる" }));
		fireEvent.click(screen.getByRole("button", { name: "今日を計画" }));
		expect(screen.getByRole("heading", { name: "時間へ配置" })).toBeInTheDocument();
	});

	it("閉じた後も再開導線を残し、mobile操作を44pxにする", () => {
		render(<PlanningGuide model={model()} />);
		const open = screen.getByRole("button", { name: "今日を計画" });
		expect(open).toHaveClass("max-[620px]:min-h-11");
		fireEvent.click(open);
		const close = screen.getByRole("button", { name: "計画ガイドを閉じる" });
		expect(close).toHaveClass("max-[620px]:min-h-11");
		fireEvent.click(close);
		expect(screen.getByRole("button", { name: "今日を計画" })).toBeInTheDocument();
	});
});
