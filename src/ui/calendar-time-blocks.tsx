import {
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
	type CSSProperties,
	type DragEvent,
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	type ReactElement,
	type RefObject,
} from "react";
import { Icon } from "./icon";
import { useI18n } from "./i18n";

interface Geometry {
	endMinutes: number;
	lane: number;
	lanes: number;
	startHour: number;
	startMinutes: number;
}

export interface CalendarEventBlock extends Geometry {
	color: string;
	kind: "event";
	meta: string;
	title: string;
	url: string;
}

export interface CalendarTaskBlock extends Geometry {
	color: string;
	conflictLabel: string;
	done: boolean;
	dragPayload: string;
	kind: "task";
	multiDay: boolean;
	onLonger: () => void | Promise<void>;
	onOpen: () => void;
	onResize: (endMinutes: number) => void | Promise<void>;
	onShorter: () => void | Promise<void>;
	onToggleSelection: () => void | Promise<void>;
	onUnschedule: () => void | Promise<void>;
	selected: boolean;
	selectionMode: boolean;
	title: HTMLElement;
	virtual: boolean;
}

export interface CalendarTimeBlocksModel {
	autoScrollMinutes: number | null;
	compact: boolean;
	currentMinutes: number | null;
	date: string;
	hideDetails: boolean;
	hours: Array<{ hour: number; zones: Array<{ label: string; timeZone: string }> }>;
	items: Array<CalendarEventBlock | CalendarTaskBlock>;
	onCreate: (startMinutes: number) => void;
	onDrop: (payload: string, startMinutes: number) => void | Promise<void>;
	onScroll: (scrollTop: number) => void;
	savedScrollTop: number | null;
	scrollGroup: string | null;
}

function geometryStyle(item: Geometry, endMinutes = item.endMinutes): CSSProperties {
	const range = (24 - item.startHour) * 60;
	const start = Math.max(item.startHour * 60, item.startMinutes);
	const end = Math.min(24 * 60, endMinutes);
	return {
		left: `${(item.lane / item.lanes) * 100}%`,
		width: `calc(${100 / item.lanes}% - 4px)`,
		top: `${((start - item.startHour * 60) / range) * 100}%`,
		height: `${Math.max(24, ((end - start) / range) * 1152)}px`,
	};
}

function timeOf(minutes: number): string {
	return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function minutesFromPointer(
	event: ReactPointerEvent<HTMLElement>,
	startHour: number,
): number | null {
	const timeline = event.currentTarget.closest<HTMLElement>("[data-calendar-timeline]");
	if (!timeline) return null;
	const rect = timeline.getBoundingClientRect();
	const raw = startHour * 60 + ((event.clientY - rect.top) / rect.height) * ((24 - startHour) * 60);
	return Math.max(startHour * 60, Math.min(24 * 60, Math.round(raw / 15) * 15));
}

function MarkdownTitle({
	element,
	done = false,
}: {
	element: HTMLElement;
	done?: boolean;
}): ReactElement {
	const ref = useRef<HTMLDivElement>(null);
	useLayoutEffect(() => {
		ref.current?.replaceChildren(element);
		return () => element.remove();
	}, [element]);
	return (
		<div
			ref={ref}
			className={`min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-[1.35] [&_p]:m-0 ${done ? "line-through" : ""}`}
		/>
	);
}

function EventBlock({
	item,
	hideDetails,
}: {
	item: CalendarEventBlock;
	hideDetails: boolean;
}): ReactElement {
	const t = useI18n();
	const style = { ...geometryStyle(item), "--calendar-color": item.color } as CSSProperties;
	return (
		<a
			data-calendar-block="event"
			href={item.url}
			target="_blank"
			rel="noreferrer"
			style={style}
			className="absolute pointer-events-auto overflow-hidden rounded-ttd-control border border-[color-mix(in_srgb,var(--calendar-color)_32%,var(--ttd-color-border))] border-l-[3px] border-l-[var(--calendar-color)] bg-[color-mix(in_srgb,var(--calendar-color)_9%,var(--ttd-color-canvas))] px-1.5 py-1 text-ttd-text no-underline hover:text-ttd-text hover:no-underline"
		>
			<div className="flex min-w-0 items-center gap-1 overflow-hidden">
				<span
					aria-label={t("timeBlocks.calendarEvent")}
					className="inline-flex h-4 shrink-0 items-center gap-0.5 rounded border border-[color-mix(in_srgb,var(--calendar-color)_50%,var(--ttd-color-canvas))] bg-ttd-canvas px-1 text-[11px] font-bold leading-4 text-[var(--calendar-color)]"
				>
					<Icon name="calendar-days" />
					<span>{t("timeBlocks.event")}</span>
				</span>
				<strong className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px]">
					{item.title}
				</strong>
			</div>
			{hideDetails ? null : (
				<span className="mt-0.5 block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-ttd-muted">
					{item.meta}
				</span>
			)}
		</a>
	);
}

function restoreTimeActionFocus(root: HTMLElement | null, focusKey: string): void {
	const focusTrigger = () => {
		const trigger = Array.from(
			root?.querySelectorAll<HTMLButtonElement>("[data-calendar-action-trigger]") ?? [],
		).find((element) => element.dataset.calendarActionTrigger === focusKey);
		trigger?.focus();
		return trigger === document.activeElement;
	};
	// A synchronous model callback can already have committed the replacement block.
	// Focus it immediately; retry after paint only when React has not committed it yet.
	if (!focusTrigger()) window.requestAnimationFrame(focusTrigger);
}

function TaskBlock({
	item,
	focusKey,
	hideDetails,
	onError,
	onMove,
	timelineRef,
}: {
	item: CalendarTaskBlock;
	focusKey: string;
	hideDetails: boolean;
	onError: (message: string) => void;
	onMove: (minutes: number) => void | Promise<void>;
	timelineRef: RefObject<HTMLDivElement | null>;
}): ReactElement {
	const t = useI18n();
	const [resizeDraft, setResizeDraft] = useState<{ source: number; value: number } | null>(null);
	const resizingEnd = resizeDraft?.source === item.endMinutes ? resizeDraft.value : null;
	const itemIdentity = `${item.dragPayload}:${item.startMinutes}`;
	const [menuState, setMenuState] = useState({ identity: itemIdentity, open: false });
	const mobileActionsOpen = menuState.identity === itemIdentity && menuState.open;
	const setMobileActionsOpen = (next: boolean | ((open: boolean) => boolean)): void =>
		setMenuState({
			identity: itemIdentity,
			open: typeof next === "function" ? next(mobileActionsOpen) : next,
		});
	const [pendingAction, setPendingAction] = useState(false);
	const actionMenuId = useId();
	const actionMenuRef = useRef<HTMLDivElement>(null);
	const actionTriggerRef = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		if (!mobileActionsOpen) return;
		const frame = window.requestAnimationFrame(() =>
			actionMenuRef.current
				?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
				?.focus(),
		);
		const pointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null;
			if (
				target &&
				!actionMenuRef.current?.contains(target) &&
				!actionTriggerRef.current?.contains(target)
			)
				setMenuState((current) => ({ ...current, open: false }));
		};
		const keyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			event.preventDefault();
			setMenuState((current) => ({ ...current, open: false }));
			actionTriggerRef.current?.focus();
		};
		document.addEventListener("pointerdown", pointerDown);
		document.addEventListener("keydown", keyDown);
		return () => {
			window.cancelAnimationFrame(frame);
			document.removeEventListener("pointerdown", pointerDown);
			document.removeEventListener("keydown", keyDown);
		};
	}, [mobileActionsOpen]);
	const focusMenuItem = (target: "first" | "last" | "next" | "previous") => {
		const items = Array.from(
			actionMenuRef.current?.querySelectorAll<HTMLButtonElement>(
				'[role="menuitem"]:not(:disabled)',
			) ?? [],
		);
		if (!items.length) return;
		const current = items.indexOf(document.activeElement as HTMLButtonElement);
		const next =
			target === "first"
				? 0
				: target === "last"
					? items.length - 1
					: target === "next"
						? (current + 1 + items.length) % items.length
						: (current - 1 + items.length) % items.length;
		items.forEach((menuItem, index) => {
			menuItem.tabIndex = index === next ? 0 : -1;
		});
		items[next]?.focus();
	};
	const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Escape") {
			event.preventDefault();
			event.stopPropagation();
			setMobileActionsOpen(false);
			actionTriggerRef.current?.focus();
			return;
		}
		const target =
			event.key === "ArrowDown"
				? "next"
				: event.key === "ArrowUp"
					? "previous"
					: event.key === "Home"
						? "first"
						: event.key === "End"
							? "last"
							: null;
		if (!target) return;
		event.preventDefault();
		focusMenuItem(target);
	};
	const end = resizingEnd ?? item.endMinutes;
	const style = { ...geometryStyle(item, end), "--calendar-color": item.color } as CSSProperties;
	const canChange = !item.done && !item.virtual && !item.multiDay;
	const canOpen = !item.virtual;
	const runAction = async (action: () => void | Promise<void>, restoreFocus = false) => {
		if (pendingAction) return;
		setPendingAction(true);
		onError("");
		try {
			await action();
		} catch (cause) {
			onError(cause instanceof Error ? cause.message : t("timeBlocks.error.changeTime"));
		} finally {
			setPendingAction(false);
			if (restoreFocus) restoreTimeActionFocus(timelineRef.current, focusKey);
		}
	};
	const drag = (event: DragEvent<HTMLElement>) => {
		if (pendingAction || item.selectionMode || !canChange) return event.preventDefault();
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("application/x-ttd-task", item.dragPayload);
	};
	const toggle = () => {
		if (item.selectionMode && canChange) void item.onToggleSelection();
	};
	const moveResize = (event: ReactPointerEvent<HTMLDivElement>) => {
		const candidate = minutesFromPointer(event, item.startHour);
		if (candidate !== null)
			setResizeDraft({
				source: item.endMinutes,
				value: Math.max(item.startMinutes + 15, candidate),
			});
	};
	const finishResize = (event: ReactPointerEvent<HTMLDivElement>) => {
		event.currentTarget.releasePointerCapture(event.pointerId);
		if (resizingEnd !== null && resizingEnd !== item.endMinutes)
			void runAction(() => item.onResize(resizingEnd));
		setResizeDraft(null);
	};
	const runMobileAction = (action: () => void | Promise<void>, restoreFocus = true) => {
		setMobileActionsOpen(false);
		void runAction(action, restoreFocus);
	};
	return (
		<div
			data-calendar-block="task"
			data-calendar-conflict={item.conflictLabel || undefined}
			aria-busy={pendingAction || undefined}
			draggable={!pendingAction && !item.selectionMode && canChange}
			onDragStart={drag}
			onClick={toggle}
			style={style}
			className={`group absolute pointer-events-auto rounded-ttd-control border border-[color-mix(in_srgb,var(--calendar-color)_24%,var(--ttd-color-border))] border-l-[5px] bg-[color-mix(in_srgb,var(--calendar-color)_18%,var(--ttd-color-canvas))] px-[7px] py-1 max-[720px]:pr-10 ${mobileActionsOpen ? "z-20 overflow-visible" : "overflow-hidden"} ${canChange && !item.selectionMode && !pendingAction ? "cursor-grab active:cursor-grabbing" : ""} ${pendingAction ? "cursor-wait" : ""} ${item.selectionMode && canChange ? "cursor-pointer" : ""} ${item.selected ? "outline-2 -outline-offset-2 outline-[var(--calendar-color)] bg-[color-mix(in_srgb,var(--calendar-color)_29%,var(--ttd-color-canvas))]" : ""} ${item.conflictLabel ? "border-ttd-warning" : ""} ${item.done ? "cursor-default opacity-45" : ""} ${item.virtual ? "border-l-dashed opacity-70" : ""}`}
		>
			{item.selectionMode && canChange ? (
				<button
					type="button"
					aria-label={item.selected ? t("timeBlocks.deselect") : t("timeBlocks.selectPostpone")}
					onClick={(event) => {
						event.stopPropagation();
						void item.onToggleSelection();
					}}
					className="absolute right-1 top-1 z-[2] grid size-11 place-items-center rounded-full border-0 bg-ttd-canvas p-0 text-[var(--calendar-color)] shadow-sm"
				>
					<Icon name={item.selected ? "check" : "circle"} />
				</button>
			) : null}
			<div className="flex min-w-0 items-center gap-1 overflow-hidden">
				<span
					aria-label={t("timeBlocks.addedTask")}
					className="inline-flex h-4 shrink-0 items-center gap-0.5 rounded bg-[var(--calendar-color)] px-1 text-[11px] font-bold leading-4 text-white"
				>
					<Icon name="circle-check" />
					<span>{t("timeBlocks.task")}</span>
				</span>
				{item.conflictLabel ? (
					<span
						aria-label={item.conflictLabel}
						title={item.conflictLabel}
						className="inline-flex size-4 shrink-0 items-center justify-center text-ttd-warning"
					>
						<Icon name="triangle-alert" />
					</span>
				) : null}
				<span
					role="button"
					tabIndex={canOpen ? 0 : -1}
					aria-disabled={canOpen ? undefined : true}
					onClick={(event) => {
						event.stopPropagation();
						if (canOpen) item.onOpen();
					}}
					onKeyDown={(event) => {
						if (!canOpen || (event.key !== "Enter" && event.key !== " ")) return;
						event.preventDefault();
						event.stopPropagation();
						item.onOpen();
					}}
					className={`min-w-0 flex-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--calendar-color)] [&_a]:pointer-events-none [&_a]:text-inherit [&_a]:no-underline ${canOpen ? "cursor-pointer" : "cursor-default"}`}
				>
					<MarkdownTitle element={item.title} done={item.done} />
				</span>
			</div>
			{hideDetails ? null : (
				<span
					className={`mt-0.5 block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[var(--calendar-color)] ${item.done ? "line-through" : ""}`}
				>
					{timeOf(item.startMinutes)}-{timeOf(end)}
					{item.multiDay ? ` · ${t("timeBlocks.period")}` : ""}
				</span>
			)}
			{item.virtual ? (
				<span
					aria-label={t("timeBlocks.futureRepeat")}
					className="absolute right-1 top-1 text-[var(--calendar-color)]"
				>
					<Icon name="repeat-2" />
				</span>
			) : null}
			{!item.selectionMode && (canOpen || canChange) ? (
				<>
					<button
						ref={actionTriggerRef}
						data-calendar-action-trigger={focusKey}
						type="button"
						aria-label={
							pendingAction
								? t("timeBlocks.changingTime")
								: t(canChange ? "timeBlocks.adjustTime" : "timeBlocks.taskActions")
						}
						aria-controls={actionMenuId}
						aria-expanded={mobileActionsOpen}
						aria-haspopup="menu"
						aria-busy={pendingAction || undefined}
						disabled={pendingAction}
						onClick={(event) => {
							event.stopPropagation();
							setMobileActionsOpen((open) => !open);
						}}
						className="absolute right-0.5 top-0.5 z-10 grid size-11 place-items-center rounded-ttd-control border-0 bg-[color-mix(in_srgb,var(--ttd-color-canvas)_92%,transparent)] p-0 text-[var(--calendar-color)] shadow-sm disabled:cursor-wait disabled:opacity-60"
					>
						<Icon
							name={pendingAction ? "loader-circle" : "ellipsis"}
							className={
								pendingAction ? "size-4 animate-spin motion-reduce:animate-none" : "size-4"
							}
						/>
					</button>
					{mobileActionsOpen ? (
						<div
							ref={actionMenuRef}
							id={actionMenuId}
							role="menu"
							aria-label={t(canChange ? "timeBlocks.timeActions" : "timeBlocks.taskActions")}
							onKeyDown={handleMenuKeyDown}
							onClick={(event) => event.stopPropagation()}
							className="absolute right-0 top-[calc(100%+4px)] z-30 grid w-44 gap-0.5 rounded-ttd-card border border-ttd-border bg-ttd-canvas p-1 shadow-[var(--ttd-shadow-floating)]"
						>
							{canOpen ? (
								<button
									type="button"
									role="menuitem"
									tabIndex={0}
									disabled={pendingAction}
									onClick={() => runMobileAction(item.onOpen, false)}
									className="flex min-h-11 items-center gap-2 rounded-ttd-control border-0 bg-transparent px-3 text-left text-xs text-ttd-text shadow-none hover:bg-ttd-hover disabled:opacity-50"
								>
									<Icon name="square-pen" />
									<span>{t("timeBlocks.openTask")}</span>
								</button>
							) : null}
							{canChange ? (
								<>
									<button
										type="button"
										role="menuitem"
										tabIndex={-1}
										disabled={pendingAction || item.startMinutes <= item.startHour * 60}
										onClick={() => runMobileAction(() => onMove(item.startMinutes - 15))}
										className="flex min-h-11 items-center gap-2 rounded-ttd-control border-0 bg-transparent px-3 text-left text-xs text-ttd-text shadow-none hover:bg-ttd-hover disabled:opacity-50"
									>
										<Icon name="arrow-up" />
										<span>{t("timeBlocks.earlier15")}</span>
									</button>
									<button
										type="button"
										role="menuitem"
										tabIndex={-1}
										disabled={pendingAction || item.endMinutes >= 24 * 60}
										onClick={() => runMobileAction(() => onMove(item.startMinutes + 15))}
										className="flex min-h-11 items-center gap-2 rounded-ttd-control border-0 bg-transparent px-3 text-left text-xs text-ttd-text shadow-none hover:bg-ttd-hover disabled:opacity-50"
									>
										<Icon name="arrow-down" />
										<span>{t("timeBlocks.later15")}</span>
									</button>
									<button
										type="button"
										role="menuitem"
										tabIndex={-1}
										disabled={pendingAction}
										onClick={() => runMobileAction(item.onShorter)}
										className="flex min-h-11 items-center gap-2 rounded-ttd-control border-0 bg-transparent px-3 text-left text-xs text-ttd-text shadow-none hover:bg-ttd-hover disabled:opacity-50"
									>
										<Icon name="minus" />
										<span>{t("timeBlocks.shorten15")}</span>
									</button>
									<button
										type="button"
										role="menuitem"
										tabIndex={-1}
										disabled={pendingAction}
										onClick={() => runMobileAction(item.onLonger)}
										className="flex min-h-11 items-center gap-2 rounded-ttd-control border-0 bg-transparent px-3 text-left text-xs text-ttd-text shadow-none hover:bg-ttd-hover disabled:opacity-50"
									>
										<Icon name="plus" />
										<span>{t("timeBlocks.lengthen15")}</span>
									</button>
									<button
										type="button"
										role="menuitem"
										tabIndex={-1}
										disabled={pendingAction}
										onClick={() => runMobileAction(item.onUnschedule)}
										className="flex min-h-11 items-center gap-2 rounded-ttd-control border-0 bg-transparent px-3 text-left text-xs text-ttd-text shadow-none hover:bg-ttd-hover disabled:opacity-50"
									>
										<Icon name="archive-restore" />
										<span>{t("timeBlocks.unschedule")}</span>
									</button>
								</>
							) : null}
						</div>
					) : null}
					{canChange ? (
						<div
							role="separator"
							aria-label={t("timeBlocks.dragEnd")}
							aria-disabled={pendingAction || undefined}
							onPointerDown={(event) => {
								event.preventDefault();
								event.stopPropagation();
								if (pendingAction) return;
								event.currentTarget.setPointerCapture(event.pointerId);
								setResizeDraft({ source: item.endMinutes, value: item.endMinutes });
							}}
							onPointerMove={(event) => {
								if (event.currentTarget.hasPointerCapture(event.pointerId)) moveResize(event);
							}}
							onPointerUp={finishResize}
							onPointerCancel={() => setResizeDraft(null)}
							className={`absolute inset-x-1 bottom-0 z-[2] h-[7px] after:absolute after:bottom-0.5 after:left-1/2 after:h-0.5 after:w-7 after:-translate-x-1/2 after:rounded-full after:bg-[color-mix(in_srgb,var(--calendar-color)_56%,transparent)] after:opacity-0 group-hover:after:opacity-100 max-[720px]:hidden ${pendingAction ? "cursor-wait" : "cursor-ns-resize"}`}
						/>
					) : null}
				</>
			) : null}
		</div>
	);
}

export function CalendarTimeBlocks({ model }: { model: CalendarTimeBlocksModel }): ReactElement {
	const t = useI18n();
	const [dropMinutes, setDropMinutes] = useState<number | null>(null);
	const [dropping, setDropping] = useState(false);
	const [dropError, setDropError] = useState("");
	const [actionError, setActionError] = useState("");
	const root = useRef<HTMLDivElement>(null);
	const { autoScrollMinutes, onScroll, savedScrollTop, scrollGroup } = model;
	const startHour = model.hours[0]?.hour ?? 6;
	const suggestedStart = Math.max(startHour * 60, 9 * 60);
	const minutesAt = (clientY: number, element: HTMLElement) => {
		const rect = element.getBoundingClientRect();
		const raw = startHour * 60 + ((clientY - rect.top) / rect.height) * ((24 - startHour) * 60);
		return Math.max(startHour * 60, Math.min(24 * 60, Math.round(raw / 15) * 15));
	};
	const top = (minutes: number) =>
		`${((minutes - startHour * 60) / ((24 - startHour) * 60)) * 100}%`;
	const drop = async (payload: string, minutes: number) => {
		if (dropping) return;
		setDropping(true);
		setDropError("");
		try {
			await model.onDrop(payload, minutes);
		} catch (cause) {
			setDropError(cause instanceof Error ? cause.message : t("timeBlocks.error.drop"));
		} finally {
			setDropping(false);
		}
	};
	useLayoutEffect(() => {
		const scroll = root.current?.closest<HTMLElement>("[data-calendar-scroll]");
		if (!scroll) return;
		if (scrollGroup) scroll.dataset.calendarScrollGroup = scrollGroup;
		const sync = () => {
			onScroll(scroll.scrollTop);
			if (!scrollGroup) return;
			const scope = scroll.closest(".ttd-week");
			scope
				?.querySelectorAll<HTMLElement>(`[data-calendar-scroll-group="${scrollGroup}"]`)
				.forEach((other) => {
					if (other !== scroll && other.scrollTop !== scroll.scrollTop)
						other.scrollTop = scroll.scrollTop;
				});
		};
		scroll.addEventListener("scroll", sync, { passive: true });
		const frame = window.requestAnimationFrame(() => {
			const currentOffset =
				autoScrollMinutes !== null
					? ((autoScrollMinutes - startHour * 60) / ((24 - startHour) * 60)) * 1152 -
						scroll.clientHeight * 0.3
					: 0;
			scroll.scrollTop = savedScrollTop ?? Math.max(0, currentOffset);
		});
		return () => {
			window.cancelAnimationFrame(frame);
			scroll.removeEventListener("scroll", sync);
		};
	}, [autoScrollMinutes, onScroll, savedScrollTop, scrollGroup, startHour]);
	return (
		<div
			ref={root}
			className={`absolute inset-0 ${dropMinutes === null ? "" : "bg-[var(--ttd-blue-soft)]"}`}
			onDragOver={(event) => {
				if (dropping || !event.dataTransfer.types.includes("application/x-ttd-task")) return;
				event.preventDefault();
				event.dataTransfer.dropEffect = "move";
				setDropMinutes(minutesAt(event.clientY, event.currentTarget));
			}}
			onDragLeave={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropMinutes(null);
			}}
			onDrop={(event) => {
				event.preventDefault();
				const payload = event.dataTransfer.getData("application/x-ttd-task");
				const minutes = minutesAt(event.clientY, event.currentTarget);
				setDropMinutes(null);
				if (payload) void drop(payload, minutes);
			}}
			onClick={(event) => {
				if ((event.target as Element).closest("[data-calendar-block]")) return;
				model.onCreate(minutesAt(event.clientY, event.currentTarget));
			}}
		>
			{model.items.length === 0 ? (
				<button
					type="button"
					onClick={(event) => {
						event.stopPropagation();
						model.onCreate(suggestedStart);
					}}
					className="absolute left-[calc(50%+26px)] top-40 z-[4] min-h-11 -translate-x-1/2 rounded-ttd-control border border-ttd-border bg-ttd-canvas px-4 text-xs font-medium text-ttd-text shadow-sm hover:bg-ttd-hover max-[720px]:left-[calc(50%+21px)]"
				>
					{t("timeBlocks.addFirstTask", { time: timeOf(suggestedStart) })}
				</button>
			) : null}
			{dropping ? (
				<div
					role="status"
					className="pointer-events-none absolute right-2 top-2 z-20 rounded-ttd-control border border-ttd-border bg-ttd-canvas px-2 py-1 text-[11px] text-ttd-muted shadow-[var(--ttd-shadow-floating)]"
				>
					{t("timeBlocks.dropping")}
				</div>
			) : null}
			{dropError || actionError ? (
				<div
					role="alert"
					className="pointer-events-none absolute left-[52px] right-2 top-2 z-20 rounded-ttd-control border border-ttd-danger bg-ttd-danger-soft px-2 py-1 text-[11px] text-ttd-danger shadow-[var(--ttd-shadow-floating)]"
				>
					{dropError || actionError}
				</div>
			) : null}
			{model.hours.map(({ hour, zones }) => (
				<div
					key={hour}
					className="relative h-16 border-b border-ttd-border after:absolute after:inset-x-0 after:top-1/2 after:border-t after:border-[color-mix(in_srgb,var(--ttd-color-border)_48%,transparent)] after:content-['']"
				>
					<div
						className={`relative -top-[7px] inline-flex flex-col overflow-hidden pr-2 text-right text-ttd-faint ${model.compact ? "w-[38px] pr-[5px]" : "w-[52px]"}`}
					>
						<span className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px]">
							{String(hour).padStart(2, "0")}:00
						</span>
						{zones.map((zone) => (
							<span
								key={zone.timeZone}
								title={zone.timeZone}
								className="overflow-hidden text-ellipsis whitespace-nowrap text-[7px] leading-[9px]"
							>
								{zone.label}
							</span>
						))}
					</div>
				</div>
			))}
			{model.currentMinutes === null ? null : (
				<div
					aria-label={t("timeBlocks.currentTime", { time: timeOf(model.currentMinutes) })}
					style={{ top: top(model.currentMinutes) }}
					className="pointer-events-none absolute left-[52px] right-0 z-[3] h-px border-t border-[var(--ttd-red)] before:absolute before:-left-1 before:-top-1 before:size-2 before:rounded-full before:bg-[var(--ttd-red)] before:content-['']"
				>
					<span className="absolute -left-[49px] -top-2 w-[42px] text-right text-[11px] text-[var(--ttd-red)]">
						{timeOf(model.currentMinutes)}
					</span>
				</div>
			)}
			{dropMinutes === null ? null : (
				<div
					aria-label={t("timeBlocks.dropTime", { time: timeOf(dropMinutes) })}
					style={{ top: top(dropMinutes) }}
					className="pointer-events-none absolute left-[52px] right-0 z-[8] h-0.5 -translate-y-px rounded-sm bg-[var(--ttd-blue)] text-[11px] font-semibold leading-none text-[var(--ttd-blue)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--ttd-blue)_22%,transparent)] before:absolute before:-left-1 before:-top-1 before:size-[9px] before:rounded-full before:bg-[var(--ttd-blue)] before:content-['']"
				>
					<span className="pl-[7px]">{timeOf(dropMinutes)}</span>
				</div>
			)}
			<div
				className={`pointer-events-none absolute inset-y-0 right-2 ${model.compact ? "left-[42px]" : "left-[62px] max-[720px]:left-[52px]"}`}
			>
				{model.items.map((item, index) =>
					item.kind === "event" ? (
						<EventBlock
							key={`event:${item.url}:${item.startMinutes}:${index}`}
							item={item}
							hideDetails={model.hideDetails}
						/>
					) : (
						<TaskBlock
							key={`task:${item.dragPayload}:${item.startMinutes}`}
							item={item}
							focusKey={`${model.date}:${item.dragPayload}`}
							hideDetails={model.hideDetails}
							onError={setActionError}
							onMove={(minutes) => drop(item.dragPayload, minutes)}
							timelineRef={root}
						/>
					),
				)}
			</div>
		</div>
	);
}
