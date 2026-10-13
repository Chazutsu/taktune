import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InboxTriage, type InboxCandidate, type InboxTriageModel } from "../src/ui/inbox-triage";

function candidate(index: number): InboxCandidate {
	return {
		externalId: `linear:PPR-${index}`,
		icon: "square-kanban",
		labels: ["source:linear"],
		meta: `進行中 · PPR-${index}`,
		sourceLabel: "Linear",
		title: `候補 ${index}`,
		url: `https://linear.example/PPR-${index}`,
	};
}

function model(overrides: Partial<InboxTriageModel> = {}): InboxTriageModel {
	return {
		items: [],
		total: 0,
		unplannedCount: 0,
		errors: [],
		onImport: vi.fn(),
		onImportAndPlan: vi.fn(),
		onDismiss: vi.fn(),
		onShowAll: vi.fn(),
		onOpenPlanner: vi.fn(),
		...overrides,
	};
}

function openCandidateMenu(title = "候補 1"): void {
	fireEvent.click(screen.getByRole("button", { name: `${title}のその他の操作` }));
}

describe("InboxTriage", () => {
	it("未処理がない時は未配置件数を示して時間割へ進める", () => {
		const value = model({ unplannedCount: 3 });
		render(<InboxTriage model={value} />);
		expect(screen.getByText("未処理の候補はない")).toBeInTheDocument();
		expect(screen.getByText("未配置タスク3件の期限と時間を決める。")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "時間割を開く" }));
		expect(value.onOpenPlanner).toHaveBeenCalledOnce();
	});

	it("時間割への遷移中は重複操作を止め、失敗後に再試行できる", async () => {
		let reject: (error: Error) => void = () => undefined;
		const onOpenPlanner = vi.fn(
			() =>
				new Promise<void>((_resolve, rejectPromise) => {
					reject = rejectPromise;
				}),
		);
		render(<InboxTriage model={model({ onOpenPlanner })} />);
		fireEvent.click(screen.getByRole("button", { name: "時間割を開く" }));
		expect(screen.getByRole("button", { name: "移動中…" })).toBeDisabled();
		reject(new Error("時間割の描画に失敗した"));
		expect(await screen.findByRole("alert")).toHaveTextContent("時間割の描画に失敗した");
		expect(screen.getByRole("button", { name: "時間割を開く" })).toBeEnabled();
	});

	it("候補をタスク化、時間割へ送る、または候補から外せる", async () => {
		const item = candidate(1);
		const importModel = model({ items: [item], total: 1 });
		const importView = render(<InboxTriage model={importModel} />);
		openCandidateMenu();
		fireEvent.click(screen.getByRole("menuitem", { name: "タスク化" }));
		await waitFor(() => expect(importModel.onImport).toHaveBeenCalledWith(item));
		importView.unmount();
		const planModel = model({ items: [item], total: 1 });
		const planView = render(<InboxTriage model={planModel} />);
		fireEvent.click(screen.getByRole("button", { name: "時間割へ" }));
		await waitFor(() => expect(planModel.onImportAndPlan).toHaveBeenCalledWith(item));
		planView.unmount();
		const dismissModel = model({ items: [item], total: 1 });
		render(<InboxTriage model={dismissModel} />);
		openCandidateMenu();
		fireEvent.click(screen.getByRole("menuitem", { name: "候補から外す" }));
		await waitFor(() => expect(dismissModel.onDismiss).toHaveBeenCalledWith(item));
		openCandidateMenu();
		expect(screen.getByRole("menuitem", { name: "Linearで開く" })).toBeInTheDocument();
	});

	it("処理中は重複操作を止め、失敗後は理由を示して再試行できる", async () => {
		let reject: (error: Error) => void = () => undefined;
		const onImportAndPlan = vi.fn(
			() =>
				new Promise<void>((_resolve, rejectPromise) => {
					reject = rejectPromise;
				}),
		);
		render(<InboxTriage model={model({ items: [candidate(1)], total: 1, onImportAndPlan })} />);
		openCandidateMenu();
		fireEvent.click(screen.getByRole("button", { name: "時間割へ" }));
		expect(screen.getByRole("button", { name: "移動中…" })).toBeDisabled();
		expect(screen.getByRole("menuitem", { name: "タスク化" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "移動中…" }));
		expect(onImportAndPlan).toHaveBeenCalledOnce();
		reject(new Error("Inboxへ保存できなかった"));
		expect(await screen.findByRole("alert")).toHaveTextContent("Inboxへ保存できなかった");
		expect(screen.getByRole("button", { name: "時間割へ" })).toBeEnabled();
	});

	it("主操作だけを常設し、副操作を押しやすいメニューへまとめる", () => {
		render(<InboxTriage model={model({ items: [candidate(1)], total: 1 })} />);
		expect(screen.getByText("候補 1")).toHaveClass(
			"max-[620px]:line-clamp-2",
			"min-[621px]:truncate",
		);
		expect(screen.getByLabelText("候補の操作")).toHaveClass("flex");
		expect(screen.getByRole("button", { name: "時間割へ" })).toHaveClass("max-[620px]:min-h-11");
		expect(screen.getByRole("button", { name: "候補 1のその他の操作" })).toHaveAttribute(
			"aria-expanded",
			"false",
		);
		openCandidateMenu();
		expect(screen.getByRole("menuitem", { name: "タスク化" })).toHaveClass("max-[720px]:min-h-11");
		expect(screen.getByRole("menuitem", { name: "Linearで開く" })).toHaveClass(
			"max-[720px]:min-h-11",
		);
	});

	it("空状態の時間割CTAもモバイル幅で押しやすい", () => {
		render(<InboxTriage model={model()} />);
		expect(screen.getByRole("button", { name: "時間割を開く" })).toHaveClass(
			"max-[620px]:min-h-11",
			"max-[620px]:w-full",
		);
	});

	it("表示上限を超える候補は全件画面へ移動できる", () => {
		const value = model({ items: [candidate(1)], total: 6 });
		render(<InboxTriage model={value} />);
		fireEvent.click(screen.getByRole("button", { name: "すべて見る（6）" }));
		expect(value.onShowAll).toHaveBeenCalledOnce();
	});

	it("連携失敗を操作可能な画面内で通知する", () => {
		render(<InboxTriage model={model({ errors: ["Linearの取得に失敗"] })} />);
		expect(screen.getByRole("alert")).toHaveTextContent("Linearの取得に失敗");
	});
});
