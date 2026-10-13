import { createRoot } from "react-dom/client";
import { createVirtualObsidian, initializeVirtualObsidian } from "virtual-obsidian";
import { CalendarControls } from "../../src/ui/calendar-controls";
import { CalendarMonth } from "../../src/ui/calendar-month";
import { CalendarTimeBlocks } from "../../src/ui/calendar-time-blocks";
import { CalendarViewOptionsDialog } from "../../src/ui/calendar-view-options-dialog";
import { DashboardMain } from "../../src/ui/dashboard-main";
import { ExternalIssues } from "../../src/ui/external-issues";
import { InboxTriage } from "../../src/ui/inbox-triage";
import { I18nProvider } from "../../src/ui/i18n";
import { Matrix } from "../../src/ui/matrix";
import { PlanningGuide } from "../../src/ui/planning-guide";
import { PlanTray } from "../../src/ui/plan-tray";
import { Review } from "../../src/ui/review";
import { ReviewReminder } from "../../src/ui/review-reminder";
import { Stats } from "../../src/ui/stats";
import { TaskList, type TaskListItem } from "../../src/ui/task-list";
import { TaskDetail } from "../../src/ui/task-detail";
import { TodayFocus } from "../../src/ui/today-focus";
import { CollectionStatus } from "../../src/ui/collection-status";

document.documentElement.dataset.theme =
	new URLSearchParams(location.search).get("theme") === "dark" ? "dark" : "light";
const visualScenario = new URLSearchParams(location.search).get("scenario") ?? "today";

function html(value: string): HTMLElement {
	const element = document.createElement("div");
	element.textContent = value;
	return element;
}

const tasks: TaskListItem[] = [
	{
		key: "1",
		title: html("移行手順を確定し、関係者レビューへ出す"),
		note: html("Linear PPR-8189から取り込み"),
		priority: 3,
		depth: 0,
		done: false,
		wontDo: false,
		disabled: false,
		draggable: true,
		selected: false,
		completeLabel: "完了にする",
		onComplete: () => {},
		onEdit: () => {},
		actions: [{ icon: "ellipsis", label: "編集", onAction: () => {} }],
		nextStatus: { icon: "refresh-cw", label: "進行中へ", onAction: () => {} },
		meta: [{ label: "今日" }, { label: "仕事" }, { label: "Linear", tone: "status" }],
	},
	{
		key: "2",
		title: html("供給稼働を星取表へ反映する"),
		priority: 2,
		depth: 0,
		done: false,
		wontDo: false,
		disabled: false,
		draggable: true,
		selected: false,
		completeLabel: "完了にする",
		onComplete: () => {},
		onEdit: () => {},
		actions: [],
		meta: [{ label: "明日" }, { label: "30分" }],
	},
];

function TodayPreview() {
	return (
		<main className="ttd-app visual-shell bg-ttd-canvas text-ttd-text">
			<header className="visual-header border-b border-ttd-border">
				<div>
					<h1 className="m-0 text-lg">今日</h1>
					<p className="mb-0 mt-0.5 text-[11px] text-ttd-muted">2026-10-09 · 2件</p>
				</div>
				<input
					aria-label="タスクを検索"
					placeholder="タスクを検索"
					className="visual-search h-9 rounded-ttd-control bg-ttd-surface px-2.5"
				/>
			</header>
			<TodayFocus
				model={{ item: { ...tasks[0], title: html("移行手順を確定し、関係者レビューへ出す") } }}
			/>
			<section aria-label="今日のタスク">
				<TaskList
					model={{
						empty: {
							icon: "check-check",
							title: "今日のタスクはない",
							description: "受信箱から予定を決める。",
						},
						groups: [{ label: "残り", items: tasks.slice(1) }],
					}}
				/>
			</section>
			<ReviewReminder
				model={{
					detail: "2026-10-09に決めた重点。未配置の項目を時間割へ送る。",
					focus: {
						date: "2026-10-09",
						items: [
							{ title: "配布を安定させる", label: "時間割済み", action: "open" },
							{
								title: "次回リリースに向けて移行順序とロールバック条件を関係者と確定する",
								label: "未配置",
								action: "plan",
							},
						],
					},
					reviewDue: false,
					onOpen: () => {},
					onDismiss: () => {},
					onPlanFocus: () => {},
				}}
			/>
			<InboxTriage
				model={{
					total: 2,
					errors: [],
					items: [
						{
							externalId: "linear:PPR-9000",
							icon: "circle",
							sourceLabel: "Linear",
							title: "次回リリースの移行計画を確定する",
							meta: "In Progress · 期限 2026-10-12",
							labels: ["backend"],
							url: "#",
						},
						{
							externalId: "slack:C1:1",
							icon: "circle",
							sourceLabel: "Slack",
							title: "設計レビューのコメントをタスクへ反映する",
							meta: "#project-orion",
							url: "#",
						},
					],
					onImport: () => {},
					onImportAndPlan: () => {},
					onDismiss: () => {},
					onShowAll: () => {},
				}}
			/>
		</main>
	);
}

function CollectionLoadingPreview() {
	return (
		<main className="ttd-app grid min-h-screen place-items-center bg-ttd-canvas p-4 text-ttd-text">
			<div role="status" className="flex min-h-60 items-center justify-center gap-2 text-ttd-muted">
				<span className="size-4 animate-spin rounded-full border-2 border-ttd-border border-t-ttd-accent" />
				<span>タスクを読み込み中</span>
			</div>
		</main>
	);
}

function CollectionFailurePreview({ fatal }: { fatal: boolean }) {
	return (
		<main className="ttd-app min-h-screen bg-ttd-canvas px-[clamp(10px,1.5vw,20px)] py-3 text-ttd-text">
			<div className="mx-auto w-full max-w-[780px]">
				<CollectionStatus
					model={{
						failedCount: fatal ? 12 : 2,
						kind: fatal ? "fatal" : "partial",
						onRetry: () => {},
					}}
				/>
				{fatal ? null : (
					<>
						<header className="mb-2 border-b border-ttd-border pb-2">
							<h1 className="m-0 text-lg">今日</h1>
							<p className="mb-0 mt-0.5 text-[11px] text-ttd-muted">読み込めたタスク 2件</p>
						</header>
						<TaskList
							model={{
								empty: { icon: "check-check", title: "タスクはない", description: "" },
								groups: [{ label: "読込済み", items: tasks }],
							}}
						/>
					</>
				)}
			</div>
		</main>
	);
}

function TaskDetailPreview() {
	return (
		<div
			style={{ height: "100vh" }}
			className="ttd-app relative grid min-w-0 grid-cols-1 overflow-hidden bg-ttd-canvas text-ttd-text min-[900px]:grid-cols-[minmax(0,1fr)_420px]"
		>
			<main className="overflow-y-auto p-4">
				<header className="mb-3 border-b border-ttd-border pb-2">
					<h1 className="m-0 text-lg">今日</h1>
					<p className="mb-0 mt-0.5 text-[11px] text-ttd-muted">2026-10-13 · 2件</p>
				</header>
				<TaskList
					model={{
						empty: {
							icon: "check-check",
							title: "今日のタスクはない",
							description: "受信箱から予定を決める。",
						},
						groups: [{ label: "今日", items: tasks }],
					}}
				/>
			</main>
			<TaskDetail
				model={{
					key: "1",
					dialog: {
						initial: {
							description: "移行手順を確定し、関係者レビューへ出す",
							due: "2026-10-13",
							startAt: "2026-10-13T09:00",
							endAt: "2026-10-13T10:30",
							status: "doing",
							priority: 3,
							important: true,
							urgent: false,
							list: "仕事",
							section: "次回リリース",
							tags: ["migration"],
							repeat: "",
							reminders: ["2026-10-13T08:45"],
							progress: 50,
							progressAuto: false,
							estimatedPomos: 3,
							estimatedMinutes: 90,
							note: "Linear PPR-8189のレビュー結果を反映する。",
							newComment: "",
							attachments: [],
							existingSubtasks: [
								{ line: 2, description: "ロールバック条件を確認する", reminders: [] },
							],
							newSubtasks: [],
						},
						lists: ["仕事", "個人"],
						statuses: [
							{ id: "todo", name: "未着手" },
							{ id: "doing", name: "進行中" },
						],
						comments: [],
						activities: [],
						validateRepeat: () => true,
						attachmentsOf: () => [],
						removeAttachment: (note) => note,
						onOpenAttachment: () => {},
						onCancel: () => {},
						onSave: () => {},
						onSaveTemplate: () => {},
					},
				}}
			/>
		</div>
	);
}

function PlanningGuidePreview() {
	return (
		<main className="ttd-app min-h-screen bg-ttd-canvas p-3 text-ttd-text">
			<PlanningGuide
				model={{
					available: true,
					inboxRemaining: 2,
					overdueRemaining: 1,
					unplannedRemaining: 4,
					selectedCount: 0,
					focusCount: 1,
					onNavigate: () => {},
				}}
			/>
		</main>
	);
}

function ReviewOverflowTasksPreview() {
	const content = document.createElement("div");
	content.innerHTML = '<div data-react-slot="task-list"></div>';
	return (
		<div className="ttd-app h-screen bg-ttd-canvas text-ttd-text">
			<DashboardMain
				model={{
					activeId: "review-overflow",
					primary: [
						{ id: "today", icon: "sun", label: "今日", count: 2 },
						{ id: "calendar", icon: "calendar-days", label: "時間割", count: 0 },
					],
					sidebarOpen: false,
					screen: {
						title: "未確認の持ち越し",
						subtitle: "6件",
						query: "",
						sortMode: "smart",
						groupMode: "auto",
						contextAction: {
							description: "今回の振り返りでまだ判断していない持ち越しだけを表示している。",
							label: "振り返りへ戻る",
							onAction: () => {},
						},
					},
					onSelect: () => {},
					onToggleSidebar: () => {},
					onOpenSidebar: () => {},
					planningGuide: {
						available: false,
						inboxRemaining: 2,
						overdueRemaining: 1,
						unplannedRemaining: 3,
						selectedCount: 0,
						focusCount: 1,
						onNavigate: () => {},
					},
				}}
				content={content}
				inbox={null}
				quickAdd={null}
				taskList={{
					empty: {
						icon: "check-check",
						title: "未確認の持ち越しはない",
						description: "振り返りへ戻って次の7日間を決める。",
					},
					groups: [
						{
							items: [
								...tasks,
								...tasks.map((task, index) => ({
									...task,
									key: `copy-${index}`,
									title: html(
										index === 0 ? "権限設計を関係者と確定する" : "モバイル配布手順を実機で確認する",
									),
								})),
							],
						},
					],
				}}
				batchActions={null}
				calendarBatchActions={null}
				calendarControls={null}
				planTray={null}
				calendarTimeBlocks={[]}
				calendarDayChrome={[]}
				calendarMonths={[]}
				calendarAgenda={null}
				calendarYear={null}
				review={null}
				reviewReminder={null}
				stats={null}
				focus={null}
				habits={null}
				countdowns={null}
				matrix={null}
				board={null}
				externalIssues={null}
				notes={null}
				collectionStatus={null}
			/>
		</div>
	);
}

function CalendarPreview() {
	return (
		<main className="ttd-app visual-shell bg-ttd-canvas text-ttd-text">
			<header className="visual-header border-b border-ttd-border">
				<div>
					<h1 className="m-0 text-lg">時間割</h1>
					<p className="mb-0 mt-0.5 text-[11px] text-ttd-muted">予定とタスクを同じ時間軸で調整</p>
				</div>
			</header>
			<CalendarControls
				model={{
					activeMode: "day",
					filterLabel: "全リスト",
					googleLabel: "Google 1",
					label: "10月9日(金)",
					modes: [
						{ id: "day", label: "日" },
						{ id: "3day", label: "3日" },
						{ id: "week", label: "週" },
						{ id: "month", label: "月" },
						{ id: "agenda", label: "一覧" },
					],
					nextLabel: "翌日",
					onMode: () => {},
					onNext: () => {},
					onOpenFilter: () => {},
					onOpenGoogle: () => {},
					onOpenSubscriptions: () => {},
					onOpenViewOptions: () => {},
					onPrevious: () => {},
					onSearch: () => {},
					onSelectMode: () => {},
					onToday: () => {},
					previousLabel: "前日",
					search: "",
					selectionMode: false,
					subscriptionLabel: "購読 1",
				}}
			/>
			<div className="visual-calendar-shell border border-ttd-border bg-ttd-canvas">
				<div className="visual-calendar-heading border-b border-ttd-border">
					<strong>10月9日(金)</strong>
					<span className="text-ttd-muted">オフィス</span>
				</div>
				<div data-calendar-scroll data-calendar-timeline className="visual-calendar-scroll">
					<CalendarTimeBlocks
						model={{
							autoScrollMinutes: null,
							compact: false,
							currentMinutes: 13 * 60 + 19,
							date: "2026-10-09",
							hideDetails: false,
							hours: Array.from({ length: 11 }, (_, index) => ({ hour: index + 8, zones: [] })),
							items: [
								{
									kind: "event",
									title: "Orion開発LDR定例",
									meta: "11:00–12:00 · Google Calendar",
									url: "#",
									color: "#668cff",
									startHour: 8,
									startMinutes: 11 * 60,
									endMinutes: 12 * 60,
									lane: 0,
									lanes: 1,
								},
								{
									kind: "task",
									title: html("移行手順を確定し、関係者レビューへ出す"),
									color: "#e25454",
									conflictLabel: "",
									done: false,
									dragPayload: "task:1",
									multiDay: false,
									onLonger: () => {},
									onResize: () => {},
									onShorter: () => {},
									onToggleSelection: () => {},
									onUnschedule: () => {},
									selected: false,
									selectionMode: false,
									startHour: 8,
									startMinutes: 13 * 60 + 30,
									endMinutes: 14 * 60 + 30,
									lane: 0,
									lanes: 1,
									virtual: false,
								},
							],
							onCreate: () => {},
							onDrop: () => {},
							onScroll: () => {},
							savedScrollTop: 128,
							scrollGroup: null,
						}}
					/>
				</div>
			</div>
		</main>
	);
}

function CalendarPlanningPreview() {
	return (
		<main className="ttd-app h-screen bg-ttd-canvas p-2 text-ttd-text">
			<div className="grid h-full min-h-0 grid-cols-[220px_minmax(0,1fr)] overflow-hidden rounded-lg border border-ttd-border max-[720px]:grid-cols-1 max-[720px]:grid-rows-[auto_minmax(0,1fr)]">
				<PlanTray
					model={{
						collapsed: false,
						date: "2026-10-09",
						items: [
							{
								color: "#e25454",
								context: "仕事",
								dragPayload: "task:1",
								key: "1",
								meta: "今日",
								onOpen: () => {},
								onSelect: () => {},
								onToggle: () => {},
								plainTitle: "移行手順を確定する",
								searchText: "移行手順を確定する 仕事",
								selected: false,
								title: html("移行手順を確定する"),
							},
							{
								color: "#d79a32",
								context: "Inbox",
								dragPayload: "task:2",
								key: "2",
								meta: "明日",
								onOpen: () => {},
								onSelect: () => {},
								onToggle: () => {},
								plainTitle: "設計レビューの判断事項を整理する",
								searchText: "設計レビューの判断事項を整理する inbox",
								selected: false,
								title: html("設計レビューの判断事項を整理する"),
							},
						],
						onSchedule: () => {},
						onScheduleAvailable: () => {},
						onSort: () => {},
						onToggleCollapsed: () => {},
						onToggleSelection: () => {},
						selectedCount: 0,
						selectionMode: false,
						sort: "priority",
					}}
				/>
				<div className="grid place-items-center bg-ttd-canvas p-6 text-center">
					<div>
						<strong className="text-sm">10月9日(金)</strong>
						<p className="mt-1 text-xs text-ttd-muted">未配置タスクを空き時間へ移動する</p>
					</div>
				</div>
			</div>
		</main>
	);
}

function CalendarViewOptionsPreview() {
	return (
		<main className="ttd-app min-h-screen bg-ttd-canvas p-4 text-ttd-text">
			<CalendarViewOptionsDialog
				model={{
					initial: {
						colorMode: "list",
						density: "comfortable",
						showCompleted: false,
						showDetails: true,
						showEvents: true,
						showFocus: true,
						showFutureRepeats: true,
						showHabits: true,
						showTasks: true,
						timeZones: ["Asia/Tokyo"],
					},
					onCancel: () => {},
					onSave: () => {},
					validateTimeZone: () => true,
				}}
			/>
		</main>
	);
}

function CalendarMonthPreview() {
	const cells = Array.from({ length: 42 }, (_, index) => {
		const day = index - 2;
		const date = `2026-10-${String(Math.max(1, Math.min(31, day))).padStart(2, "0")}`;
		return {
			date,
			dayLabel: String(day > 0 && day <= 31 ? day : day <= 0 ? 30 + day : day - 31),
			entries:
				day === 9
					? [
							{ kind: "event" as const, color: "#668cff", title: "開発定例", url: "#event" },
							{
								kind: "task" as const,
								color: "#e25454",
								done: false,
								dragPayload: "task:1",
								onOpen: () => {},
								repeat: false,
								time: "13:30",
								title: html("移行手順を確定する"),
							},
							{
								kind: "activity" as const,
								achieved: true,
								icon: "flame",
								title: "集中時間",
								type: "focus",
							},
						]
					: [],
			onDrop: () => {},
			onOpenDay: () => {},
			outside: day <= 0 || day > 31,
			today: day === 9,
		};
	});
	return (
		<main className="ttd-app h-screen min-w-0 bg-ttd-canvas px-2 text-ttd-text">
			<CalendarMonth model={{ cells, multiweek: false }} />
		</main>
	);
}

function MatrixPreview() {
	const quadrants = [
		{ id: "do", label: "重要・緊急", action: "今すぐやる", tone: "do" as const },
		{ id: "plan", label: "重要・緊急ではない", action: "予定に入れる", tone: "plan" as const },
		{ id: "delegate", label: "重要ではない・緊急", action: "委任する", tone: "delegate" as const },
		{ id: "drop", label: "重要でも緊急でもない", action: "減らす", tone: "drop" as const },
	];
	return (
		<main className="ttd-app min-h-screen bg-ttd-canvas p-3 text-ttd-text">
			<Matrix
				model={{
					quadrants: quadrants.map((quadrant, index) => ({
						...quadrant,
						onDrop: () => {},
						tasks: index
							? []
							: [
									{
										key: "task-1",
										plainTitle: "移行手順を確定する",
										title: html("移行手順を確定する"),
										list: "",
										dueLabel: "今日",
										priorityLabel: "高優先度",
										dragPayload: "task:1",
										quadrantId: "do",
										onEdit: () => {},
										onMove: () => {},
									},
								],
					})),
				}}
			/>
		</main>
	);
}

function InboxPreview() {
	return (
		<main className="ttd-app visual-shell bg-ttd-canvas text-ttd-text">
			<header className="visual-header border-b border-ttd-border">
				<div>
					<h1 className="m-0 text-lg">統合Inbox</h1>
					<p className="mb-0 mt-0.5 text-[11px] text-ttd-muted">
						外部候補を判断して、実行する時間まで決める
					</p>
				</div>
			</header>
			<InboxTriage
				model={{
					total: 7,
					errors: ["Jira: 一部のIssueを取得できなかった。接続設定を確認してほしい。"],
					items: [
						{
							externalId: "linear:PPR-9000",
							icon: "square-kanban",
							sourceLabel: "Linear",
							title: "次回リリースに向けて移行順序、ロールバック条件、担当者を関係者と確定する",
							meta: "In Progress · 期限 2026-10-12 · backend",
							labels: ["backend"],
							url: "#linear",
						},
						{
							externalId: "jira:OPS-142",
							icon: "panels-top-left",
							sourceLabel: "Jira",
							title: "本番監視アラートの閾値を見直す",
							meta: "レビュー待ち · 期限 2026-10-14 · High",
							labels: ["ops"],
							url: "#jira",
						},
						{
							externalId: "slack:C123:B1",
							icon: "bookmark",
							sourceLabel: "Slack",
							title: "設計レビューで共有された判断事項をタスクへ反映する",
							meta: "#project-orion · ブックマーク",
							labels: ["bookmark"],
							url: "#slack",
						},
					],
					onImport: () => {},
					onImportAndPlan: () => {},
					onDismiss: () => {},
					onShowAll: () => {},
				}}
			/>
		</main>
	);
}

function StatsPreview() {
	return (
		<main className="ttd-app visual-shell bg-ttd-canvas text-ttd-text">
			<header className="visual-header border-b border-ttd-border">
				<div>
					<h1 className="m-0 text-lg">実績</h1>
					<p className="mb-0 mt-0.5 text-[11px] text-ttd-muted">
						直近7日の行動を次の重点へつなげる
					</p>
				</div>
			</header>
			<Stats
				model={{
					summary: [
						{ icon: "circle-check-big", label: "直近7日の完了", value: "12件" },
						{ icon: "calendar-check", label: "直近7日の計画実行", value: "7/9件" },
						{ icon: "timer", label: "直近7日の集中", value: "285分" },
						{ icon: "flame", label: "直近7日の習慣達成率", value: "82%" },
					],
					completionDays: [0, 1, 2, 0, 3, 1, 1, 2, 1, 4, 0, 2, 3, 0].map((count, index) => ({
						count,
						date: `2026-10-${String(index + 1).padStart(2, "0")}`,
						label: String(index + 1).padStart(2, "0"),
					})),
					priorities: [
						{ label: "高", count: 4 },
						{ label: "通常", count: 3 },
						{ label: "低", count: 1 },
					],
					lists: [
						{ label: "仕事", count: 5 },
						{ label: "Inbox", count: 2 },
						{ label: "個人", count: 1 },
					],
					openCount: 8,
					overdueCount: 2,
					onOpenReview: () => {},
				}}
			/>
		</main>
	);
}

function ExternalIssuesPreview() {
	return (
		<main className="ttd-app visual-shell bg-ttd-canvas text-ttd-text">
			<header className="visual-header border-b border-ttd-border">
				<div>
					<h1 className="m-0 text-lg">外部Issue</h1>
					<p className="mb-0 mt-0.5 text-[11px] text-ttd-muted">連携元とラベルで候補を絞り込む</p>
				</div>
			</header>
			<ExternalIssues
				model={{
					errors: [],
					sources: [
						{ label: "Linear", count: 4 },
						{ label: "Jira", count: 2 },
						{ label: "Slack", count: 1 },
					],
					labels: ["backend", "High", "bookmark"],
					activeLabel: "",
					showHandled: true,
					items: [
						{
							externalId: "linear:PPR-9000",
							icon: "square-kanban",
							sourceLabel: "Linear",
							title: "移行順序とロールバック条件を関係者と確定する",
							meta: "In Progress · 期限 2026-10-12",
							labels: ["backend"],
							url: "#linear",
							state: null,
							onImport: () => {},
							onImportAndPlan: () => {},
							onDismiss: () => {},
						},
						{
							externalId: "jira:OPS-142",
							icon: "panels-top-left",
							sourceLabel: "Jira",
							title: "監視アラートの閾値を見直す",
							meta: "レビュー待ち · 期限 2026-10-14",
							labels: ["High"],
							url: "#jira",
							state: null,
							onImport: () => {},
							onImportAndPlan: () => {},
							onDismiss: () => {},
						},
						{
							externalId: "slack:C123:B1",
							icon: "bookmark",
							sourceLabel: "Slack",
							title: "設計レビューの判断事項を記録する",
							meta: "#project-orion",
							labels: ["bookmark"],
							url: "#slack",
							state: "imported",
							onImport: () => {},
							onImportAndPlan: () => {},
							onPlan: () => {},
							onDismiss: () => {},
						},
					],
					onSelectLabel: () => {},
					onToggleHandled: () => {},
				}}
			/>
		</main>
	);
}

function ReviewPreview({
	disabled = false,
	history = false,
	overflow = false,
}: {
	disabled?: boolean;
	history?: boolean;
	overflow?: boolean;
}) {
	return (
		<main className="ttd-app visual-shell bg-ttd-canvas text-ttd-text">
			<header className="visual-header border-b border-ttd-border">
				<div>
					<h1 className="m-0 text-lg">振り返り</h1>
					<p className="mb-0 mt-0.5 text-[11px] text-ttd-muted">実績から次の7日間を決める</p>
				</div>
			</header>
			<Review
				model={{
					history: history
						? [
								{ path: "private/reviews/2026-10-09.md", label: "2026-10-09", onOpen: () => {} },
								{ path: "private/reviews/2026-10-02.md", label: "2026-10-02", onOpen: () => {} },
								{ path: "private/reviews/2026-09-25.md", label: "2026-09-25", onOpen: () => {} },
							]
						: [],
					previousFocus: {
						date: "2026-10-02",
						items: [
							{ title: "移行手順を確定する", label: "完了", action: null },
							{ title: "供給稼働を星取表へ反映する", label: "時間割済み", action: "open" },
							{ title: "設計レビューを返す", label: "未配置", action: "plan" },
						],
					},
					summary: [
						{ label: "完了", value: "7件" },
						{ label: "計画実行", value: "5/7件" },
						{ label: "集中", value: "180分" },
						{ label: "継続中", value: "4件" },
					],
					achievements: [
						{ title: "移行手順を確定する", meta: "2026-10-08", source: "Linear" },
						{ title: "レビュー指摘を反映する", meta: "2026-10-07" },
					],
					focus: [
						{ title: "移行手順を確定する", meta: "2026-10-08 · 50分" },
						{ title: "設計レビュー", meta: "2026-10-07 · 25分" },
					],
					carryovers: disabled
						? []
						: [
								{
									key: "carry-1",
									title: "供給稼働を星取表へ反映する",
									reason: "capacity",
									context: "時間割・期限超過",
									source: "Jira",
								},
								{
									key: "carry-2",
									title: "権限設計を関係者と確定する",
									reason: "blocked",
									context: "期限超過",
								},
							],
					carryoverOverflowCount: overflow ? 6 : 0,
					draft: disabled
						? { wins: "", friction: "", lessons: "", next: "" }
						: {
								wins: "レビューを前倒しできた",
								friction: "権限確認に時間がかかった",
								lessons: "依存関係を先に確認する",
								next: "供給稼働を星取表へ反映する\n権限設計を確定する",
							},
					onDraftChange: () => {},
					onPersistDraft: () => {},
					onOpenRemainingCarryovers: () => {},
					onPlanPreviousFocus: () => {},
					onReasonChange: () => {},
					onSave: () => {},
				}}
			/>
		</main>
	);
}

async function main(): Promise<void> {
	await initializeVirtualObsidian();
	const runtime = createVirtualObsidian({
		files: [
			{
				path: "Tasks/Today.md",
				content:
					"# 今日\n\n- [ ] 移行手順を確定し、関係者レビューへ出す\n- [ ] 供給稼働を星取表へ反映する",
			},
		],
		activeFile: "Tasks/Today.md",
		mobile: window.innerWidth <= 720,
	});
	const file = runtime.app.vault.getAbstractFileByPath("Tasks/Today.md");
	if (!file || !("extension" in file)) throw new Error("Missing virtual task file");
	const markdown = await runtime.app.vault.read(file);
	const titles = [...markdown.matchAll(/^\s*-\s+\[[ xX]\]\s+(.+)$/gmu)].map(
		(match) => match[1] ?? "",
	);
	for (const [index, title] of titles.entries()) {
		if (tasks[index]) tasks[index].title = html(title);
	}
	document.documentElement.dataset.virtualObsidianEngine = runtime.engine;
	createRoot(document.getElementById("root")!).render(
		<I18nProvider locale="ja">
			{visualScenario === "collection-loading" ? (
				<CollectionLoadingPreview />
			) : visualScenario === "collection-partial" ? (
				<CollectionFailurePreview fatal={false} />
			) : visualScenario === "collection-fatal" ? (
				<CollectionFailurePreview fatal />
			) : visualScenario === "calendar" ? (
				<CalendarPreview />
			) : visualScenario === "calendar-planning" ? (
				<CalendarPlanningPreview />
			) : visualScenario === "calendar-view-options" ? (
				<CalendarViewOptionsPreview />
			) : visualScenario === "planning-guide" ? (
				<PlanningGuidePreview />
			) : visualScenario === "calendar-month" ? (
				<CalendarMonthPreview />
			) : visualScenario === "matrix" ? (
				<MatrixPreview />
			) : visualScenario === "inbox" ? (
				<InboxPreview />
			) : visualScenario === "external-issues" ? (
				<ExternalIssuesPreview />
			) : visualScenario === "stats" ? (
				<StatsPreview />
			) : visualScenario === "review" ? (
				<ReviewPreview />
			) : visualScenario === "review-history" ? (
				<ReviewPreview history />
			) : visualScenario === "review-overflow" ? (
				<ReviewPreview overflow />
			) : visualScenario === "review-overflow-tasks" || visualScenario === "view-options" ? (
				<ReviewOverflowTasksPreview />
			) : visualScenario === "review-disabled" ? (
				<ReviewPreview disabled />
			) : visualScenario === "task-detail" ? (
				<TaskDetailPreview />
			) : (
				<TodayPreview />
			)}
		</I18nProvider>,
	);
}

void main();
