import { Component, type ErrorInfo, type ReactElement, type ReactNode } from "react";
import { I18nProvider, type TaktuneLocale, useI18n } from "./i18n";
import { DashboardMain, type MainShellModel } from "./dashboard-main";
import { DashboardSidebar, type SidebarModel } from "./dashboard-sidebar";
import type { InboxTriageModel } from "./inbox-triage";
import type { QuickAddModel } from "./quick-add";
import type { TaskListModel } from "./task-list";
import type { CalendarControlsModel } from "./calendar-controls";
import type { PlanTrayModel } from "./plan-tray";
import type { CalendarTimeBlocksModel } from "./calendar-time-blocks";
import type { CalendarDayChromeModel } from "./calendar-day-chrome";
import type { CalendarMonthModel } from "./calendar-month";
import type { CalendarAgendaModel } from "./calendar-agenda";
import type { CalendarYearModel } from "./calendar-year";
import type { ReviewModel } from "./review";
import type { StatsModel } from "./stats";
import type { FocusModel } from "./focus";
import type { HabitsModel } from "./habits";
import type { CountdownsModel } from "./countdowns";
import type { MatrixModel } from "./matrix";
import type { BoardModel } from "./board";
import type { ExternalIssuesModel } from "./external-issues";
import type { NotesModel } from "./notes";
import type { ReviewReminderModel } from "./review-reminder";
import type { BatchActionsModel } from "./batch-actions";
import type { CalendarBatchActionsModel } from "./calendar-batch-actions";
import type { TaskDetailModel } from "./task-detail";
import type { TodayFocusModel } from "./today-focus";
import type { CollectionStatusModel } from "./collection-status";

interface DashboardHostProps {
	locale?: TaktuneLocale;
	sidebar: SidebarModel;
	main: MainShellModel;
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
	onRetry: () => void;
}

export class DashboardErrorBoundary extends Component<
	{ children: ReactNode; onRetry: () => void },
	{ error: Error | null }
> {
	state: { error: Error | null } = { error: null };

	static getDerivedStateFromError(error: Error): { error: Error } {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo): void {
		console.error("Taktune: failed to render React view", error, info.componentStack);
	}

	retry = (): void => {
		this.setState({ error: null });
		this.props.onRetry();
	};

	render(): ReactNode {
		if (!this.state.error) return this.props.children;
		return <LocalizedRenderError error={this.state.error} onRetry={this.retry} />;
	}
}

function LocalizedRenderError({
	error,
	onRetry,
}: {
	error: Error;
	onRetry: () => void;
}): ReactElement {
	const t = useI18n();
	return (
		<main role="alert" className="grid min-h-60 place-items-center p-5 text-center">
			<div className="max-w-md">
				<h1 className="m-0 text-base font-semibold">{t("error.render.title")}</h1>
				<p className="mb-3 mt-1 break-words text-xs text-[var(--text-muted)]">
					{error.message || t("error.render.unexpected")}
				</p>
				<button
					type="button"
					onClick={onRetry}
					className="mod-cta min-h-9 px-3 text-xs max-[620px]:min-h-11 max-[620px]:w-full"
				>
					{t("common.retry")}
				</button>
			</div>
		</main>
	);
}

export function DashboardHost({
	locale = "ja",
	sidebar,
	main,
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
	onRetry,
}: DashboardHostProps): ReactElement {
	return (
		<I18nProvider locale={locale}>
			<DashboardErrorBoundary onRetry={onRetry}>
				<DashboardSidebar model={sidebar} />
				<DashboardMain
					model={main}
					content={content}
					inbox={inbox}
					quickAdd={quickAdd}
					taskList={taskList}
					batchActions={batchActions}
					calendarBatchActions={calendarBatchActions}
					calendarControls={calendarControls}
					planTray={planTray}
					calendarTimeBlocks={calendarTimeBlocks}
					calendarDayChrome={calendarDayChrome}
					calendarMonths={calendarMonths}
					calendarAgenda={calendarAgenda}
					calendarYear={calendarYear}
					review={review}
					reviewReminder={reviewReminder}
					stats={stats}
					focus={focus}
					habits={habits}
					countdowns={countdowns}
					matrix={matrix}
					board={board}
					externalIssues={externalIssues}
					notes={notes}
					taskDetail={taskDetail}
					todayFocus={todayFocus}
					collectionStatus={collectionStatus}
				/>
			</DashboardErrorBoundary>
		</I18nProvider>
	);
}
