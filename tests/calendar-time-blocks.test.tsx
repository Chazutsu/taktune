import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	CalendarTimeBlocks,
	type CalendarTaskBlock,
	type CalendarTimeBlocksModel,
} from "../src/ui/calendar-time-blocks";

function title(text: string): HTMLElement {
	const element = document.createElement("div");
	element.textContent = text;
	return element;
}

function task(overrides: Partial<CalendarTaskBlock> = {}): CalendarTaskBlock {
	return {
		autoScrollMinutes: null,
		kind: "task",
		color: "#4778ff",
		conflictLabel: "",
		done: false,
		dragPayload: '{"path":"daily.md","line":3}',
		endMinutes: 660,
		lane: 0,
		lanes: 1,
		multiDay: false,
		onLonger: vi.fn(),
		onOpen: vi.fn(),
		onResize: vi.fn(),
		onShorter: vi.fn(),
		onToggleSelection: vi.fn(),
		onUnschedule: vi.fn(),
		selected: false,
		selectionMode: false,
		startHour: 6,
		startMinutes: 600,
		title: title("仕様を確認する"),
		virtual: false,
		...overrides,
	};
}

function model(items: CalendarTimeBlocksModel["items"]): CalendarTimeBlocksModel {
	return {
		compact: false,
		currentMinutes: 780,
		date: "2026-10-09",
		hideDetails: false,
		hours: Array.from({ length: 18 }, (_, index) => ({ hour: index + 6, zones: [] })),
		items,
		onCreate: vi.fn(),
		onDrop: vi.fn(),
		onScroll: vi.fn(),
		savedScrollTop: null,
		scrollGroup: null,
	};
}

describe("CalendarTimeBlocks", () => {
	it("予定とタスクの出所を明示する", () => {
		render(
			<CalendarTimeBlocks
				model={model([
					{
						kind: "event",
						color: "#7693e8",
						title: "定例",
						meta: "Google",
						url: "https://example.com",
						startMinutes: 540,
						endMinutes: 600,
						startHour: 6,
						lane: 0,
						lanes: 1,
					},
					task(),
				])}
			/>,
		);
		expect(screen.getByLabelText("カレンダー予定")).toHaveTextContent("予定");
		expect(screen.getByLabelText("追加したタスク")).toHaveTextContent("タスク");
		expect(screen.getByRole("link", { name: /定例/ })).toHaveAttribute(
			"href",
			"https://example.com",
		);
	});

	it("予定との重複を警告する", () => {
		render(<CalendarTimeBlocks model={model([task({ conflictLabel: "予定と重複" })])} />);
		expect(screen.getByLabelText("予定と重複")).toBeInTheDocument();
		expect(
			screen.getByText("仕様を確認する").closest("[data-calendar-block='task']"),
		).toHaveAttribute("data-calendar-conflict", "予定と重複");
	});

	it("タスクのタイトルクリック・Enter・操作メニューから編集を開く", async () => {
		const value = task();
		render(<CalendarTimeBlocks model={model([value])} />);
		const titleButton = screen.getByRole("button", { name: "仕様を確認する" });
		fireEvent.click(titleButton);
		fireEvent.keyDown(titleButton, { key: "Enter" });
		expect(value.onOpen).toHaveBeenCalledTimes(2);

		fireEvent.click(screen.getByRole("button", { name: "時間を調整" }));
		const open = screen.getByRole("menuitem", { name: "タスクを開く" });
		await waitFor(() => expect(open).toHaveFocus());
		fireEvent.click(open);
		expect(value.onOpen).toHaveBeenCalledTimes(3);
		expect(screen.queryByRole("menu", { name: "時間の操作" })).not.toBeInTheDocument();
	});

	it("カレンダー予定のリンク操作とタスクを開く操作を分離する", () => {
		const value = task();
		render(
			<CalendarTimeBlocks
				model={model([
					{
						kind: "event",
						color: "#7693e8",
						title: "定例",
						meta: "Google",
						url: "https://example.com",
						startMinutes: 540,
						endMinutes: 600,
						startHour: 6,
						lane: 0,
						lanes: 1,
					},
					value,
				])}
			/>,
		);
		fireEvent.click(screen.getByRole("link", { name: /定例/ }));
		expect(value.onOpen).not.toHaveBeenCalled();
	});

	it("完了済みタスクも時間変更を出さず編集だけ開ける", () => {
		const value = task({ done: true });
		render(<CalendarTimeBlocks model={model([value])} />);
		fireEvent.click(screen.getByRole("button", { name: "タスクの操作" }));
		expect(screen.getByRole("menuitem", { name: "タスクを開く" })).toBeInTheDocument();
		expect(screen.queryByRole("menuitem", { name: "15分早める" })).not.toBeInTheDocument();
	});

	it("時間調整と未配置化をモデルへ伝える", async () => {
		const value = task();
		render(<CalendarTimeBlocks model={model([value])} />);
		fireEvent.click(screen.getByRole("button", { name: "時間を調整" }));
		fireEvent.click(screen.getByRole("menuitem", { name: "15分短くする" }));
		await waitFor(() => expect(screen.getByRole("button", { name: "時間を調整" })).toBeEnabled());
		expect(value.onShorter).toHaveBeenCalledOnce();
		fireEvent.click(screen.getByRole("button", { name: "時間を調整" }));
		fireEvent.click(screen.getByRole("menuitem", { name: "15分長くする" }));
		await waitFor(() => expect(screen.getByRole("button", { name: "時間を調整" })).toBeEnabled());
		expect(value.onLonger).toHaveBeenCalledOnce();
		fireEvent.click(screen.getByRole("button", { name: "時間を調整" }));
		fireEvent.click(screen.getByRole("menuitem", { name: "未配置へ戻す" }));
		await waitFor(() => expect(screen.getByRole("button", { name: "時間を調整" })).toBeEnabled());
		expect(value.onUnschedule).toHaveBeenCalledOnce();
	});

	it("Tabで到達できる操作メニューから開始時刻を15分単位で移動する", async () => {
		const value = model([task()]);
		render(<CalendarTimeBlocks model={value} />);
		const trigger = screen.getByRole("button", { name: "時間を調整" });
		trigger.focus();
		expect(trigger).toHaveFocus();
		fireEvent.click(trigger);
		fireEvent.click(screen.getByRole("menuitem", { name: "15分早める" }));
		await waitFor(() =>
			expect(value.onDrop).toHaveBeenCalledWith('{"path":"daily.md","line":3}', 585),
		);
	});

	it("複数ペインでは時間変更後に操作元の時間軸へfocusを戻す", async () => {
		const left = model([task()]);
		const rightTask = task();
		const right = model([rightTask]);
		const view = render(
			<>
				<div aria-label="左ペイン">
					<CalendarTimeBlocks model={left} />
				</div>
				<div aria-label="右ペイン">
					<CalendarTimeBlocks model={right} />
				</div>
			</>,
		);
		vi.mocked(rightTask.onShorter).mockImplementation(() => {
			view.rerender(
				<>
					<div aria-label="左ペイン">
						<CalendarTimeBlocks model={left} />
					</div>
					<div aria-label="右ペイン">
						<CalendarTimeBlocks model={model([task()])} />
					</div>
				</>,
			);
		});
		const rightPane = screen.getByLabelText("右ペイン");
		fireEvent.click(within(rightPane).getByRole("button", { name: "時間を調整" }));
		fireEvent.click(screen.getByRole("menuitem", { name: "15分短くする" }));
		await waitFor(() =>
			expect(within(rightPane).getByRole("button", { name: "時間を調整" })).toHaveFocus(),
		);
		expect(
			within(screen.getByLabelText("左ペイン")).getByRole("button", { name: "時間を調整" }),
		).not.toHaveFocus();
	});

	it("時間変更中の重複操作を止め、失敗理由を時間軸上へ表示する", async () => {
		let reject: (error: Error) => void = () => undefined;
		const onShorter = vi.fn(
			() =>
				new Promise<void>((_resolve, rejectPromise) => {
					reject = rejectPromise;
				}),
		);
		render(<CalendarTimeBlocks model={model([task({ onShorter })])} />);
		fireEvent.click(screen.getByRole("button", { name: "時間を調整" }));
		const shorter = screen.getByRole("menuitem", { name: "15分短くする" });
		fireEvent.click(shorter);
		expect(screen.getByRole("button", { name: "時間を変更中" })).toBeDisabled();
		expect(onShorter).toHaveBeenCalledOnce();
		reject(new Error("時間枠を書き込めなかった"));
		expect(await screen.findByRole("alert")).toHaveTextContent("時間枠を書き込めなかった");
		await waitFor(() => expect(screen.getByRole("button", { name: "時間を調整" })).toBeEnabled());
	});

	it("スマホ向け操作メニューから時間を変更できる", () => {
		const value = task();
		render(<CalendarTimeBlocks model={model([value])} />);
		const trigger = screen.getByRole("button", { name: "時間を調整" });
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		fireEvent.click(trigger);
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		fireEvent.click(screen.getByRole("menuitem", { name: "15分長くする" }));
		expect(value.onLonger).toHaveBeenCalledOnce();
		expect(screen.queryByRole("menu", { name: "時間の操作" })).not.toBeInTheDocument();
	});

	it("操作メニューの初期focus、Escape復帰、外側クリックを管理する", async () => {
		render(
			<>
				<button type="button">外側</button>
				<CalendarTimeBlocks model={model([task()])} />
			</>,
		);
		const trigger = screen.getByRole("button", { name: "時間を調整" });
		expect(trigger).toHaveAttribute("aria-haspopup", "menu");
		fireEvent.click(trigger);
		const menu = screen.getByRole("menu", { name: "時間の操作" });
		expect(trigger).toHaveAttribute("aria-controls", menu.id);
		await waitFor(() =>
			expect(screen.getByRole("menuitem", { name: "タスクを開く" })).toHaveFocus(),
		);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.queryByRole("menu", { name: "時間の操作" })).not.toBeInTheDocument();
		expect(trigger).toHaveFocus();

		fireEvent.click(trigger);
		await waitFor(() =>
			expect(screen.getByRole("menuitem", { name: "タスクを開く" })).toHaveFocus(),
		);
		const outside = screen.getByRole("button", { name: "外側" });
		fireEvent.pointerDown(outside);
		expect(screen.queryByRole("menu", { name: "時間の操作" })).not.toBeInTheDocument();
		expect(trigger).not.toHaveFocus();
	});

	it("操作メニューを矢印・Home・Endで巡回し、tabindexを1項目だけに保つ", async () => {
		render(<CalendarTimeBlocks model={model([task()])} />);
		fireEvent.click(screen.getByRole("button", { name: "時間を調整" }));
		const earlier = screen.getByRole("menuitem", { name: "15分早める" });
		const later = screen.getByRole("menuitem", { name: "15分遅らせる" });
		const unschedule = screen.getByRole("menuitem", { name: "未配置へ戻す" });
		const open = screen.getByRole("menuitem", { name: "タスクを開く" });
		await waitFor(() => expect(open).toHaveFocus());
		expect(open).toHaveAttribute("tabindex", "0");
		expect(earlier).toHaveAttribute("tabindex", "-1");
		expect(later).toHaveAttribute("tabindex", "-1");
		fireEvent.keyDown(open, { key: "ArrowDown" });
		expect(earlier).toHaveFocus();
		expect(earlier).toHaveAttribute("tabindex", "0");
		expect(open).toHaveAttribute("tabindex", "-1");
		fireEvent.keyDown(earlier, { key: "ArrowDown" });
		expect(later).toHaveFocus();
		fireEvent.keyDown(later, { key: "End" });
		expect(unschedule).toHaveFocus();
		fireEvent.keyDown(unschedule, { key: "ArrowDown" });
		expect(open).toHaveFocus();
		fireEvent.keyDown(open, { key: "ArrowUp" });
		expect(unschedule).toHaveFocus();
		fireEvent.keyDown(unschedule, { key: "Home" });
		expect(open).toHaveFocus();
	});

	it("開始時刻変更でブロックが再マウントされても同じタスクの操作へfocusを戻す", async () => {
		const before = model([task()]);
		const view = render(<CalendarTimeBlocks model={before} />);
		before.onDrop = vi.fn((_payload, minutes) => {
			view.rerender(
				<CalendarTimeBlocks
					model={model([task({ startMinutes: minutes, endMinutes: minutes + 60 })])}
				/>,
			);
		});
		fireEvent.click(screen.getByRole("button", { name: "時間を調整" }));
		fireEvent.click(screen.getByRole("menuitem", { name: "15分早める" }));
		await waitFor(() => expect(screen.getByRole("button", { name: "時間を調整" })).toHaveFocus());
	});

	it("時刻操作と選択操作の当たり判定を44pxにする", () => {
		const view = render(<CalendarTimeBlocks model={model([task()])} />);
		expect(screen.getByRole("button", { name: "時間を調整" })).toHaveClass("size-11");
		fireEvent.click(screen.getByRole("button", { name: "時間を調整" }));
		for (const item of screen.getAllByRole("menuitem")) expect(item).toHaveClass("min-h-11");
		view.rerender(<CalendarTimeBlocks model={model([task({ selectionMode: true })])} />);
		expect(screen.getByRole("button", { name: "延期対象に選択" })).toHaveClass("size-11");
	});

	it("スマホで時間変更中の状態を示し、再操作を止める", async () => {
		let resolve: () => void = () => undefined;
		const onLonger = vi.fn(
			() =>
				new Promise<void>((resolvePromise) => {
					resolve = resolvePromise;
				}),
		);
		render(<CalendarTimeBlocks model={model([task({ onLonger })])} />);
		fireEvent.click(screen.getByRole("button", { name: "時間を調整" }));
		fireEvent.click(screen.getByRole("menuitem", { name: "15分長くする" }));
		const pendingTrigger = screen.getByRole("button", { name: "時間を変更中" });
		const block = screen.getByText("仕様を確認する").closest("[data-calendar-block='task']");
		expect(pendingTrigger).toBeDisabled();
		expect(pendingTrigger).toHaveAttribute("aria-busy", "true");
		expect(block).toHaveAttribute("aria-busy", "true");
		expect(block).toHaveAttribute("draggable", "false");
		expect(screen.getByRole("separator", { name: "終了時刻をドラッグして変更" })).toHaveAttribute(
			"aria-disabled",
			"true",
		);
		expect(screen.queryByRole("menu", { name: "時間の操作" })).not.toBeInTheDocument();
		resolve();
		await waitFor(() => expect(screen.getByRole("button", { name: "時間を調整" })).toBeEnabled());
	});

	it("選択モードではDnDせず選択を切り替える", () => {
		const value = task({ selectionMode: true });
		render(<CalendarTimeBlocks model={model([value])} />);
		fireEvent.click(screen.getByRole("button", { name: "延期対象に選択" }));
		expect(value.onToggleSelection).toHaveBeenCalledOnce();
		expect(
			screen.getByText("仕様を確認する").closest("[data-calendar-block='task']"),
		).toHaveAttribute("draggable", "false");
	});

	it("通常時は時間軸DnDのペイロードを設定する", () => {
		render(<CalendarTimeBlocks model={model([task()])} />);
		const setData = vi.fn();
		fireEvent.dragStart(
			screen.getByText("仕様を確認する").closest("[data-calendar-block='task']")!,
			{ dataTransfer: { effectAllowed: "", setData } },
		);
		expect(setData).toHaveBeenCalledWith("application/x-ttd-task", '{"path":"daily.md","line":3}');
	});

	it("時間グリッドに現在時刻と1時間・30分の目盛りを描画する", () => {
		render(<CalendarTimeBlocks model={model([])} />);
		expect(screen.getByLabelText("現在時刻 13:00")).toBeInTheDocument();
		expect(screen.getByText("06:00")).toBeInTheDocument();
		expect(screen.getByText("23:00")).toBeInTheDocument();
	});

	it("空の時間軸では中央の主操作から最初のタスクを追加する", () => {
		const value = model([]);
		render(<CalendarTimeBlocks model={value} />);
		fireEvent.click(screen.getByRole("button", { name: "09:00にタスクを追加" }));
		expect(value.onCreate).toHaveBeenCalledWith(540);
	});

	it("空白クリックとドロップ位置を15分単位でモデルへ伝える", () => {
		const value = model([]);
		const { container } = render(<CalendarTimeBlocks model={value} />);
		const timeline = container.firstElementChild as HTMLElement;
		vi.spyOn(timeline, "getBoundingClientRect").mockReturnValue({
			x: 0,
			y: 0,
			top: 0,
			left: 0,
			right: 400,
			bottom: 1152,
			width: 400,
			height: 1152,
			toJSON: () => ({}),
		});
		fireEvent.click(timeline, { clientY: 320 });
		const drop = new Event("drop", { bubbles: true, cancelable: true });
		Object.defineProperties(drop, {
			clientY: { value: 384 },
			dataTransfer: { value: { getData: () => "payload" } },
		});
		fireEvent(timeline, drop);
		expect(value.onCreate).toHaveBeenCalledWith(660);
		expect(value.onDrop).toHaveBeenCalledWith("payload", 720);
	});

	it("DnD配置中の重複操作を止め、失敗理由を表示して再試行できる", async () => {
		let reject: (error: Error) => void = () => undefined;
		const value = model([]);
		value.onDrop = vi.fn(
			() =>
				new Promise<void>((_resolve, rejectPromise) => {
					reject = rejectPromise;
				}),
		);
		const { container } = render(<CalendarTimeBlocks model={value} />);
		const timeline = container.firstElementChild as HTMLElement;
		vi.spyOn(timeline, "getBoundingClientRect").mockReturnValue({
			x: 0,
			y: 0,
			top: 0,
			left: 0,
			right: 400,
			bottom: 1152,
			width: 400,
			height: 1152,
			toJSON: () => ({}),
		});
		const makeDrop = () => {
			const event = new Event("drop", { bubbles: true, cancelable: true });
			Object.defineProperties(event, {
				clientY: { value: 384 },
				dataTransfer: { value: { getData: () => "payload" } },
			});
			return event;
		};
		fireEvent(timeline, makeDrop());
		expect(screen.getByRole("status")).toHaveTextContent("配置中…");
		fireEvent(timeline, makeDrop());
		expect(value.onDrop).toHaveBeenCalledOnce();
		reject(new Error("Markdownを書き込めなかった"));
		expect(await screen.findByRole("alert")).toHaveTextContent("Markdownを書き込めなかった");
		await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
	});

	it("スクロール位置を復元して複数日カラムへ同期する", async () => {
		const first = model([]);
		first.savedScrollTop = 240;
		first.scrollGroup = "week:2026-10-09";
		const second = model([]);
		second.date = "2026-10-10";
		second.scrollGroup = "week:2026-10-09";
		const { container } = render(
			<div className="ttd-week">
				<div data-calendar-scroll>
					<CalendarTimeBlocks model={first} />
				</div>
				<div data-calendar-scroll>
					<CalendarTimeBlocks model={second} />
				</div>
			</div>,
		);
		const scrolls = container.querySelectorAll<HTMLElement>("[data-calendar-scroll]");
		await waitFor(() => expect(scrolls[0].scrollTop).toBe(240));
		scrolls[0].scrollTop = 480;
		fireEvent.scroll(scrolls[0]);
		expect(first.onScroll).toHaveBeenCalledWith(480);
		expect(scrolls[1].scrollTop).toBe(480);
	});
});
