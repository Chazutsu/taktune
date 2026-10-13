import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardSidebar, type SidebarModel } from "../src/ui/dashboard-sidebar";

function model(overrides: Partial<SidebarModel> = {}): SidebarModel {
	return {
		activeId: "today",
		open: true,
		incompleteCount: 3,
		primary: [{ id: "today", icon: "sun", label: "今日", count: 1 }],
		statuses: [{ id: "status:todo", icon: "circle", label: "未着手", count: 2 }],
		planning: [],
		tools: [],
		savedFilters: [],
		lists: [
			{
				id: "list:仕事",
				icon: "list",
				label: "仕事",
				count: 2,
				color: "#7693e8",
				fullLabel: "仕事",
				group: "",
				value: "仕事",
			},
		],
		tags: [
			{
				id: "tag:確認",
				icon: "tag",
				label: "#確認",
				count: 1,
				color: "#5aa38b",
				fullLabel: "確認",
				group: "",
				value: "確認",
			},
		],
		expandedSections: {
			statuses: false,
			planning: false,
			tools: false,
			filters: false,
			lists: false,
			tags: false,
		},
		onClose: vi.fn(),
		onSelect: vi.fn(),
		onAddSavedFilter: vi.fn(),
		onEditSavedFilter: vi.fn(),
		onAddTaxonomy: vi.fn(),
		onEditTaxonomy: vi.fn(),
		onReorderTaxonomy: vi.fn(),
		onToggleSection: vi.fn(),
		...overrides,
	};
}

function useMobileViewport(): void {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockReturnValue({
			matches: true,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}),
	);
}

afterEach(() => vi.unstubAllGlobals());

describe("DashboardSidebar", () => {
	it("モバイルで主要操作を押しやすくし、分類編集をホバーへ依存させない", () => {
		const { container } = render(<DashboardSidebar model={model()} />);
		expect(container.querySelector("[data-mobile-safe-area='navigation']")).toHaveClass(
			"max-[720px]:pb-[calc(8px+env(safe-area-inset-bottom,0px))]",
			"max-[720px]:pt-[calc(8px+env(safe-area-inset-top,0px))]",
		);
		expect(screen.getByRole("button", { name: "今日、1件" })).toHaveClass("max-[720px]:min-h-11");
		expect(screen.getByText("絞り込み").closest("summary")).toHaveClass("max-[720px]:min-h-11");
		expect(screen.getByRole("button", { name: "リストを作成" })).toHaveClass("max-[720px]:size-11");
		expect(screen.getByLabelText("仕事の操作")).toHaveClass(
			"max-[720px]:size-11",
			"max-[720px]:opacity-100",
		);
		expect(screen.getByLabelText("確認の操作")).toHaveClass(
			"max-[720px]:size-11",
			"max-[720px]:opacity-100",
		);
	});

	it("分類をキーボードで上下移動し、境界を無効化して操作ボタンへフォーカスを戻す", async () => {
		const onReorderTaxonomy = vi.fn(async () => undefined);
		render(
			<DashboardSidebar
				model={model({
					lists: [
						{
							id: "list:仕事",
							icon: "list",
							label: "仕事",
							count: 2,
							color: "#7693e8",
							fullLabel: "仕事",
							group: "",
							value: "仕事",
						},
						{
							id: "list:個人",
							icon: "list",
							label: "個人",
							count: 1,
							color: "#5aa38b",
							fullLabel: "個人",
							group: "",
							value: "個人",
						},
					],
					onReorderTaxonomy,
				})}
			/>,
		);
		fireEvent.click(screen.getByLabelText("仕事の操作"));
		expect(screen.getByRole("menuitem", { name: "仕事を上へ移動" })).toBeDisabled();
		fireEvent.click(screen.getByRole("menuitem", { name: "仕事を下へ移動" }));
		await waitFor(() => expect(onReorderTaxonomy).toHaveBeenCalledWith("list", "個人", "仕事"));
		await waitFor(() => expect(screen.getByLabelText("仕事の操作")).toHaveFocus());
		fireEvent.click(screen.getByLabelText("個人の操作"));
		expect(screen.getByRole("menuitem", { name: "個人を下へ移動" })).toBeDisabled();
	});

	it("複数ペインでは分類操作元のSidebarへfocusを戻す", async () => {
		const lists = [
			{
				id: "list:仕事",
				icon: "list",
				label: "仕事",
				count: 2,
				color: "#7693e8",
				fullLabel: "仕事",
				group: "",
				value: "仕事",
			},
			{
				id: "list:個人",
				icon: "list",
				label: "個人",
				count: 1,
				color: "#5aa38b",
				fullLabel: "個人",
				group: "",
				value: "個人",
			},
		];
		render(
			<>
				<DashboardSidebar model={model({ lists })} />
				<DashboardSidebar model={model({ lists })} />
			</>,
		);
		const workActions = screen.getAllByLabelText("仕事の操作");
		fireEvent.click(workActions[1]!);
		fireEvent.click(screen.getByRole("menuitem", { name: "仕事を下へ移動" }));
		await waitFor(() => expect(workActions[1]).toHaveFocus());
	});

	it("分類操作メニューを開くと先頭操作へ移動し、Escapeでトリガーへ戻す", async () => {
		render(<DashboardSidebar model={model()} />);
		const trigger = screen.getByLabelText("仕事の操作");
		fireEvent.click(trigger);
		await waitFor(() => expect(screen.getByRole("menuitem", { name: "仕事を編集" })).toHaveFocus());
		fireEvent.keyDown(document, { key: "Escape" });
		await waitFor(() => expect(trigger).toHaveFocus());
		expect(trigger).toHaveAttribute("aria-expanded", "false");
	});

	it("モバイルでは背景とEscapeで閉じる", () => {
		useMobileViewport();
		const value = model();
		const { container } = render(<DashboardSidebar model={value} />);
		expect(screen.getByRole("dialog", { name: "タスクのナビゲーション" })).toHaveAttribute(
			"aria-modal",
			"true",
		);
		fireEvent.click(container.querySelector("[data-sidebar-backdrop]") as HTMLElement);
		expect(value.onClose).toHaveBeenCalledOnce();
		fireEvent.keyDown(document, { key: "Escape" });
		expect(value.onClose).toHaveBeenCalledTimes(2);
	});

	it("モバイルで開くと閉じるボタンへフォーカスし、閉じるとトリガーへ戻す", async () => {
		useMobileViewport();
		const value = model({ open: false });
		const { rerender } = render(
			<>
				<button type="button">ナビゲーション起動</button>
				<DashboardSidebar model={value} />
			</>,
		);
		const trigger = screen.getByRole("button", { name: "ナビゲーション起動" });
		trigger.focus();
		rerender(
			<>
				<button type="button">ナビゲーション起動</button>
				<DashboardSidebar model={{ ...value, open: true }} />
			</>,
		);
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "ナビゲーションを閉じる" })).toHaveFocus(),
		);
		rerender(
			<>
				<button type="button">ナビゲーション起動</button>
				<DashboardSidebar model={value} />
			</>,
		);
		await waitFor(() => expect(trigger).toHaveFocus());
	});

	it("モバイルで開いている間は背景操作を抑止する", async () => {
		useMobileViewport();
		const { container } = render(
			<div>
				<DashboardSidebar model={model()} />
				<main data-background-content>
					<button type="button">背景操作</button>
				</main>
			</div>,
		);
		const background = container.querySelector("[data-background-content]");
		await waitFor(() => expect(background).toHaveAttribute("inert"));
		expect(background).toHaveAttribute("aria-hidden", "true");
	});

	it("開いたままモバイル幅へ変わるとdialogへフォーカスし、デスクトップ幅へ戻ると復帰する", async () => {
		let mobile = false;
		let onChange = () => undefined;
		const query = {
			get matches() {
				return mobile;
			},
			addEventListener: vi.fn((_event: string, listener: () => void) => {
				onChange = listener;
			}),
			removeEventListener: vi.fn(),
		};
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => query),
		);
		render(
			<>
				<button type="button">背景の起動ボタン</button>
				<DashboardSidebar model={model()} />
			</>,
		);
		const trigger = screen.getByRole("button", { name: "背景の起動ボタン" });
		trigger.focus();

		mobile = true;
		onChange();
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "ナビゲーションを閉じる" })).toHaveFocus(),
		);

		mobile = false;
		onChange();
		await waitFor(() => expect(trigger).toHaveFocus());
	});

	it("件数ではない指標は正しい単位で表示・読み上げる", () => {
		render(
			<DashboardSidebar
				model={model({
					tools: [
						{ id: "focus", icon: "timer", label: "フォーカス", count: 75, countLabel: "75分" },
					],
				})}
			/>,
		);
		const focus = screen.getByRole("button", { name: "フォーカス、75分" });
		expect(focus).toHaveTextContent("フォーカス75分");
		expect(screen.queryByRole("button", { name: "フォーカス、75件" })).not.toBeInTheDocument();
	});

	it("セクション開閉をモデルへ保存し、再表示時の状態を復元する", async () => {
		const value = model({
			expandedSections: {
				statuses: false,
				planning: false,
				tools: true,
				filters: false,
				lists: false,
				tags: false,
			},
		});
		render(<DashboardSidebar model={value} />);
		const organizeSummary = screen.getByLabelText("整理を閉じる");
		expect(organizeSummary.closest("details")).toHaveAttribute("open");
		expect(screen.getByLabelText("履歴を閉じる").closest("details")).toHaveAttribute("open");
		fireEvent.click(organizeSummary);
		await waitFor(() => expect(value.onToggleSection).toHaveBeenCalledWith("organize", false));
		expect(await screen.findByLabelText("整理を開く")).toBeInTheDocument();
	});

	it("非active時の選好を維持し、activeへ変わった時だけ現在地を自動展開する", async () => {
		const base = model({
			planning: [{ id: "calendar", icon: "calendar", label: "時間割", count: 0 }],
		});
		const view = render(<DashboardSidebar model={base} />);
		const planning = screen.getByLabelText("計画を開く").closest("details");
		expect(planning).not.toHaveAttribute("open");
		view.rerender(<DashboardSidebar model={{ ...base, activeId: "calendar" }} />);
		await waitFor(() =>
			expect(screen.getByLabelText("計画を閉じる").closest("details")).toHaveAttribute("open"),
		);
		view.rerender(<DashboardSidebar model={{ ...base, activeId: "today" }} />);
		expect(screen.getByLabelText("計画を開く").closest("details")).not.toHaveAttribute("open");
	});

	it("主要導線を8件以下に絞り、目的別の一段セクションへ再編する", () => {
		const { container } = render(
			<DashboardSidebar
				model={model({
					primary: [
						{ id: "today", icon: "sun", label: "今日", count: 1 },
						{ id: "inbox", icon: "inbox", label: "受信箱", count: 2 },
						{ id: "next", icon: "calendar-days", label: "次の7日", count: 3 },
						{ id: "overdue", icon: "circle-alert", label: "期限切れ", count: 1 },
						{ id: "focus", icon: "timer", label: "フォーカス", count: 25, countLabel: "25分" },
					],
					expandedSections: {},
				})}
			/>,
		);
		const navigation = container.querySelector("nav");
		expect(navigation?.querySelectorAll(":scope > button").length).toBeLessThanOrEqual(8);
		expect(screen.getByText("行動")).toBeInTheDocument();
		for (const label of ["計画", "整理", "履歴", "絞り込み"]) {
			expect(screen.getByLabelText(`${label}を開く`).closest("details")).not.toHaveAttribute(
				"open",
			);
		}
		expect(navigation?.querySelectorAll(":scope > details")).toHaveLength(4);
	});
});
