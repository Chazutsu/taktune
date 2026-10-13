import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState, type ReactElement } from "react";
import type { NavigationItem } from "./dashboard-sidebar";
import { Icon } from "./icon";
import { InboxTriage, type InboxTriageModel } from "./inbox-triage";
import { QuickAdd, type QuickAddModel } from "./quick-add";
import { TaskList, type TaskListModel } from "./task-list";
import { CalendarControls, type CalendarControlsModel } from "./calendar-controls";
import { PlanTray, type PlanTrayModel } from "./plan-tray";
import { CalendarTimeBlocks, type CalendarTimeBlocksModel } from "./calendar-time-blocks";
import { CalendarDayChrome, type CalendarDayChromeModel } from "./calendar-day-chrome";
import { CalendarMonth, type CalendarMonthModel } from "./calendar-month";
import { CalendarAgenda, type CalendarAgendaModel } from "./calendar-agenda";
import { CalendarYear, type CalendarYearModel } from "./calendar-year";
import { Review, type ReviewModel } from "./review";
import { Stats, type StatsModel } from "./stats";
import { Focus, type FocusModel } from "./focus";
import { Habits, type HabitsModel } from "./habits";
import { Countdowns, type CountdownsModel } from "./countdowns";
import { Matrix, type MatrixModel } from "./matrix";
import { Board, type BoardModel } from "./board";
import { ExternalIssues, type ExternalIssuesModel } from "./external-issues";
import { Notes, type NotesModel } from "./notes";
import { ReviewReminder, type ReviewReminderModel } from "./review-reminder";
import { BatchActions, type BatchActionsModel } from "./batch-actions";
import { CalendarBatchActions, type CalendarBatchActionsModel } from "./calendar-batch-actions";
import { useI18n } from "./i18n";
import { PlanningGuide, type PlanningGuideModel } from "./planning-guide";
import { TaskDetail, type TaskDetailModel } from "./task-detail";
import { useMediaQuery } from "./use-media-query";
import { ViewOptionsMenu } from "./view-options-menu";
import { TodayFocus, type TodayFocusModel } from "./today-focus";
import { CollectionStatus, type CollectionStatusModel } from "./collection-status";

export interface MainShellModel {
	activeId: string;
	primary: NavigationItem[];
	sidebarOpen: boolean;
	screen: ScreenHeaderModel;
	onSelect: (id: string) => void;
	onToggleSidebar: () => void;
	onOpenSidebar: () => void;
	planningGuide: PlanningGuideModel;
}

export interface ScreenHeaderModel {
	title: string;
	subtitle: string;
	contextAction?: { description: string; label: string; onAction: () => void };
	query?: string;
	selectionMode?: boolean;
	showSync?: boolean;
	sortMode?: string;
	groupMode?: string;
	onQueryChange?: (query: string) => void;
	onToggleSelection?: () => void;
	onRefresh?: () => Promise<void>;
	onSortChange?: (mode: string) => Promise<void>;
	onGroupChange?: (mode: string) => Promise<void>;
}

const FULL_WIDTH_VIEWS = new Set(["calendar", "board"]);

function AppBar({ model }: { model: MainShellModel }): ReactElement {
	const t = useI18n();
	return (
		<div
			data-app-bar
			className="sticky top-[-6px] z-10 mb-3 flex min-h-10 items-center gap-1 border-b border-ttd-border bg-ttd-canvas py-0.5 max-[620px]:min-h-11"
		>
			<button
				type="button"
				aria-label={t(model.sidebarOpen ? "sidebar.close" : "sidebar.open")}
				aria-expanded={model.sidebarOpen}
				onClick={model.onToggleSidebar}
				className="grid size-8 shrink-0 place-items-center rounded-ttd-control border-0 bg-transparent p-0 text-ttd-muted shadow-none hover:bg-ttd-hover hover:text-ttd-text max-[620px]:size-11"
			>
				<Icon name={model.sidebarOpen ? "panel-left-close" : "panel-left-open"} />
			</button>
			<nav
				aria-label={t("sidebar.views")}
				className={`min-w-0 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${model.sidebarOpen ? "flex min-[721px]:hidden" : "flex"}`}
			>
				{model.primary.map((item) => {
					const active = item.id === model.activeId;
					return (
						<button
							type="button"
							key={item.id}
							aria-label={item.label}
							aria-current={active ? "page" : undefined}
							onClick={() => model.onSelect(item.id)}
							className={`relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-none border-0 px-2.5 text-xs shadow-none after:absolute after:inset-x-2 after:bottom-[-3px] after:h-0.5 after:content-[''] max-[620px]:h-11 max-[620px]:min-w-11 max-[520px]:px-2 ${active ? "font-semibold text-ttd-accent after:bg-ttd-accent" : "bg-transparent text-ttd-muted after:bg-transparent hover:text-ttd-text"}`}
						>
							<Icon name={item.icon} />
							<span className={active ? "max-[520px]:inline" : "max-[520px]:hidden"}>
								{item.label}
							</span>
						</button>
					);
				})}
			</nav>
			<button
				type="button"
				aria-label={t("sidebar.more")}
				onClick={model.onOpenSidebar}
				className={`ml-auto size-8 shrink-0 place-items-center rounded-ttd-control border-0 bg-transparent p-0 text-ttd-muted shadow-none hover:bg-ttd-hover hover:text-ttd-text max-[620px]:size-11 ${model.sidebarOpen ? "grid min-[721px]:hidden" : "grid"}`}
			>
				<Icon name="ellipsis" />
			</button>
		</div>
	);
}

const SORT_OPTIONS = [
	["smart", "sort.smart"],
	["manual", "sort.manual"],
	["due", "sort.due"],
	["priority", "sort.priority"],
	["title", "sort.title"],
	["created-desc", "sort.createdDesc"],
	["created-asc", "sort.createdAsc"],
	["modified-desc", "sort.modifiedDesc"],
	["modified-asc", "sort.modifiedAsc"],
	["source", "sort.source"],
] as const;

const GROUP_OPTIONS = [
	["auto", "group.auto"],
	["none", "group.none"],
	["status", "group.status"],
	["due", "group.due"],
	["priority", "group.priority"],
	["list", "group.list"],
	["tag", "group.tag"],
	["section", "group.section"],
	["created", "group.created"],
	["modified", "group.modified"],
] as const;

function ScreenHeader({ model }: { model: ScreenHeaderModel }): ReactElement {
	const t = useI18n();
	const compactHeader = useMediaQuery("(max-width: 620px)");
	const [refreshing, setRefreshing] = useState(false);
	const refresh = async (): Promise<void> => {
		if (!model.onRefresh || refreshing) return;
		setRefreshing(true);
		try {
			await model.onRefresh();
		} finally {
			setRefreshing(false);
		}
	};
	const hasQuery = model.query !== undefined;
	const hasViewOptions = model.sortMode !== undefined && model.groupMode !== undefined;
	const hasActions =
		model.query !== undefined ||
		model.onToggleSelection ||
		model.showSync ||
		(compactHeader && hasViewOptions);
	const viewOptionsModel = hasViewOptions
		? {
				sortMode: model.sortMode as string,
				groupMode: model.groupMode as string,
				sortOptions: SORT_OPTIONS.map(([value, key]) => ({ value, label: t(key) })),
				groupOptions: GROUP_OPTIONS.map(([value, key]) => ({ value, label: t(key) })),
				onSortChange: (value: string) => model.onSortChange?.(value),
				onGroupChange: (value: string) => model.onGroupChange?.(value),
			}
		: null;
	return (
		<>
			<header
				className={`mb-1.5 grid max-w-none items-center gap-[7px] max-[620px]:mb-1 ${hasQuery ? "grid-cols-[1fr_minmax(150px,220px)_auto] max-[720px]:grid-cols-[minmax(0,1fr)_auto] max-[720px]:gap-2" : hasActions ? "grid-cols-[1fr_auto] max-[720px]:gap-2" : "grid-cols-1"}`}
			>
				<div>
					<h1 className="m-0 text-lg leading-tight tracking-[-0.02em] max-[620px]:text-[17px]">
						{model.title}
					</h1>
					<p className="mb-0 mt-0.5 text-[11px] text-ttd-muted max-[620px]:hidden">
						{model.subtitle}
					</p>
				</div>
				{hasQuery ? (
					<input
						type="search"
						aria-label={t("header.search")}
						placeholder={t("header.search")}
						value={model.query}
						onChange={(event) => model.onQueryChange?.(event.currentTarget.value)}
						className="h-8 w-full rounded-ttd-control bg-ttd-surface px-2.5 max-[720px]:col-span-2 max-[720px]:row-start-2 max-[620px]:h-11"
					/>
				) : null}
				{hasActions ? (
					<div
						data-screen-actions
						className="flex items-center justify-end gap-1.5 max-[720px]:col-start-2 max-[720px]:row-start-1"
					>
						{model.onToggleSelection ? (
							<button
								type="button"
								aria-label={t("header.multiSelect")}
								aria-pressed={model.selectionMode}
								onClick={model.onToggleSelection}
								className={`grid size-9 place-items-center p-0 max-[620px]:size-11 ${model.selectionMode ? "border-[var(--ttd-blue)] bg-[var(--ttd-blue-soft)] text-[var(--ttd-blue)]" : ""}`}
							>
								<Icon name="list-checks" />
							</button>
						) : null}
						{model.showSync ? (
							<button
								type="button"
								aria-label={t("header.refresh")}
								disabled={refreshing}
								onClick={() => void refresh()}
								className="grid size-9 place-items-center p-0 max-[620px]:size-11"
							>
								<Icon name="refresh-cw" className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
							</button>
						) : null}
						{compactHeader && viewOptionsModel ? (
							<ViewOptionsMenu model={viewOptionsModel} />
						) : null}
					</div>
				) : null}
			</header>
			{hasViewOptions && !compactHeader ? (
				<div className="mb-[7px] flex items-center justify-end gap-1.5 text-[11px] text-ttd-faint max-[620px]:justify-start max-[620px]:overflow-x-auto [&>select]:h-[30px] [&>select]:min-w-[120px] [&>select]:text-[11px] max-[620px]:[&>select]:h-11">
					<span>{t("header.display")}</span>
					<select
						aria-label={t("header.sort")}
						value={model.sortMode}
						onChange={(event) => void model.onSortChange?.(event.currentTarget.value)}
					>
						{SORT_OPTIONS.map(([value, key]) => (
							<option value={value} key={value}>
								{t(key)}
							</option>
						))}
					</select>
					<select
						aria-label={t("header.group")}
						value={model.groupMode}
						onChange={(event) => void model.onGroupChange?.(event.currentTarget.value)}
					>
						{GROUP_OPTIONS.map(([value, key]) => (
							<option value={value} key={value}>
								{t(key)}
							</option>
						))}
					</select>
				</div>
			) : null}
			{model.contextAction ? (
				<aside
					role="note"
					className="mb-3 flex items-center justify-between gap-3 border-l-2 border-ttd-accent px-3 py-2 text-[11px] text-ttd-muted max-[620px]:items-stretch max-[620px]:flex-col"
				>
					<span>{model.contextAction.description}</span>
					<button
						type="button"
						onClick={model.contextAction.onAction}
						className="h-8 shrink-0 rounded-ttd-control px-2.5 text-xs max-[620px]:min-h-11"
					>
						{model.contextAction.label}
					</button>
				</aside>
			) : null}
		</>
	);
}

export function DashboardMain({
	model,
	content,
	inbox,
	quickAdd,
	taskList,
	batchActions,
	calendarBatchActions,
	calendarControls,
	planTray,
	calendarTimeBlocks,
	calendarDayChrome,
	calendarMonths,
	calendarAgenda,
	calendarYear,
	review,
	reviewReminder,
	stats,
	focus,
	habits,
	countdowns,
	matrix,
	board,
	externalIssues,
	notes,
	taskDetail,
	todayFocus,
	collectionStatus,
}: {
	model: MainShellModel;
	content: HTMLElement;
	inbox: InboxTriageModel | null;
	quickAdd: QuickAddModel | null;
	taskList: TaskListModel | null;
	batchActions: BatchActionsModel | null;
	calendarBatchActions: CalendarBatchActionsModel | null;
	calendarControls: CalendarControlsModel | null;
	planTray: PlanTrayModel | null;
	calendarTimeBlocks: CalendarTimeBlocksModel[];
	calendarDayChrome: CalendarDayChromeModel[];
	calendarMonths: CalendarMonthModel[];
	calendarAgenda: CalendarAgendaModel | null;
	calendarYear: CalendarYearModel | null;
	review: ReviewModel | null;
	reviewReminder: ReviewReminderModel | null;
	stats: StatsModel | null;
	focus: FocusModel | null;
	habits: HabitsModel | null;
	countdowns: CountdownsModel | null;
	matrix: MatrixModel | null;
	board: BoardModel | null;
	externalIssues: ExternalIssuesModel | null;
	notes: NotesModel | null;
	taskDetail: TaskDetailModel | null;
	todayFocus: TodayFocusModel | null;
	collectionStatus: CollectionStatusModel | null;
}): ReactElement {
	const scrollArea = useRef<HTMLElement>(null);
	const contentSlot = useRef<HTMLDivElement>(null);
	const detailContext = useRef<{ key: string; scrollTop: number } | null>(null);
	const previousDetailKey = useRef<string | null>(null);
	const mobileDetailLayout = useMediaQuery("(max-width: 899px)");
	const fullWidth = FULL_WIDTH_VIEWS.has(model.activeId);
	const responsiveCanvas = model.activeId === "matrix";
	const collectionFatal = collectionStatus?.kind === "fatal";
	const inboxSlot = content.querySelector<HTMLElement>("[data-react-slot='inbox']");
	const quickAddSlot = content.querySelector<HTMLElement>("[data-react-slot='quick-add']");
	const todayFocusSlot = content.querySelector<HTMLElement>("[data-react-slot='today-focus']");
	const taskListSlot = content.querySelector<HTMLElement>("[data-react-slot='task-list']");
	const batchActionsSlot = content.querySelector<HTMLElement>("[data-react-slot='batch-actions']");
	const calendarBatchActionsSlot = content.querySelector<HTMLElement>(
		"[data-react-slot='calendar-batch-actions']",
	);
	const calendarControlsSlot = content.querySelector<HTMLElement>(
		"[data-react-slot='calendar-controls']",
	);
	const planTraySlot = content.querySelector<HTMLElement>("[data-react-slot='plan-tray']");
	const timeBlockSlots = Array.from(
		content.querySelectorAll<HTMLElement>("[data-react-slot='calendar-time-blocks']"),
	);
	const dayChromeSlots = Array.from(
		content.querySelectorAll<HTMLElement>("[data-react-slot='calendar-day-chrome']"),
	);
	const monthSlots = Array.from(
		content.querySelectorAll<HTMLElement>("[data-react-slot='calendar-month']"),
	);
	const agendaSlot = content.querySelector<HTMLElement>("[data-react-slot='calendar-agenda']");
	const yearSlot = content.querySelector<HTMLElement>("[data-react-slot='calendar-year']");
	const reviewSlot = content.querySelector<HTMLElement>("[data-react-slot='review']");
	const statsSlot = content.querySelector<HTMLElement>("[data-react-slot='stats']");
	const focusSlot = content.querySelector<HTMLElement>("[data-react-slot='focus']");
	const habitsSlot = content.querySelector<HTMLElement>("[data-react-slot='habits']");
	const countdownsSlot = content.querySelector<HTMLElement>("[data-react-slot='countdowns']");
	const matrixSlot = content.querySelector<HTMLElement>("[data-react-slot='matrix']");
	const boardSlot = content.querySelector<HTMLElement>("[data-react-slot='board']");
	const externalIssuesSlot = content.querySelector<HTMLElement>(
		"[data-react-slot='external-issues']",
	);
	const notesSlot = content.querySelector<HTMLElement>("[data-react-slot='notes']");
	const reviewReminderSlot = content.querySelector<HTMLElement>(
		"[data-react-slot='review-reminder']",
	);
	useLayoutEffect(() => {
		contentSlot.current?.replaceChildren(content);
		return () => content.remove();
	}, [content]);
	useLayoutEffect(() => {
		if (scrollArea.current) {
			scrollArea.current.dataset.activeScreen = model.activeId;
			scrollArea.current.scrollTop = 0;
		}
	}, [model.activeId]);
	useLayoutEffect(() => {
		const currentKey = taskDetail?.key ?? null;
		const previousKey = previousDetailKey.current;
		const main = scrollArea.current;
		if (currentKey && !previousKey && main) {
			detailContext.current = { key: currentKey, scrollTop: main.scrollTop };
		}
		if (!currentKey && previousKey && main) {
			const context = detailContext.current;
			if (context) {
				main.scrollTop = context.scrollTop;
				const trigger = [...main.querySelectorAll<HTMLElement>("[data-task-edit-trigger]")].find(
					(candidate) => candidate.dataset.taskEditTrigger === context.key,
				);
				(trigger ?? main).focus({ preventScroll: true });
			}
			detailContext.current = null;
		}
		previousDetailKey.current = currentKey;
	}, [taskDetail]);
	useLayoutEffect(() => {
		const main = scrollArea.current;
		if (!main) return;
		const mobileDetail = Boolean(taskDetail) && mobileDetailLayout;
		main.toggleAttribute("inert", mobileDetail);
		if (mobileDetail) main.setAttribute("aria-hidden", "true");
		else main.removeAttribute("aria-hidden");
	}, [mobileDetailLayout, taskDetail]);
	return (
		<div
			className={`relative grid h-full min-w-0 overflow-hidden ${taskDetail ? "min-[900px]:grid-cols-[minmax(0,1fr)_420px]" : "grid-cols-1"}`}
		>
			<main
				ref={scrollArea}
				tabIndex={-1}
				data-mobile-safe-area="content"
				className="h-full overflow-auto px-[clamp(10px,1.5vw,20px)] pb-[calc(20px+env(safe-area-inset-bottom,0px))] pt-2.5"
			>
				<div
					data-layout={fullWidth ? "canvas" : responsiveCanvas ? "responsive-canvas" : "focused"}
					className={`mx-auto w-full ${fullWidth ? "max-w-none" : responsiveCanvas ? "max-w-[1040px] min-[721px]:max-w-none" : "max-w-[780px]"}`}
				>
					<AppBar model={model} />
					{collectionStatus ? <CollectionStatus model={collectionStatus} /> : null}
					{collectionFatal ? null : (
						<>
							<ScreenHeader model={model.screen} />
							<PlanningGuide model={model.planningGuide} />
							<div ref={contentSlot} data-slot="screen-content" />
						</>
					)}
				</div>
				{reviewReminder && reviewReminderSlot
					? createPortal(<ReviewReminder model={reviewReminder} />, reviewReminderSlot)
					: null}
				{quickAdd && quickAddSlot
					? createPortal(<QuickAdd model={quickAdd} />, quickAddSlot)
					: null}
				{todayFocus && todayFocusSlot
					? createPortal(<TodayFocus model={todayFocus} />, todayFocusSlot)
					: null}
				{inbox && inboxSlot ? createPortal(<InboxTriage model={inbox} />, inboxSlot) : null}
				{taskList && taskListSlot
					? createPortal(<TaskList model={taskList} />, taskListSlot)
					: null}
				{batchActions && batchActionsSlot
					? createPortal(<BatchActions model={batchActions} />, batchActionsSlot)
					: null}
				{calendarBatchActions && calendarBatchActionsSlot
					? createPortal(
							<CalendarBatchActions model={calendarBatchActions} />,
							calendarBatchActionsSlot,
						)
					: null}
				{calendarControls && calendarControlsSlot
					? createPortal(<CalendarControls model={calendarControls} />, calendarControlsSlot)
					: null}
				{planTray && planTraySlot
					? createPortal(<PlanTray model={planTray} />, planTraySlot)
					: null}
				{calendarTimeBlocks.map((timeBlocks) => {
					const slot = timeBlockSlots.find(
						(candidate) => candidate.dataset.date === timeBlocks.date,
					);
					return slot
						? createPortal(<CalendarTimeBlocks key={timeBlocks.date} model={timeBlocks} />, slot)
						: null;
				})}
				{calendarDayChrome.map((dayChrome) => {
					const slot = dayChromeSlots.find(
						(candidate) => candidate.dataset.date === dayChrome.date,
					);
					return slot
						? createPortal(<CalendarDayChrome key={dayChrome.date} model={dayChrome} />, slot)
						: null;
				})}
				{calendarMonths.map((month, index) =>
					monthSlots[index]
						? createPortal(
								<CalendarMonth key={`${month.cells[0]?.date || "month"}:${index}`} model={month} />,
								monthSlots[index],
							)
						: null,
				)}
				{calendarAgenda && agendaSlot
					? createPortal(<CalendarAgenda model={calendarAgenda} />, agendaSlot)
					: null}
				{calendarYear && yearSlot
					? createPortal(<CalendarYear model={calendarYear} />, yearSlot)
					: null}
				{review && reviewSlot ? createPortal(<Review model={review} />, reviewSlot) : null}
				{stats && statsSlot ? createPortal(<Stats model={stats} />, statsSlot) : null}
				{focus && focusSlot ? createPortal(<Focus model={focus} />, focusSlot) : null}
				{habits && habitsSlot ? createPortal(<Habits model={habits} />, habitsSlot) : null}
				{countdowns && countdownsSlot
					? createPortal(<Countdowns model={countdowns} />, countdownsSlot)
					: null}
				{matrix && matrixSlot ? createPortal(<Matrix model={matrix} />, matrixSlot) : null}
				{board && boardSlot ? createPortal(<Board model={board} />, boardSlot) : null}
				{externalIssues && externalIssuesSlot
					? createPortal(<ExternalIssues model={externalIssues} />, externalIssuesSlot)
					: null}
				{notes && notesSlot ? createPortal(<Notes model={notes} />, notesSlot) : null}
			</main>
			{taskDetail ? <TaskDetail model={taskDetail} /> : null}
		</div>
	);
}
