import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	ExternalIssues,
	type ExternalIssueModel,
	type ExternalIssuesModel,
} from "../src/ui/external-issues";

function item(overrides: Partial<ExternalIssueModel> = {}): ExternalIssueModel {
	return {
		externalId: "linear:1",
		title: "認証処理を直す",
		meta: "PPR-1 · Open",
		labels: ["backend"],
		icon: "circle-dot",
		sourceLabel: "Linear",
		url: "https://linear.app/example",
		state: null,
		onImport: vi.fn(),
		onImportAndPlan: vi.fn(),
		onDismiss: vi.fn(),
		...overrides,
	};
}

function model(overrides: Partial<ExternalIssuesModel> = {}): ExternalIssuesModel {
	return {
		errors: [],
		sources: [
			{ label: "Linear", count: 1 },
			{ label: "Jira", count: 0 },
			{ label: "Slack", count: 0 },
		],
		labels: ["backend"],
		activeLabel: "",
		showHandled: false,
		items: [item()],
		onSelectLabel: vi.fn(),
		onToggleHandled: vi.fn(),
		...overrides,
	};
}

describe("ExternalIssues", () => {
	it("連携元、ラベル、候補を識別して表示する", () => {
		render(<ExternalIssues model={model()} />);
		expect(screen.getAllByText("Linear")[0].parentElement).toHaveTextContent("1");
		expect(screen.getByRole("button", { name: "backend" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Linearで開く" })).toHaveAttribute(
			"href",
			"https://linear.app/example",
		);
	});
	it("ラベル、処理済み表示、時間割、タスク化、除外をモデルへ伝える", async () => {
		const value = model();
		render(<ExternalIssues model={value} />);
		fireEvent.click(screen.getByRole("button", { name: "backend" }));
		fireEvent.click(screen.getByRole("button", { name: "処理済みも表示" }));
		fireEvent.click(screen.getByRole("button", { name: "時間割へ" }));
		await waitFor(() => expect(value.items[0].onImportAndPlan).toHaveBeenCalledOnce());
		fireEvent.click(screen.getByRole("button", { name: "タスク化" }));
		await waitFor(() => expect(screen.getByRole("button", { name: "候補から外す" })).toBeEnabled());
		fireEvent.click(screen.getByRole("button", { name: "候補から外す" }));
		expect(value.onSelectLabel).toHaveBeenCalledWith("backend");
		expect(value.onToggleHandled).toHaveBeenCalledOnce();
		expect(value.items[0].onImport).toHaveBeenCalledOnce();
		expect(value.items[0].onDismiss).toHaveBeenCalledOnce();
	});
	it("処理状態と連携エラーを明示する", () => {
		render(
			<ExternalIssues
				model={model({ errors: ["Linear: 認証が必要"], items: [item({ state: "imported" })] })}
			/>,
		);
		expect(screen.getByRole("alert")).toHaveTextContent("認証が必要");
		expect(screen.getByText("タスク化済み")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "タスク化" })).not.toBeInTheDocument();
	});
	it("タスク化済みの候補から時間割へ戻れる", () => {
		const onPlan = vi.fn();
		render(<ExternalIssues model={model({ items: [item({ state: "imported", onPlan })] })} />);
		fireEvent.click(screen.getByRole("button", { name: "時間割へ" }));
		expect(onPlan).toHaveBeenCalledOnce();
	});
	it("空状態はエラー有無で次の行動を変える", () => {
		const { rerender } = render(<ExternalIssues model={model({ items: [] })} />);
		expect(screen.getByText("判断待ちの項目はない")).toBeInTheDocument();
		rerender(<ExternalIssues model={model({ items: [], errors: ["Jira: 接続失敗"] })} />);
		expect(screen.getByText("連携結果を取得できない")).toBeInTheDocument();
	});
	it("処理中は重複操作を止め、失敗理由を示す", async () => {
		let reject: (error: Error) => void = () => undefined;
		const onImport = vi.fn(
			() =>
				new Promise<void>((_resolve, rejectPromise) => {
					reject = rejectPromise;
				}),
		);
		render(<ExternalIssues model={model({ items: [item({ onImport })] })} />);
		fireEvent.click(screen.getByRole("button", { name: "タスク化" }));
		expect(screen.getByRole("button", { name: "追加中…" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "候補から外す" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "追加中…" }));
		expect(onImport).toHaveBeenCalledOnce();
		reject(new Error("設定を保存できなかった"));
		expect(await screen.findByRole("alert")).toHaveTextContent("設定を保存できなかった");
		expect(screen.getByRole("button", { name: "タスク化" })).toBeEnabled();
	});
	it("狭い画面では絞り込みと候補操作を押しやすくする", () => {
		render(<ExternalIssues model={model()} />);
		expect(screen.getByRole("button", { name: "backend" })).toHaveClass("max-[640px]:min-h-11");
		expect(screen.getByRole("button", { name: "時間割へ" })).toHaveClass("max-[640px]:min-h-11");
		expect(screen.getByRole("button", { name: "タスク化" })).toHaveClass("max-[640px]:min-h-11");
		expect(screen.getByRole("button", { name: "候補から外す" })).toHaveClass(
			"max-[640px]:min-h-11",
		);
		expect(screen.getByRole("link", { name: "Linearで開く" })).toHaveClass("max-[640px]:size-11");
	});
});
