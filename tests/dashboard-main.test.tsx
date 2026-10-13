import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardMain } from "../src/ui/dashboard-main";
import type { TaskDetailModel } from "../src/ui/task-detail";
import type { CollectionStatusModel } from "../src/ui/collection-status";

describe("DashboardMain", () => {
	const props = (activeId: string) => ({
		model: {
			activeId,
			primary: [{ id: "today", icon: "sun", label: "今日", count: 3 }],
			sidebarOpen: false,
			screen: { title: "今日", subtitle: "2026-10-09 · 3件" },
			onSelect: vi.fn(),
			onToggleSidebar: vi.fn(),
			onOpenSidebar: vi.fn(),
			planningGuide: {
				available: true,
				inboxRemaining: 2,
				overdueRemaining: 1,
				unplannedRemaining: 3,
				selectedCount: 0,
				focusCount: 1,
				onNavigate: vi.fn(),
			},
		},
		content: document.createElement("div"),
		inbox: null,
		quickAdd: null,
		taskList: null,
		batchActions: null,
		calendarBatchActions: null,
		calendarControls: null,
		planTray: null,
		calendarTimeBlocks: [],
		calendarDayChrome: [],
		calendarMonths: [],
		calendarAgenda: null,
		calendarYear: null,
		review: null,
		reviewReminder: null,
		stats: null,
		focus: null,
		habits: null,
		countdowns: null,
		matrix: null,
		board: null,
		externalIssues: null,
		notes: null,
		taskDetail: null as TaskDetailModel | null,
		collectionStatus: null as CollectionStatusModel | null,
	});
	const detail = (): TaskDetailModel => ({
		key: "task.md:1",
		dialog: {
			initial: {
				description: "企画書を書く",
				due: "",
				startAt: "",
				endAt: "",
				status: "todo",
				priority: 1,
				important: false,
				urgent: false,
				list: "",
				section: "",
				tags: [],
				repeat: "",
				reminders: [],
				progress: 0,
				progressAuto: false,
				estimatedPomos: 0,
				estimatedMinutes: 0,
				note: "",
				newComment: "",
				attachments: [],
				existingSubtasks: [],
				newSubtasks: [],
			},
			lists: [],
			statuses: [{ id: "todo", name: "未着手" }],
			comments: [],
			activities: [],
			validateRepeat: () => true,
			attachmentsOf: () => [],
			removeAttachment: (note) => note,
			onOpenAttachment: vi.fn(),
			onCancel: vi.fn(),
			onSave: vi.fn(),
			onSaveTemplate: vi.fn(),
		},
	});

	it("モバイルの主要ナビゲーションを省スペースのまま押しやすくする", () => {
		const { container } = render(<DashboardMain {...props("today")} />);
		expect(container.querySelector("[data-mobile-safe-area='content']")).toHaveClass(
			"pb-[calc(20px+env(safe-area-inset-bottom,0px))]",
		);
		expect(screen.getByRole("button", { name: "すべてのビューと分類を開く" })).toHaveClass(
			"max-[620px]:size-11",
		);
		const today = screen.getByRole("button", { name: "今日" });
		expect(today).toHaveAttribute("aria-label", "今日");
		expect(today).toHaveClass("max-[620px]:h-11", "max-[620px]:min-w-11");
		expect(today.querySelector("span:last-child")).toHaveClass("max-[520px]:inline");
		expect(screen.getByRole("button", { name: "その他のビューを開く" })).toHaveClass(
			"max-[620px]:size-11",
		);
	});

	it("タスク系画面の操作幅を制限し、時間割とKanbanは全幅を保つ", () => {
		const { unmount } = render(<DashboardMain {...props("today")} />);
		expect(document.querySelector("[data-layout='focused']")).toHaveClass("max-w-[780px]");
		unmount();

		const calendar = render(<DashboardMain {...props("calendar")} />);
		expect(document.querySelector("[data-layout='canvas']")).toHaveClass("max-w-none");
		calendar.unmount();

		render(<DashboardMain {...props("board")} />);
		expect(document.querySelector("[data-layout='canvas']")).toHaveClass("max-w-none");
	});

	it("Matrixはモバイルで読みやすい幅を保ち、デスクトップでは全幅を使う", () => {
		render(<DashboardMain {...props("matrix")} />);
		expect(document.querySelector("[data-layout='responsive-canvas']")).toHaveClass(
			"max-w-[1040px]",
			"min-[721px]:max-w-none",
		);
	});

	it("別のビューへ移動した時だけ画面スクロールを先頭へ戻す", () => {
		const { container, rerender } = render(<DashboardMain {...props("calendar")} />);
		const scrollArea = container.querySelector<HTMLElement>("[data-mobile-safe-area='content']");
		expect(scrollArea).not.toBeNull();
		if (!scrollArea) return;
		scrollArea.scrollTop = 480;

		rerender(<DashboardMain {...props("calendar")} />);
		expect(scrollArea.scrollTop).toBe(480);

		rerender(<DashboardMain {...props("review")} />);
		expect(scrollArea.scrollTop).toBe(0);
	});

	it("詳細を閉じても一覧のscrollと起点focusを復元し、対象消失時はmainへ退避する", () => {
		const value = props("today");
		const trigger = document.createElement("button");
		trigger.dataset.taskEditTrigger = "task.md:1";
		value.content.append(trigger);
		const { container, rerender } = render(<DashboardMain {...value} />);
		const main = container.querySelector<HTMLElement>("main");
		expect(main).not.toBeNull();
		if (!main) return;
		main.scrollTop = 432;
		trigger.focus();

		value.taskDetail = detail();
		rerender(<DashboardMain {...value} />);
		expect(main.scrollTop).toBe(432);

		value.taskDetail = null;
		rerender(<DashboardMain {...value} />);
		expect(main.scrollTop).toBe(432);
		expect(trigger).toHaveFocus();

		value.taskDetail = detail();
		rerender(<DashboardMain {...value} />);
		trigger.remove();
		value.taskDetail = null;
		rerender(<DashboardMain {...value} />);
		expect(main).toHaveFocus();
	});

	it("モバイル詳細中は背景一覧をinertかつAT対象外にする", () => {
		const original = window.matchMedia;
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: query === "(max-width: 899px)",
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}));
		try {
			const value = props("today");
			value.taskDetail = detail();
			const { container } = render(<DashboardMain {...value} />);
			const main = container.querySelector("main");
			expect(main).toHaveAttribute("inert");
			expect(main).toHaveAttribute("aria-hidden", "true");
		} finally {
			window.matchMedia = original;
		}
	});

	it("partialでは通常画面を維持し、fatalではempty画面を出さない", () => {
		const value = props("today");
		value.collectionStatus = { failedCount: 2, kind: "partial", onRetry: vi.fn() };
		const { rerender } = render(<DashboardMain {...value} />);
		expect(screen.getByRole("heading", { name: "今日" })).toBeInTheDocument();
		expect(screen.getByRole("alert")).toHaveTextContent("2件");

		value.collectionStatus = { failedCount: 4, kind: "fatal", onRetry: vi.fn() };
		rerender(<DashboardMain {...value} />);
		expect(screen.queryByRole("heading", { name: "今日" })).not.toBeInTheDocument();
		expect(screen.getByRole("alert")).toHaveTextContent("タスクを表示できない");
	});

	it("共通ヘッダーで検索、選択、同期、並び順、グループ化を操作する", () => {
		const value = props("inbox");
		const onQueryChange = vi.fn();
		const onToggleSelection = vi.fn();
		const onRefresh = vi.fn(async () => undefined);
		const onSortChange = vi.fn(async () => undefined);
		const onGroupChange = vi.fn(async () => undefined);
		value.model.screen = {
			title: "受信箱",
			subtitle: "5件",
			query: "",
			selectionMode: false,
			showSync: true,
			sortMode: "smart",
			groupMode: "auto",
			onQueryChange,
			onToggleSelection,
			onRefresh,
			onSortChange,
			onGroupChange,
		};
		render(<DashboardMain {...value} />);
		expect(screen.getByRole("heading", { name: "受信箱" })).toBeInTheDocument();
		expect(screen.getByRole("searchbox", { name: "タスクを検索" })).toHaveClass(
			"max-[720px]:col-span-2",
			"max-[720px]:row-start-2",
		);
		expect(document.querySelector("[data-screen-actions]")).toHaveClass(
			"max-[720px]:col-start-2",
			"max-[720px]:row-start-1",
		);
		fireEvent.change(screen.getByRole("searchbox", { name: "タスクを検索" }), {
			target: { value: "設計" },
		});
		fireEvent.click(screen.getByRole("button", { name: "複数選択" }));
		fireEvent.click(screen.getByRole("button", { name: "外部サービスを再読込" }));
		fireEvent.change(screen.getByRole("combobox", { name: "並び順" }), {
			target: { value: "due" },
		});
		fireEvent.change(screen.getByRole("combobox", { name: "グループ化" }), {
			target: { value: "list" },
		});
		expect(onQueryChange).toHaveBeenCalledWith("設計");
		expect(onToggleSelection).toHaveBeenCalledOnce();
		expect(onRefresh).toHaveBeenCalledOnce();
		expect(onSortChange).toHaveBeenCalledWith("due");
		expect(onGroupChange).toHaveBeenCalledWith("list");
	});

	it("一時ビューの理由と戻り先を明示し、モバイルでも押しやすくする", () => {
		const value = props("review-overflow");
		const onAction = vi.fn();
		value.model.screen.contextAction = {
			description: "今回の振り返りでまだ判断していない持ち越しだけを表示している。",
			label: "振り返りへ戻る",
			onAction,
		};
		render(<DashboardMain {...value} />);
		expect(screen.getByRole("note")).toHaveTextContent("まだ判断していない持ち越しだけ");
		const button = screen.getByRole("button", { name: "振り返りへ戻る" });
		expect(button).toHaveClass("max-[620px]:min-h-11");
		fireEvent.click(button);
		expect(onAction).toHaveBeenCalledOnce();
	});
});
