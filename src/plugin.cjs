const {
	ItemView,
	MarkdownRenderer,
	Modal,
	Notice,
	Platform,
	Plugin,
	PluginSettingTab,
	SecretComponent,
	Setting,
	TFile,
	normalizePath,
	requestUrl,
	setIcon,
} = require("obsidian");
const React = require("react");
const { createRoot } = require("react-dom/client");
const { DashboardHost } = require("./ui/dashboard-host.tsx");
const { taskEditInitialValue } = require("./ui/task-edit-model.ts");
const { extractTodayFocus } = require("./ui/today-focus.tsx");
const { setDefaultLocale } = require("./ui/i18n.tsx");
const { QuickAddDialog } = require("./ui/quick-add-dialog.tsx");
const { CalendarTaskDialog } = require("./ui/calendar-task-dialog.tsx");
const { MergeTasksDialog, NameDialog } = require("./ui/common-dialogs.tsx");
const { SavedFilterDialog, TaxonomyEditDialog } = require("./ui/taxonomy-filter-dialogs.tsx");
const { CountdownDialog } = require("./ui/countdown-dialog.tsx");
const { HabitDialog } = require("./ui/habit-dialog.tsx");
const { ReminderDialog } = require("./ui/reminder-dialog.tsx");
const {
	CalendarListFilterDialog,
	GoogleCalendarSourcesDialog,
} = require("./ui/calendar-source-dialogs.tsx");
const { CalendarSubscriptionsDialog } = require("./ui/calendar-subscriptions-dialog.tsx");
const { CalendarViewOptionsDialog } = require("./ui/calendar-view-options-dialog.tsx");
const {
	DiagnosticsDialog,
	copyTextToClipboard,
	diagnosticsReport,
} = require("./ui/diagnostics-dialog.tsx");
const { previousReviewFocus, reviewFocusProgress } = require("./ui/contracts.ts");
const {
	completedReviewRecord,
	completedTaskCount,
	emptyReviewDraft,
	requiredReviewFocusItems,
	reviewDraftSnapshot,
	reviewHistoryPaths,
	reviewMetricComparison,
	reviewPeriodSnapshot,
	reviewPlanComparison,
	reviewSummary,
	weeklyPlanReview,
	weeklyReviewPrompt,
	weeklyReviewSnoozeUntil,
	weekStart,
} = require("./review-domain.cjs");
const { addDays, localDate } = require("./date-domain.cjs");
const {
	calendarCacheKey,
	googleCalendarCacheAge,
	googleCalendarCacheCovers,
	googleCalendarCacheForRange,
} = require("./calendar-cache-domain.cjs");
const {
	calendarBlockLayout,
	calendarConflictLabel,
	calendarItemDates,
	calendarRequestParams,
	calendarTimeZoneLabel,
	calendarTimeZones,
	calendarTrayStartsCollapsed,
	createCalendarViewDomain,
	isValidTimeZone,
	matchesCalendarQuery,
	selectedCalendarIds,
} = require("./calendar-view-domain.cjs");
const { createCalendarControlsDomain } = require("./calendar-controls-domain.cjs");
const { createCalendarActivityDomain } = require("./calendar-activity-domain.cjs");
const { createCaptureDomain } = require("./capture-domain.cjs");
const { createDashboardNavigationDomain } = require("./dashboard-navigation-domain.cjs");
const { primaryNavigation, screenValues, usesTaskList } = require("./dashboard-shell-domain.cjs");
const {
	externalIssuesData,
	externalItemStateForTasks,
	externalProviderLabel,
	externalReferenceTag,
	externalSourceLabel,
	externalTaskMetadata,
} = require("./external-task-domain.cjs");
const { createExternalSourceDomain } = require("./external-source-domain.cjs");
const {
	mergeCalendarFailure,
	mergeCalendarSnapshot,
	mergeExternalSnapshot,
} = require("./external-refresh-domain.cjs");
const {
	EXTERNAL_SOURCE_TIMEOUT_MS,
	loadWithDeadline,
	shouldApplyRefresh,
} = require("./external-resilience-domain.cjs");
const {
	readThroughPendingCache,
	readWithDeadline,
	settleAvailable,
} = require("./collection-read-resilience-domain.cjs");
const {
	availableScheduleSlots,
	batchScheduleSlots: buildBatchScheduleSlots,
	calendarDropSchedule,
	createTimeBlockDomain,
	minutesOf,
	moveTimeBlockToDate,
	taskOccursOnDate,
	taskTimeSegment,
	timelineMinutesFromOffset,
	timeOf,
} = require("./time-block-domain.cjs");
const { createEnvironmentDiagnostics, settledCalendarGroups } = require("./diagnostics-domain.cjs");
const { createIcsDomain } = require("./ics-domain.cjs");
const { createPlanningDomain, resolveReviewFocusTaskKey } = require("./planning-domain.cjs");
const { planningGuideNavigationState, planningGuideState } = require("./planning-guide-domain.cjs");
const { createProductivityMetricsDomain } = require("./productivity-metrics-domain.cjs");
const { createStatsDomain } = require("./stats-domain.cjs");
const { createTaskStructureDomain } = require("./task-structure-domain.cjs");
const { createTaskInputDomain } = require("./task-input-domain.cjs");
const { createTaskAttributesDomain } = require("./task-attributes-domain.cjs");
const { createTaskMarkdownDomain } = require("./task-markdown-domain.cjs");
const {
	collectionEntryNeedsRefresh,
	createCollectionRunMetrics,
	recordCollectionLookup,
	statusCollectionSignature,
} = require("./collection-index-domain.cjs");
const { createAtomicManifestBackend } = require("./task-mutation-atomic-backend.cjs");
const { closeTaktuneView } = require("./view-lifecycle-domain.cjs");
const { createTaskListDomain } = require("./task-list-domain.cjs");
const { isRelevantVaultRenderEvent, markRenderDirtyIfBusy } = require("./vault-render-domain.cjs");
const VIEW_TYPE = "ticktick-dashboard-view";
const COLLECTION_READ_TIMEOUT_MS = 8_000;
const COLLECTION_FAILURE_STATE_KEY = "\0taktune-collection-failures";
const DATE_RE = /📅\s*(\d{4}-\d{2}-\d{2})/u;
const DONE_RE = /✅\s*(\d{4}-\d{2}-\d{2})/u;
const TIMEBLOCK_RE = /⏰\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})-(\d{2}:\d{2})/u;
const TIMEBLOCK_MULTI_RE =
	/⏰\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})→(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/u;
const LIST_RE = /📋\s*(.+?)(?=\s+(?:🗂️?|📅|✅|⏰|🔁|🔔|📊|🍅|⏳|🚦|⏫|🔼|🔽|#)|$)/u;
const SECTION_RE = /🗂️?\s*(.+?)(?=\s+(?:📋|📅|✅|⏰|🔁|🔔|📊|🍅|⏳|🚦|⏫|🔼|🔽|#)|$)/u;
const WEEKDAY_NAMES = [
	"sunday",
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
];
const WEEKDAY_SOURCE = WEEKDAY_NAMES.join("|");
const REPEAT_VALUE_SOURCE = `(?:every(?:\\s+\\d+)?\\s+months?\\s+on\\s+(?:day\\s+\\d{1,2}|last\\s+day|(?:first|second|third|fourth|last)\\s+(?:${WEEKDAY_SOURCE}))|every\\s+(?:${WEEKDAY_SOURCE})(?:,(?:${WEEKDAY_SOURCE}))*|every\\s+weekday|every(?:\\s+\\d+)?\\s+(?:days?|weeks?|months?|years?))`;
const REPEAT_RE = new RegExp(`🔁\\s*(${REPEAT_VALUE_SOURCE})`, "u");
const REPEAT_VALUE_RE = new RegExp(`^${REPEAT_VALUE_SOURCE}$`, "u");
const REMINDER_GLOBAL_RE = /🔔\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/gu;
const PROGRESS_RE = /📊\s*(100|\d{1,2})%/u;
const STATUS_RE = /🚦\s*([\p{L}\p{N}_-]+)/u;
const {
	DEFAULT_SETTINGS,
	EXTERNAL_ITEM_STATE_LIMIT,
	SETTINGS_SCHEMA_VERSION,
	hasLegacySecrets,
	markExternalItemState,
	migrateSettings,
	pendingExternalItems,
	settingsBackup,
	settingsFromBackup,
	settingsForPersistence,
	statusDefinitions,
	taskStorageSettings,
	isTaskPathExcluded,
} = require("./settings.cjs");
const {
	createTaskMutationJournal,
	finalizeTaskMutationSettings,
	transformTaskMutationContent,
	unresolvedTaskMutationPaths,
	updateTaskMutationJournalForVaultEvent,
} = require("./task-mutation-domain.cjs");
const { markdownTaskLineMask } = require("./markdown-task-scanner.cjs");
const {
	assertTaskMutationJournalClaim,
	claimTaskMutationJournal,
	clearStoredTaskMutationJournal,
	createStoredTaskMutationJournal,
	reconcileLegacyTaskMutationJournal,
	recoverStaleTaskMutationClaim,
	releaseTaskMutationJournalClaim,
	updateStoredTaskMutationJournal,
} = require("./task-mutation-journal-store.cjs");
const ESTIMATED_POMOS_RE = /🍅\s*(\d{1,3})/u;
const ESTIMATED_DURATION_RE = /⏳\s*(\d{1,4})m/u;
const TASK_RE = /^(\s*[-*+]\s+\[)([ xX])(\]\s+)(.*)$/u;
const NOTE_LINE_RE = /^(\s*)>\s*📝\s?(.*)$/u;
const COMMENT_LINE_RE = /^(\s*)>\s*💬\s+(\S+)\s?(.*)$/u;
const ACTIVITY_LINE_RE = /^(\s*)>\s*🕘\s+(\S+)\s?(.*)$/u;
const WONT_DO_RE = /(?:^|\s)🚫(?=\s|$)/u;
const TASK_ID_RE = /<!--\s*ttd:([a-z0-9-]+)\s*-->/u;
const NOTE_ITEM_RE = /^(\s*)[-*+]\s+🗒️\s+(.*)$/u;
const IMPORTANT_TAG = "#重要";
const URGENT_TAG = "#緊急";

function resolveTaskLine(lines, task) {
	const { taskLines } = markdownTaskLineMask(lines.join("\n"));
	const candidateAt = (index) => {
		if (!taskLines[index]) return null;
		const match = lines[index]?.match(TASK_RE);
		if (!match) return null;
		const indent = match[1].match(/^\s*/u)[0].length;
		const raw = match[4];
		const taskId = raw.match(TASK_ID_RE)?.[1] || "";
		return { index, indent, raw, taskId };
	};
	const matchesIdentity = (candidate) =>
		candidate &&
		candidate.indent === task.indent &&
		(task.taskId ? candidate.taskId === task.taskId : candidate.raw === task.raw);
	const candidates = [];
	for (let index = 0; index < lines.length; index += 1) {
		const candidate = candidateAt(index);
		if (matchesIdentity(candidate)) candidates.push(candidate);
	}
	return candidates.length === 1 ? candidates[0] : null;
}

function createTaskId(prefix = "task") {
	const randomId =
		globalThis.crypto?.randomUUID?.().toLowerCase() ||
		`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
	return `${prefix}-${randomId}`;
}

function taskFocusIdentity(task) {
	if (task.taskId) return task.taskId;
	task.pendingFocusTaskId ||= createTaskId("focus");
	return task.pendingFocusTaskId;
}
const { cleanDescription, isReminderDue, plainDescription, progressFor, remindersOf } =
	createTaskAttributesDomain({
		reminderPattern: REMINDER_GLOBAL_RE,
		repeatValueSource: REPEAT_VALUE_SOURCE,
	});
const { createTranslator, formatDisplayDate, resolveLocale } = require("./i18n.cjs");
let activeDomainLocale = "en";
const domainT = (key, params, fallback) =>
	createTranslator(activeDomainLocale)(key, params) || fallback || key;
const environmentDiagnostics = createEnvironmentDiagnostics({
	cacheAgeOf: googleCalendarCacheAge,
	inboxPath: DEFAULT_SETTINGS.inboxPath,
	settingsSchemaVersion: SETTINGS_SCHEMA_VERSION,
	t: domainT,
});

function reviewSourceSuffix(task) {
	const label = externalSourceLabel(task);
	return label ? `（${label}）` : "";
}
const { jiraIssues, linearIssues, slackBookmarks } = createExternalSourceDomain({
	addDays,
	localDate,
	t: domainT,
});
const { calendarPlanningState, planTrayVisibleTasks, sortPlanTrayTasks } = createPlanningDomain({
	describeTask: cleanDescription,
	matchesQuery: matchesCalendarQuery,
	today: localDate,
});
const { shiftTimeBlockToDate, timeBlockOf } = createTimeBlockDomain({
	addDays,
	multiPattern: TIMEBLOCK_MULTI_RE,
	singlePattern: TIMEBLOCK_RE,
});
const batchScheduleSlots = (count, date, startMinutes, durationMinutes) =>
	buildBatchScheduleSlots(count, date, startMinutes, durationMinutes, addDays);
const { addMonths, calendarRange, calendarSpan, calendarTaskColor, monthGridDates } =
	createCalendarViewDomain({ addDays, localDate, weekStart });
const calendarControlsDomain = createCalendarControlsDomain({
	addDays,
	addMonths,
	calendarRange,
	locale: () => activeDomainLocale,
	t: domainT,
});
const {
	countdownMatchesDate,
	countdownNextDate,
	countdownStatus,
	daysBetweenDates,
	focusElapsedSeconds,
	focusLogStats,
	habitLogMap,
	habitValue,
	isHabitScheduled,
} = createProductivityMetricsDomain({ today: localDate, t: domainT });
const statsDomain = createStatsDomain({
	addDays,
	completedTaskCount,
	habitValue,
	t: domainT,
	today: localDate,
	weeklyPlanReview,
});
const { calendarActivityItems, taskLineWithTime } = createCalendarActivityDomain({
	countdownMatchesDate,
	habitValue,
	isHabitScheduled,
	matchesQuery: matchesCalendarQuery,
	multiTimeBlockPattern: TIMEBLOCK_MULTI_RE,
	taskPattern: TASK_RE,
	timeOf,
	t: domainT,
});
const { parseIcsCalendar } = createIcsDomain({
	addDays,
	daysBetweenDates,
	localDate,
	timeOf,
	t: domainT,
});
const {
	expandRecurringTasks,
	isValidRepeat,
	nextRepeatDate,
	offsetReminder,
	parseQuickTask,
	priorityOf,
	quickTaskPreview,
	tagsOf,
} = createTaskInputDomain({
	addDays,
	localDate,
	repeatValuePattern: REPEAT_VALUE_RE,
	t: domainT,
	weekdayNames: WEEKDAY_NAMES,
	weekdaySource: WEEKDAY_SOURCE,
});
const captureDomain = createCaptureDomain({
	addDays,
	externalItemStateForTasks,
	externalProviderLabel,
	localDate,
	parseQuickTask,
	pendingExternalItems,
	quickTaskPreview,
});
const {
	attachmentMarkdown,
	attachmentsOf,
	moveTaskBlock,
	nestTaskBlock,
	normalizeTaskBlock,
	removeAttachmentToken,
	reorderSubtaskBlocks,
	rewriteSubtaskRaw,
	taskBlockRange,
} = createTaskMarkdownDomain({
	describeTask: cleanDescription,
	reminderPattern: REMINDER_GLOBAL_RE,
	taskPattern: TASK_RE,
});
const {
	describeTaskChange,
	filterTaskTemplates,
	moveItemById,
	noteItemBlockRange,
	reorderItemsById,
	taskRecordFromLine,
	taskTemporalMetadata,
	taskTimeBucket,
} = createTaskStructureDomain({
	activityPattern: ACTIVITY_LINE_RE,
	commentPattern: COMMENT_LINE_RE,
	datePattern: DATE_RE,
	describeTask: cleanDescription,
	listPattern: LIST_RE,
	noteItemPattern: NOTE_ITEM_RE,
	taskPattern: TASK_RE,
	t: domainT,
	today: localDate,
	wontDoPattern: WONT_DO_RE,
});
const taskListDomain = createTaskListDomain({
	addDays,
	cleanDescription,
	locale: () => activeDomainLocale,
	localDate,
	t: domainT,
	taskTimeBucket,
});
const dashboardNavigationDomain = createDashboardNavigationDomain({
	addDays,
	completedTaskCount,
	habitValue,
	isHabitScheduled,
	localDate,
	t: domainT,
	taskListDomain,
	weekStart,
});

function encodeBase64Utf8(value) {
	if (typeof globalThis.Buffer !== "undefined")
		return globalThis.Buffer.from(value, "utf8").toString("base64");
	if (typeof globalThis.TextEncoder !== "function" || typeof globalThis.btoa !== "function") {
		throw new Error(domainT("error.auth.basicUnsupported"));
	}
	const bytes = new globalThis.TextEncoder().encode(value);
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return globalThis.btoa(binary);
}

class DiagnosticsModal extends Modal {
	constructor(app, { version, platform, vault, integrations, items, plugin }) {
		super(app);
		this.version = version;
		this.platform = platform;
		this.vault = vault;
		this.integrations = integrations;
		this.items = items;
		this.plugin = plugin;
	}

	onOpen() {
		this.modalEl.addClasses([
			"ttd-modal",
			"w-[min(640px,calc(100vw-32px))]",
			"max-w-[calc(100vw-32px)]",
		]);
		this.titleEl.empty();
		this.contentEl.empty();
		this.reactRoot = createRoot(this.contentEl);
		const reportModel = {
			version: this.version,
			platform: this.platform,
			vault: this.vault,
			integrations: this.integrations,
			items: this.items,
		};
		this.reactRoot.render(
			React.createElement(DiagnosticsDialog, {
				model: {
					...reportModel,
					onCopy: async (connectionResults) =>
						copyTextToClipboard(diagnosticsReport({ ...reportModel, connectionResults })),
					onTestIntegrations: () => this.plugin.testIntegrations(false),
				},
			}),
		);
	}

	onClose() {
		const root = this.reactRoot;
		this.reactRoot = null;
		window.setTimeout(() => root?.unmount(), 0);
	}
}

function escapeRegex(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function taskEditDialogModel({ app, task, lists, statuses, onCancel, onSave, onSaveTemplate }) {
	return {
		initial: taskEditInitialValue(task, statuses, cleanDescription),
		lists,
		statuses,
		comments: task.comments || [],
		activities: task.activities || [],
		validateRepeat: isValidRepeat,
		attachmentsOf,
		removeAttachment: removeAttachmentToken,
		onOpenAttachment: (path) => app.workspace.openLinkText(path, task.path, true),
		onCancel,
		onSave,
		onSaveTemplate,
	};
}

class NameModal extends Modal {
	constructor(app, title, placeholder, onSave) {
		super(app);
		this.title = title;
		this.placeholder = placeholder;
		this.onSave = onSave;
	}

	onOpen() {
		this.modalEl.addClasses([
			"ttd-modal",
			"w-[min(480px,calc(100vw-32px))]",
			"max-w-[calc(100vw-32px)]",
		]);
		this.contentEl.empty();
		this.reactRoot = createRoot(this.contentEl);
		this.reactRoot.render(
			React.createElement(NameDialog, {
				model: {
					title: this.title,
					placeholder: this.placeholder,
					onCancel: () => this.close(),
					onSubmit: async (rawValue) => {
						const value = rawValue.trim().replace(/^#/u, "");
						if (!value) throw new Error(this.plugin.t("error.nameRequired"));
						await this.onSave(value);
						this.close();
					},
				},
			}),
		);
	}

	onClose() {
		const root = this.reactRoot;
		this.reactRoot = null;
		window.setTimeout(() => root?.unmount(), 0);
	}
}

class MergeTasksModal extends Modal {
	constructor(app, tasks, onMerge) {
		super(app);
		this.tasks = tasks;
		this.onMerge = onMerge;
	}

	onOpen() {
		this.modalEl.addClasses([
			"ttd-modal",
			"w-[min(560px,calc(100vw-32px))]",
			"max-w-[calc(100vw-32px)]",
		]);
		this.contentEl.empty();
		this.reactRoot = createRoot(this.contentEl);
		this.reactRoot.render(
			React.createElement(MergeTasksDialog, {
				model: {
					items: this.tasks.map((task) => ({ key: task.key, label: cleanDescription(task.raw) })),
					onCancel: () => this.close(),
					onSubmit: async (key) => {
						const target = this.tasks.find((task) => task.key === key);
						if (!target) throw new Error(this.plugin.t("error.mergeTargetMissing"));
						await this.onMerge(target);
						this.close();
					},
				},
			}),
		);
	}

	onClose() {
		const root = this.reactRoot;
		this.reactRoot = null;
		window.setTimeout(() => root?.unmount(), 0);
	}
}

class QuickAddModal extends Modal {
	constructor(app, templates, onSave) {
		super(app);
		this.templates = templates;
		this.onSave = onSave;
	}

	onOpen() {
		this.modalEl.addClass("ttd-modal");
		this.modalEl.addClasses(["w-[min(620px,calc(100vw-32px))]", "max-w-[calc(100vw-32px)]"]);
		const { contentEl } = this;
		contentEl.empty();
		this.reactRoot = createRoot(contentEl);
		this.reactRoot.render(
			React.createElement(QuickAddDialog, {
				model: {
					templates: this.templates.map((template) => ({
						id: template.id,
						name: template.name,
						description: template.description,
						resolvedDue:
							template.dueOffset === null || template.dueOffset === undefined
								? ""
								: addDays(localDate(), template.dueOffset),
					})),
					parse: parseQuickTask,
					preview: (description, due) => quickTaskPreview(parseQuickTask(description), due),
					onCancel: () => this.close(),
					onSubmit: async (parsed, due, templateId) => {
						if (!parsed.description)
							throw new Error(this.plugin.t("error.taskDescriptionRequired"));
						await this.onSave(
							parsed,
							due,
							this.templates.find((template) => template.id === templateId),
						);
						this.close();
					},
				},
			}),
		);
	}

	onClose() {
		const root = this.reactRoot;
		this.reactRoot = null;
		window.setTimeout(() => root?.unmount(), 0);
	}
}

class CalendarTaskModal extends Modal {
	constructor(app, date, startMinutes, lists, onSave) {
		super(app);
		this.date = date;
		this.startMinutes = startMinutes;
		this.lists = lists;
		this.onSave = onSave;
	}

	onOpen() {
		this.modalEl.addClass("ttd-modal");
		this.modalEl.addClasses(["w-[min(560px,calc(100vw-32px))]", "max-w-[calc(100vw-32px)]"]);
		const { contentEl } = this;
		contentEl.empty();
		this.reactRoot = createRoot(contentEl);
		this.reactRoot.render(
			React.createElement(CalendarTaskDialog, {
				model: {
					dateLabel: `${this.date} ${timeOf(this.startMinutes)}`,
					lists: this.lists,
					parse: parseQuickTask,
					onCancel: () => this.close(),
					onSubmit: async (parsed, duration, list) => {
						if (!parsed.description)
							throw new Error(this.plugin.t("error.taskDescriptionRequired"));
						await this.onSave(parsed, duration, parsed.list || list);
						this.close();
					},
				},
			}),
		);
	}

	onClose() {
		const root = this.reactRoot;
		this.reactRoot = null;
		window.setTimeout(() => root?.unmount(), 0);
	}
}

class TaxonomyEditModal extends Modal {
	constructor(app, kind, value, onRename, onDelete, color = "#4772fa") {
		super(app);
		this.kind = kind;
		this.value = value;
		this.onRename = onRename;
		this.onDelete = onDelete;
		this.color = color;
	}

	onOpen() {
		const label = this.plugin.t(`taxonomy.kind.${this.kind}`);
		this.modalEl.addClasses([
			"ttd-modal",
			"w-[min(480px,calc(100vw-32px))]",
			"max-w-[calc(100vw-32px)]",
		]);
		this.contentEl.empty();
		this.reactRoot = createRoot(this.contentEl);
		this.reactRoot.render(
			React.createElement(TaxonomyEditDialog, {
				model: {
					label,
					name: this.value,
					color: this.color,
					showColor: this.kind !== "section",
					onCancel: () => this.close(),
					onDelete: async () => {
						if (!window.confirm(this.plugin.t("taxonomy.removeConfirm"))) return false;
						await this.onDelete();
						this.close();
						return true;
					},
					onSave: async (rawValue, color) => {
						const value = rawValue.trim().replace(/^#/u, "");
						if (!value) throw new Error(this.plugin.t("error.nameRequired"));
						await this.onRename(value, color);
						this.close();
					},
				},
			}),
		);
	}

	onClose() {
		const root = this.reactRoot;
		this.reactRoot = null;
		window.setTimeout(() => root?.unmount(), 0);
	}
}

class SavedFilterModal extends Modal {
	constructor(app, filter, lists, tags, onSave, onDelete) {
		super(app);
		this.filter = filter;
		this.lists = lists;
		this.tags = tags;
		this.onSave = onSave;
		this.onDelete = onDelete;
	}

	onOpen() {
		this.modalEl.addClasses([
			"ttd-modal",
			"w-[min(620px,calc(100vw-32px))]",
			"max-w-[calc(100vw-32px)]",
		]);
		this.contentEl.empty();
		this.reactRoot = createRoot(this.contentEl);
		this.reactRoot.render(
			React.createElement(SavedFilterDialog, {
				model: {
					title: this.plugin.t(this.filter ? "filter.editTitle" : "filter.createTitle"),
					initial: {
						name: this.filter?.name || "",
						keyword: this.filter?.keyword || "",
						list: this.filter?.list || "",
						tag: this.filter?.tag || "",
						priority: this.filter?.priority ?? null,
						due: this.filter?.due || "",
					},
					lists: this.lists,
					tags: this.tags,
					canDelete: Boolean(this.filter),
					onCancel: () => this.close(),
					onDelete: async () => {
						await this.onDelete();
						this.close();
					},
					onSave: async (value) => {
						await this.onSave({ id: this.filter?.id || `${Date.now()}`, ...value });
						this.close();
					},
				},
			}),
		);
	}

	onClose() {
		const root = this.reactRoot;
		this.reactRoot = null;
		window.setTimeout(() => root?.unmount(), 0);
	}
}

class CountdownModal extends Modal {
	constructor(app, countdown, onSave, onDelete) {
		super(app);
		this.countdown = countdown;
		this.onSave = onSave;
		this.onDelete = onDelete;
	}

	onOpen() {
		this.modalEl.addClasses([
			"ttd-modal",
			"w-[min(620px,calc(100vw-32px))]",
			"max-w-[calc(100vw-32px)]",
		]);
		this.contentEl.empty();
		this.reactRoot = createRoot(this.contentEl);
		this.reactRoot.render(
			React.createElement(CountdownDialog, {
				model: {
					title: this.plugin.t(
						this.countdown ? "countdownDialog.editTitle" : "countdownDialog.createTitle",
					),
					initial: {
						title: this.countdown?.title || "",
						date: this.countdown?.date || localDate(),
						note: this.countdown?.note || "",
						repeat: this.countdown?.repeat || "none",
						dayMode: this.countdown?.dayMode || "standard",
						reminder: this.countdown?.reminder || "",
						reminderDays: Number(this.countdown?.reminderDays || 0),
						color: this.countdown?.color || "#e58b3e",
					},
					canDelete: Boolean(this.countdown),
					onCancel: () => this.close(),
					onDelete: async () => {
						if (
							!window.confirm(
								this.plugin.t("countdownDialog.deleteConfirm", { title: this.countdown.title }),
							)
						)
							return false;
						await this.onDelete();
						this.close();
						return true;
					},
					onSave: async (value) => {
						const source = new Date(`${value.date}T00:00:00Z`);
						await this.onSave({
							id: this.countdown?.id || `${Date.now()}`,
							...value,
							weekday: source.getUTCDay(),
							occurrence: Math.min(4, Math.ceil(source.getUTCDate() / 7)),
						});
						this.close();
					},
				},
			}),
		);
	}

	onClose() {
		const root = this.reactRoot;
		this.reactRoot = null;
		window.setTimeout(() => root?.unmount(), 0);
	}
}

class HabitModal extends Modal {
	constructor(app, habit, onSave, onDelete, onArchive) {
		super(app);
		this.habit = habit;
		this.onSave = onSave;
		this.onDelete = onDelete;
		this.onArchive = onArchive;
	}

	onOpen() {
		this.modalEl.addClass("ttd-modal");
		this.contentEl.empty();
		this.reactRoot = createRoot(this.contentEl);
		this.reactRoot.render(
			React.createElement(HabitDialog, {
				model: {
					title: this.plugin.t(this.habit ? "habitDialog.editTitle" : "habitDialog.createTitle"),
					initial: {
						name: this.habit?.name || "",
						target: Number(this.habit?.target || 1),
						unit: this.habit?.unit || this.plugin.t("habitDialog.defaultUnit"),
						scheduleMode: this.habit?.scheduleMode || "weekdays",
						weekdays: this.habit?.weekdays || [0, 1, 2, 3, 4, 5, 6],
						weeklyTarget: Number(this.habit?.weeklyTarget || 3),
						reminders: this.habit?.reminders || [],
						archived: Boolean(this.habit?.archived),
					},
					canManage: Boolean(this.habit),
					onCancel: () => this.close(),
					onDelete: async () => {
						if (
							!window.confirm(this.plugin.t("habitDialog.deleteConfirm", { name: this.habit.name }))
						)
							return false;
						await this.onDelete();
						this.close();
						return true;
					},
					onArchive: async (archived) => {
						await this.onArchive(archived);
						this.close();
					},
					onSave: async (value) => {
						await this.onSave({ id: this.habit?.id || `${Date.now()}`, ...value });
						this.close();
					},
				},
			}),
		);
	}

	onClose() {
		const root = this.reactRoot;
		this.reactRoot = null;
		window.setTimeout(() => root?.unmount(), 0);
	}
}

class ReminderModal extends Modal {
	constructor(app, task, onAction) {
		super(app);
		this.task = task;
		this.onAction = onAction;
		this.handled = false;
		this.actionPending = false;
	}

	onOpen() {
		this.modalEl.addClass("ttd-modal");
		this.modalEl.addClasses(["w-[min(460px,calc(100vw-32px))]", "max-w-[calc(100vw-32px)]"]);
		this.contentEl.empty();
		const meta = [];
		if (this.task.notificationTime)
			meta.push(
				formatDisplayDate(activeDomainLocale, new Date(this.task.notificationTime), {
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				}),
			);
		if (this.task.due) meta.push(this.plugin.t("task.dueDate", { date: this.task.due }));
		meta.push(this.task.path);
		this.reactRoot = createRoot(this.contentEl);
		this.reactRoot.render(
			React.createElement(ReminderDialog, {
				model: {
					description: cleanDescription(this.task.raw),
					meta,
					isCountdown: Boolean(this.task.isCountdown),
					onAction: async (action, value) => {
						this.actionPending = true;
						try {
							await this.onAction(action, value ?? null);
							this.handled = true;
							this.close();
						} finally {
							this.actionPending = false;
						}
					},
				},
			}),
		);
	}

	onClose() {
		const root = this.reactRoot;
		this.reactRoot = null;
		window.setTimeout(() => root?.unmount(), 0);
		if (!this.handled && !this.actionPending) void this.onAction("dismiss");
	}
}

class CalendarFilterModal extends Modal {
	constructor(app, lists, selected, onSave) {
		super(app);
		this.lists = lists;
		this.selected = new Set(selected);
		this.onSave = onSave;
	}

	onOpen() {
		this.modalEl.addClass("ttd-modal");
		this.contentEl.empty();
		this.reactRoot = createRoot(this.contentEl);
		this.reactRoot.render(
			React.createElement(CalendarListFilterDialog, {
				model: {
					lists: this.lists,
					selected: [...this.selected],
					onCancel: () => this.close(),
					onSave: async (selected) => {
						await this.onSave(selected);
						this.close();
					},
				},
			}),
		);
	}

	onClose() {
		const root = this.reactRoot;
		this.reactRoot = null;
		window.setTimeout(() => root?.unmount(), 0);
	}
}

class CalendarSourcesModal extends Modal {
	constructor(app, calendars, selected, onSave) {
		super(app);
		this.calendars = calendars;
		this.selected = new Set(selected);
		this.onSave = onSave;
	}

	onOpen() {
		this.modalEl.addClass("ttd-modal");
		this.modalEl.addClasses(["w-[min(560px,calc(100vw-32px))]", "max-w-[calc(100vw-32px)]"]);
		this.contentEl.empty();
		this.reactRoot = createRoot(this.contentEl);
		this.reactRoot.render(
			React.createElement(GoogleCalendarSourcesDialog, {
				model: {
					calendars: this.calendars,
					selected: [...this.selected],
					onCancel: () => this.close(),
					onSave: async (selected) => {
						await this.onSave(selected);
						this.close();
					},
				},
			}),
		);
	}

	onClose() {
		const root = this.reactRoot;
		this.reactRoot = null;
		window.setTimeout(() => root?.unmount(), 0);
	}
}

class CalendarSubscriptionsModal extends Modal {
	constructor(app, subscriptions, onSave) {
		super(app);
		this.subscriptions = (subscriptions || []).map((item) => ({ ...item }));
		this.onSave = onSave;
	}

	onOpen() {
		this.modalEl.addClass("ttd-modal");
		this.modalEl.addClasses(["w-[min(760px,calc(100vw-32px))]", "max-w-[calc(100vw-32px)]"]);
		this.contentEl.empty();
		this.reactRoot = createRoot(this.contentEl);
		this.reactRoot.render(
			React.createElement(CalendarSubscriptionsDialog, {
				model: {
					initial: this.subscriptions.map((item) => ({
						...item,
						name: item.name || "",
						url: item.url || "",
						color: item.color || "#5aa38b",
						enabled: item.enabled !== false,
					})),
					onCancel: () => this.close(),
					onSave: async (values) => {
						await this.onSave(values);
						this.close();
					},
				},
			}),
		);
	}

	onClose() {
		const root = this.reactRoot;
		this.reactRoot = null;
		window.setTimeout(() => root?.unmount(), 0);
	}
}

class CalendarViewOptionsModal extends Modal {
	constructor(app, settings, onSave) {
		super(app);
		this.settings = settings;
		this.onSave = onSave;
	}

	onOpen() {
		this.modalEl.addClass("ttd-modal");
		this.contentEl.empty();
		this.reactRoot = createRoot(this.contentEl);
		this.reactRoot.render(
			React.createElement(CalendarViewOptionsDialog, {
				model: {
					initial: {
						colorMode: this.settings.calendarColorMode || "list",
						showCompleted: Boolean(this.settings.calendarShowCompleted),
						density: this.settings.calendarDensity || "comfortable",
						showDetails: this.settings.calendarShowDetails !== false,
						showEvents: this.settings.calendarShowEvents !== false,
						showHabits: this.settings.calendarShowHabits !== false,
						showFocus: this.settings.calendarShowFocus !== false,
						showFutureRepeats: this.settings.calendarShowFutureRepeats !== false,
						showTasks: this.settings.calendarShowTasks !== false,
						timeZones: [...calendarTimeZones(this.settings.calendarTimeZones)],
					},
					validateTimeZone: isValidTimeZone,
					onCancel: () => this.close(),
					onSave: async (value) => {
						await this.onSave({ ...value, timeZones: calendarTimeZones(value.timeZones) });
						this.close();
					},
				},
			}),
		);
	}

	onClose() {
		const root = this.reactRoot;
		this.reactRoot = null;
		window.setTimeout(() => root?.unmount(), 0);
	}
}

class TaktuneView extends ItemView {
	constructor(leaf, plugin) {
		super(leaf);
		this.plugin = plugin;
		if (typeof this.plugin.t !== "function") this.plugin.t = createTranslator("ja");
		if (!this.plugin.locale) this.plugin.locale = "ja";
		this.filter = "today";
		this.query = "";
		this.calendarDate = localDate();
		this.calendarMode = "day";
		this.calendarSearch = "";
		this.calendarSelectionMode = false;
		this.calendarSelectedTaskKeys = new Set();
		this.calendarTraySort = "priority";
		this.calendarTrayCollapsed = calendarTrayStartsCollapsed(
			typeof window === "undefined" ? Number.NaN : window.innerWidth,
		);
		this.calendarScrollPositions = new Map();
		this.boardList = "__status__";
		this.issueLabelFilter = "";
		this.issueShowHandled = false;
		this.reviewDraft = {
			...emptyReviewDraft(),
			...plugin.settings.reviewDraft,
			carryoverReasons: { ...plugin.settings.reviewDraft?.carryoverReasons },
			focusTaskKeys: { ...plugin.settings.reviewDraft?.focusTaskKeys },
		};
		this.reviewDraftDirty = false;
		this.reviewDraftVersion = 0;
		this.reviewDraftSavePromise = Promise.resolve();
		this.reviewFocusTaskKeys = new Map();
		this.reviewOverflowTaskKeys = new Set();
		this.sidebarOpen = false;
		this.selectionMode = false;
		this.selectedTaskKeys = new Set();
		this.showArchivedHabits = false;
		this.focusState = { ...DEFAULT_SETTINGS.focusState, ...plugin.settings.focusState };
		this.external = { calendar: [], linear: [], jira: [], slack: [], errors: {} };
		this.calendarRefreshSequence = 0;
		this.externalRefreshSequence = 0;
		this.renderSequence = 0;
		this.renderInProgress = false;
		this.renderDirty = false;
		this.reactRoot = null;
		this.activeTaskKey = null;
	}

	getViewType() {
		return VIEW_TYPE;
	}

	getDisplayText() {
		return this.plugin.t("app.tasks");
	}

	getIcon() {
		return "circle-check-big";
	}

	async onOpen() {
		const viewContent = this.containerEl.children[1];
		viewContent?.addClasses(["overflow-hidden", "!p-0"]);
		if (viewContent) viewContent.style.padding = "0";
		this.registerEvent(this.app.vault.on("modify", (file) => this.handleVaultRenderEvent(file)));
		this.registerEvent(this.app.vault.on("create", (file) => this.handleVaultRenderEvent(file)));
		this.registerEvent(this.app.vault.on("delete", (file) => this.handleVaultRenderEvent(file)));
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => this.handleVaultRenderEvent(file, oldPath)),
		);
		this.registerInterval(window.setInterval(() => void this.tickFocus(), 1000));
		this.registerInterval(
			window.setInterval(() => {
				if (this.filter === "calendar") this.scheduleRender();
			}, 60_000),
		);
		this.renderLoading();
		await this.render();
		void this.refreshExternal()
			.then(() => (this.containerEl.isConnected ? this.render() : null))
			.catch((error) => {
				this.external.errors.calendar = this.plugin.t("error.external.refresh", {
					error: error.message,
				});
				if (this.containerEl.isConnected) void this.render();
			});
	}

	renderLoading() {
		const root = this.containerEl.children[1];
		root.empty();
		const loading = root.createDiv({
			cls: "flex min-h-60 items-center justify-center gap-2 text-[var(--text-muted)]",
			attr: { role: "status", "aria-live": "polite" },
		});
		const icon = loading.createSpan({ cls: "inline-flex animate-spin [&>svg]:size-[18px]" });
		setIcon(icon, "loader-circle");
		loading.createSpan({ text: this.plugin.t("loading.tasks") });
	}

	renderFailure(error) {
		console.error("Taktune: failed to render task view", error);
		if (this.reactRoot) {
			this.reactRoot.unmount();
			this.reactRoot = null;
		}
		const root = this.containerEl.children[1];
		root.empty();
		const panel = root.createDiv({
			cls: "grid min-h-60 place-items-center p-5 text-center",
			attr: { role: "alert" },
		});
		const body = panel.createDiv({ cls: "max-w-md" });
		body.createEl("h1", {
			text: this.plugin.t("error.load.title"),
			cls: "m-0 text-base font-semibold",
		});
		body.createEl("p", {
			text: error?.message || this.plugin.t("error.load.unexpected"),
			cls: "mb-3 mt-1 break-words text-xs text-[var(--text-muted)]",
		});
		const retry = body.createEl("button", {
			text: this.plugin.t("common.retry"),
			cls: "mod-cta min-h-9 px-3 text-xs max-[620px]:min-h-11 max-[620px]:w-full",
		});
		retry.addEventListener("click", () => {
			this.renderLoading();
			void this.render();
		});
	}

	async onClose() {
		await closeTaktuneView(this);
	}

	scheduleRender() {
		if (markRenderDirtyIfBusy(this)) return;
		globalThis.clearTimeout(this.renderTimer);
		this.renderTimer = globalThis.setTimeout(() => this.render(), 180);
	}

	handleVaultRenderEvent(file, oldPath = "") {
		const relevant = isRelevantVaultRenderEvent(file, oldPath, (path) =>
			this.plugin.isTaskPathExcluded(path),
		);
		if (relevant) this.scheduleRender();
	}

	async persistReviewDraft() {
		const version = this.reviewDraftVersion;
		this.plugin.settings.reviewDraft = reviewDraftSnapshot(this.reviewDraft);
		await this.plugin.saveSettings();
		if (version === this.reviewDraftVersion) this.reviewDraftDirty = false;
	}

	queueReviewDraftSave() {
		this.reviewDraftSavePromise = this.reviewDraftSavePromise
			.catch(() => undefined)
			.then(() => this.persistReviewDraft());
		return this.reviewDraftSavePromise;
	}

	async render({ throwOnFailure = false } = {}) {
		if (markRenderDirtyIfBusy(this)) return false;
		this.renderInProgress = true;
		const request = (this.renderSequence || 0) + 1;
		this.renderSequence = request;
		try {
			const renderStarted = performance.now();
			this.plugin.collectionRunMetrics = createCollectionRunMetrics();
			const root = this.containerEl.children[1];
			root.addClasses([
				"ttd-app",
				"relative",
				"grid",
				"h-full",
				"!p-0",
				"grid-cols-[minmax(0,1fr)]",
				"overflow-hidden",
				"bg-ttd-canvas",
				"text-ttd-text",
				"[--ttd-blue:var(--ttd-color-accent)]",
				"[--ttd-blue-soft:color-mix(in_srgb,var(--ttd-blue)_13%,transparent)]",
				"[--ttd-red:#e25454]",
				"[&_:is(button,input,select,textarea,[tabindex]):focus-visible]:outline-2",
				"[&_:is(button,input,select,textarea,[tabindex]):focus-visible]:outline-offset-2",
				"[&_:is(button,input,select,textarea,[tabindex]):focus-visible]:outline-ttd-accent",
			]);
			root.style.padding = "0";
			root.toggleClass("min-[721px]:grid-cols-[236px_minmax(0,1fr)]", this.sidebarOpen);
			const readCache = new Map();
			const [tasks, trashTasks, notes] = await Promise.all([
				this.plugin.collectTasks("active", readCache),
				this.plugin.collectTrashTasks(readCache),
				this.plugin.collectNotes(readCache),
			]);
			const collectionFailures = this.plugin.collectionFailureState(readCache);
			if (request !== this.renderSequence) return false;
			const collectedAt = performance.now();
			this.tasks = tasks;
			this.trashTasks = trashTasks;
			this.notes = notes;
			this.taskMap = new Map(tasks.map((task) => [task.key, task]));
			if (!this.reactRoot) {
				root.empty();
				this.reactRoot = createRoot(root);
			}
			const sidebar = this.renderSidebar(tasks);
			this.calendarTimeBlocks = [];
			this.calendarDayChrome = [];
			this.calendarMonths = [];
			this.calendarAgenda = null;
			this.calendarYear = null;
			this.calendarBatchActionsModel = null;
			this.reviewModel = null;
			this.statsModel = null;
			this.focusModel = null;
			this.habitsModel = null;
			this.countdownsModel = null;
			this.matrixModel = null;
			this.boardModel = null;
			this.externalIssuesModel = null;
			this.notesModel = null;
			const taskListModel = this.usesTaskList()
				? this.renderTaskListModel(this.filter === "trash" ? trashTasks : tasks)
				: null;
			const today =
				this.filter === "today" && !this.selectionMode && taskListModel
					? extractTodayFocus(taskListModel)
					: { focus: null, remaining: taskListModel };
			this.reactRoot.render(
				React.createElement(DashboardHost, {
					locale: this.plugin.locale,
					collectionStatus: collectionFailures.failedPaths.size
						? {
								failedCount: collectionFailures.failedPaths.size,
								kind: collectionFailures.succeededPaths.size ? "partial" : "fatal",
								onRetry: () => this.render(),
							}
						: null,
					sidebar,
					main: this.renderMainShell(sidebar.primary, tasks),
					content: this.renderMain(this.filter === "trash" ? trashTasks : tasks),
					calendarBatchActions: this.calendarBatchActionsModel,
					inbox: this.filter === "inbox" ? this.renderInboxModel(tasks) : null,
					quickAdd: this.renderQuickAddModel(),
					taskList: today.remaining,
					todayFocus: today.focus,
					batchActions:
						this.selectionMode && this.usesTaskList() && this.filter !== "trash"
							? this.renderBatchActionsModel(tasks)
							: null,
					calendarControls:
						this.filter === "calendar" ? this.renderCalendarControlsModel(tasks) : null,
					planTray:
						this.filter === "calendar" &&
						this.calendarMode !== "year" &&
						this.plugin.settings.calendarShowTasks !== false
							? this.renderPlanTrayModel(tasks)
							: null,
					calendarTimeBlocks: this.calendarTimeBlocks,
					calendarDayChrome: this.calendarDayChrome,
					calendarMonths: this.calendarMonths,
					calendarAgenda: this.calendarAgenda,
					calendarYear: this.calendarYear,
					review: this.reviewModel,
					reviewReminder: this.filter === "today" ? this.renderReviewReminderModel() : null,
					stats: this.statsModel,
					focus: this.focusModel,
					habits: this.habitsModel,
					countdowns: this.countdownsModel,
					matrix: this.matrixModel,
					board: this.boardModel,
					externalIssues: this.externalIssuesModel,
					notes: this.notesModel,
					taskDetail: this.renderTaskDetailModel(),
					onRetry: () => {
						void this.render();
					},
				}),
			);
			const performanceSnapshot = {
				filter: this.filter,
				taskCount: tasks.length,
				noteCount: notes.length,
				scanMs: collectedAt - renderStarted,
				totalMs: collectedAt - renderStarted,
				collection: { ...this.plugin.collectionRunMetrics },
			};
			this.plugin.performanceSnapshot = performanceSnapshot;
			window.requestAnimationFrame(() => {
				if (this.plugin.performanceSnapshot === performanceSnapshot)
					performanceSnapshot.totalMs = performance.now() - renderStarted;
			});
			return true;
		} catch (error) {
			if (request !== this.renderSequence) return false;
			if (throwOnFailure) throw error;
			this.renderFailure(error);
			return false;
		} finally {
			this.renderInProgress = false;
			if (this.renderDirty) {
				this.renderDirty = false;
				this.scheduleRender();
			}
		}
	}

	usesTaskList() {
		return usesTaskList(this.filter);
	}

	renderMainShell(primaryItems, tasks) {
		const select = (id) => {
			if (id !== "review-overflow") this.reviewOverflowTaskKeys.clear();
			this.filter = id;
			void this.render();
		};
		const values = screenValues({
			filter: this.filter,
			groupMode: this.plugin.settings.groupMode || "auto",
			query: this.query,
			selectionMode: this.selectionMode,
			sortMode: this.plugin.settings.sortMode || "smart",
			subtitle: this.subtitleFor(this.filter, tasks),
			title: this.labelFor(this.filter),
		});
		const { searchable, selectable, showSync, taskViewOptions } = values.capabilities;
		return {
			activeId: this.filter,
			primary: primaryNavigation(primaryItems, domainT),
			sidebarOpen: this.sidebarOpen,
			screen: {
				title: values.title,
				subtitle: values.subtitle,
				contextAction:
					this.filter === "review-overflow"
						? {
								description: this.plugin.t("review.carryoverDescription"),
								label: this.plugin.t("review.back"),
								onAction: () => {
									this.reviewOverflowTaskKeys.clear();
									this.filter = "review";
									void this.render();
								},
							}
						: undefined,
				query: values.query,
				selectionMode: values.selectionMode,
				showSync,
				sortMode: values.sortMode,
				groupMode: values.groupMode,
				onQueryChange: searchable
					? (query) => {
							this.query = query;
							void this.render();
						}
					: undefined,
				onToggleSelection: selectable
					? () => {
							this.selectionMode = !this.selectionMode;
							if (!this.selectionMode) this.selectedTaskKeys.clear();
							void this.render();
						}
					: undefined,
				onRefresh: showSync
					? async () => {
							await this.refreshExternal();
							await this.render();
						}
					: undefined,
				onSortChange: taskViewOptions
					? async (mode) => {
							this.plugin.settings.sortMode = mode;
							if (mode === "manual") this.plugin.settings.groupMode = "none";
							await this.plugin.saveSettings();
							await this.render();
						}
					: undefined,
				onGroupChange: taskViewOptions
					? async (mode) => {
							this.plugin.settings.groupMode = mode;
							await this.plugin.saveSettings();
							await this.render();
						}
					: undefined,
			},
			onSelect: select,
			onToggleSidebar: () => {
				this.sidebarOpen = !this.sidebarOpen;
				void this.render();
			},
			onOpenSidebar: () => {
				this.sidebarOpen = true;
				void this.render();
			},
			planningGuide: {
				...planningGuideState({
					filter: this.filter,
					tasks,
					inboxRemaining: this.countFor("inbox", tasks),
					overdueRemaining: this.countFor("overdue", tasks),
					selectedCount: this.calendarSelectedTaskKeys.size,
					reviewNext: this.reviewDraft.next,
				}),
				onNavigate: (view) => {
					if (view === "calendar") {
						Object.assign(this, planningGuideNavigationState(view, localDate()));
						void this.render();
						return;
					}
					select(view, step);
				},
			},
		};
	}

	renderInboxModel(tasks = []) {
		const data = captureDomain.inboxModelData(
			this.external,
			this.plugin.settings.externalItemState,
			tasks,
		);
		return {
			...data,
			onImport: async (item) => {
				await this.plugin.importExternalItem(item);
				await this.render();
			},
			onImportAndPlan: async (item) => {
				const key = await this.plugin.importExternalItem(item);
				if (!key) throw new Error(this.plugin.t("error.schedule.taskCreate"));
				await this.openTaskInPlannerAndRender(key, item.due);
			},
			onDismiss: async (item) => {
				await this.plugin.dismissExternalItem(item);
				await this.render();
			},
			onShowAll: () => {
				this.filter = "issues";
				void this.render();
			},
			onOpenPlanner: () => this.openTaskInPlannerAndRender("", localDate(), false, true),
		};
	}

	openTaskInPlanner(taskKey, date = "", scheduled = false) {
		const plan = calendarPlanningState(taskKey, date, localDate(), scheduled);
		this.filter = plan.filter;
		this.calendarMode = plan.mode;
		this.calendarDate = plan.date;
		this.calendarSelectedTaskKeys = plan.selectedTaskKeys;
		this.calendarSelectionMode = plan.selectionMode;
		if (!scheduled && plan.selectedTaskKeys.size) this.calendarTrayCollapsed = false;
	}

	async openTaskInPlannerAndRender(taskKey, date = "", scheduled = false, expandTray = false) {
		const previous = {
			filter: this.filter,
			calendarMode: this.calendarMode,
			calendarDate: this.calendarDate,
			selectedTaskKeys: new Set(this.calendarSelectedTaskKeys || []),
			selectionMode: this.calendarSelectionMode,
			trayCollapsed: this.calendarTrayCollapsed,
			external: this.external,
		};
		this.openTaskInPlanner(taskKey, date, scheduled);
		if (expandTray) this.calendarTrayCollapsed = false;
		try {
			await this.refreshCalendar({ throwOnFailure: true });
			await this.render({ throwOnFailure: true });
		} catch (error) {
			this.filter = previous.filter;
			this.calendarMode = previous.calendarMode;
			this.calendarDate = previous.calendarDate;
			this.calendarSelectedTaskKeys = previous.selectedTaskKeys;
			this.calendarSelectionMode = previous.selectionMode;
			this.calendarTrayCollapsed = previous.trayCollapsed;
			this.external = previous.external;
			throw error;
		}
	}

	renderQuickAddModel() {
		const templates = this.plugin.settings.taskTemplates || [];
		return {
			templates: captureDomain.quickAddTemplates(templates),
			onPreview: (description, due) => captureDomain.quickAddPreview(description, due),
			onSubmit: async ({ description, due, templateId }) => {
				const resolved = captureDomain.resolveQuickAdd({
					description,
					due,
					filter: this.filter,
					templateId,
					templates,
				});
				if (!resolved) {
					new Notice(this.plugin.t("error.taskDescriptionRequired"));
					return false;
				}
				await this.plugin.addTask(resolved.description, resolved.due, resolved.metadata);
				this.scheduleRender();
				return true;
			},
		};
	}

	renderSidebar(tasks) {
		const primaryItems = [
			["today", "sun", this.plugin.t("nav.today")],
			["inbox", "inbox", this.plugin.t("nav.inbox")],
			["next", "calendar-days", this.plugin.t("nav.next")],
			["overdue", "circle-alert", this.plugin.t("nav.overdue")],
			["focus", "timer", this.plugin.t("nav.focus")],
		];
		const planningItems = [
			["calendar", "calendar-clock", this.plugin.t("nav.calendar")],
			["tomorrow", "sunrise", this.plugin.t("nav.tomorrow")],
			["matrix", "grid-2x2", this.plugin.t("nav.matrix")],
			["board", "columns-3", "Kanban"],
			["review", "book-open-check", this.plugin.t("nav.review")],
		];
		const organizeItems = [
			["all", "list-checks", this.plugin.t("nav.all")],
			["scheduled", "calendar-check", this.plugin.t("nav.scheduled")],
			["recurring", "repeat-2", this.plugin.t("nav.recurring")],
			["issues", "square-kanban", this.plugin.t("nav.issues")],
			["notes", "notebook-pen", this.plugin.t("nav.notes")],
			["habits", "flame", this.plugin.t("nav.habits")],
			["countdown", "hourglass", this.plugin.t("nav.countdown")],
		];
		const historyItems = [
			["completed", "circle-check-big", this.plugin.t("nav.completed")],
			["wontdo", "circle-slash-2", this.plugin.t("nav.wontdo")],
			["trash", "trash-2", this.plugin.t("nav.trash")],
			["stats", "trophy", this.plugin.t("nav.stats")],
		];
		const navItems = (items) =>
			items.map(([id, icon, label]) => {
				const count = this.countFor(id, tasks);
				return {
					id,
					icon,
					label,
					count,
					countLabel: id === "focus" ? this.plugin.t("common.minutes", { count }) : undefined,
				};
			});
		const taxonomyItems = (kind, values, icon) =>
			values.map((value) => {
				const parts = value.split("/").filter(Boolean);
				const group = parts.length > 1 ? parts.slice(0, -1).join("/") : "";
				const displayValue = parts.at(-1) || value;
				const id = `${kind}:${value}`;
				return {
					id,
					icon,
					label: kind === "tag" ? `#${displayValue}` : displayValue,
					fullLabel: value,
					value,
					group,
					color: this.plugin.taxonomyColor(kind, value),
					count: this.countFor(id, tasks),
				};
			});
		const select = (id) => {
			this.filter = id;
			if (window.matchMedia("(max-width: 720px)").matches) this.sidebarOpen = false;
			void this.render();
		};
		return {
			activeId: this.filter,
			open: this.sidebarOpen,
			incompleteCount: tasks.filter((task) => !task.done && !task.wontDo).length,
			primary: navItems(primaryItems),
			statuses: navItems(
				this.plugin
					.statuses()
					.map((status, index) => [
						`status:${status.id}`,
						index === 0 ? "circle" : index === 1 ? "circle-dot" : "circle-pause",
						status.name,
					]),
			),
			planning: navItems(planningItems),
			tools: navItems(organizeItems),
			organize: navItems(organizeItems),
			history: navItems(historyItems),
			savedFilters: (this.plugin.settings.smartFilters || []).map((saved) => ({
				id: `smart:${saved.id}`,
				icon: "filter",
				label: saved.name,
				count: this.countFor(`smart:${saved.id}`, tasks),
				value: saved,
			})),
			lists: taxonomyItems("list", this.plugin.allLists(tasks), "list"),
			tags: taxonomyItems("tag", this.plugin.allTags(tasks), "tag"),
			expandedSections: { ...this.plugin.settings.sidebarSections },
			onClose: () => {
				this.sidebarOpen = false;
				void this.render();
			},
			onSelect: select,
			onToggleSection: async (id, open) => {
				const previous = { ...this.plugin.settings.sidebarSections };
				const next = { ...previous, [id]: open };
				if (id === "filters") {
					next.statuses = false;
					next.lists = false;
					next.tags = false;
				}
				this.plugin.settings.sidebarSections = next;
				try {
					await this.plugin.saveSettings();
				} catch (error) {
					this.plugin.settings.sidebarSections = previous;
					new Notice(this.plugin.t("error.sidebar.save", { error: error.message }));
				}
			},
			onAddSavedFilter: () => this.openSavedFilter(),
			onEditSavedFilter: (saved) => this.openSavedFilter(saved),
			onAddTaxonomy: (kind) => {
				const title = this.plugin.t(`taxonomy.kind.${kind}`);
				new NameModal(
					this.app,
					this.plugin.t("taxonomy.create", { label: title }),
					this.plugin.t("taxonomy.nameFor", { label: title }),
					async (value) => {
						await this.plugin.createTaxonomy(kind, value);
						await this.render();
					},
				).open();
			},
			onEditTaxonomy: (kind, value) => {
				const id = `${kind}:${value}`;
				const color = this.plugin.taxonomyColor(kind, value);
				new TaxonomyEditModal(
					this.app,
					kind,
					value,
					async (next, nextColor) => {
						await this.plugin.updateTaxonomy(kind, value, next, nextColor);
						this.filter = `${kind}:${next}`;
						await this.render();
					},
					async () => {
						await this.plugin.removeTaxonomy(kind, value);
						if (this.filter === id) this.filter = "inbox";
						await this.render();
					},
					color,
				).open();
			},
			onReorderTaxonomy: async (kind, from, to) => {
				await this.plugin.reorderTaxonomy(kind, from, to);
				await this.render();
			},
		};
	}

	openSavedFilter(saved = null) {
		new SavedFilterModal(
			this.app,
			saved,
			this.plugin.allLists(this.tasks || []),
			this.plugin.allTags(this.tasks || []),
			async (value) => {
				await this.plugin.saveSmartFilter(value);
				this.filter = `smart:${value.id}`;
				await this.render();
			},
			async () => {
				await this.plugin.deleteSmartFilter(saved.id);
				if (this.filter === `smart:${saved.id}`) this.filter = "today";
				await this.render();
			},
		).open();
	}

	renderMain(tasks) {
		const main = document.createElement("div");
		main.className = "ttd-main-content";

		if (this.filter === "issues") {
			this.renderExternal(main, tasks);
			return main;
		}

		if (this.filter === "notes") {
			this.renderNotes(main, this.notes || []);
			return main;
		}

		if (this.filter === "calendar") {
			this.renderCalendar(main, tasks);
			return main;
		}

		if (this.filter === "focus") {
			this.renderFocus(main, tasks);
			return main;
		}

		if (this.filter === "habits") {
			this.renderHabits(main);
			return main;
		}

		if (this.filter === "countdown") {
			this.renderCountdowns(main);
			return main;
		}

		if (this.filter === "stats") {
			this.renderStats(main, tasks);
			return main;
		}

		if (this.filter === "review") {
			this.renderReview(main, tasks);
			return main;
		}

		if (this.filter === "matrix") {
			this.renderMatrix(main, tasks);
			return main;
		}

		if (this.filter === "board") {
			this.renderBoard(main, tasks);
			return main;
		}

		if (this.filter === "trash") {
			main.createDiv({ attr: { "data-react-slot": "task-list" } });
			return main;
		}

		if (this.filter === "today") main.createDiv({ attr: { "data-react-slot": "today-focus" } });
		main.createDiv({ attr: { "data-react-slot": "quick-add" } });

		if (this.filter === "inbox") main.createDiv({ attr: { "data-react-slot": "inbox" } });
		if (this.selectionMode) main.createDiv({ attr: { "data-react-slot": "batch-actions" } });

		main.createDiv({ attr: { "data-react-slot": "task-list" } });
		if (this.filter === "today") main.createDiv({ attr: { "data-react-slot": "review-reminder" } });
		return main;
	}

	renderBatchActionsModel(tasks) {
		const selected = tasks.filter((task) => this.selectedTaskKeys.has(task.key));
		const mergeable = selected.filter((task) => !task.parentKey && !task.done && !task.wontDo);
		return {
			selectedCount: selected.length,
			lists: this.plugin.allLists(tasks),
			canMerge: mergeable.length >= 2,
			wontDoLabel: this.plugin.t(
				this.filter === "wontdo" ? "task.restoreAction" : "task.wontDoAction",
			),
			wontDoValue: this.filter === "wontdo" ? "false" : "true",
			onApply: (action, value = "") => this.runBatch(selected, action, value),
			onMerge: () =>
				new MergeTasksModal(this.app, mergeable, async (target) => {
					try {
						await this.plugin.mergeTasks(
							target,
							mergeable.filter((task) => task.key !== target.key),
						);
						this.selectedTaskKeys.clear();
						await this.render();
						new Notice(this.plugin.t("notice.tasksMerged", { count: mergeable.length }));
					} catch (error) {
						new Notice(error.message);
					}
				}).open(),
		};
	}

	async runBatch(tasks, action, value = "") {
		await this.plugin.batchUpdateTasks(tasks, action, value);
		this.selectedTaskKeys.clear();
		await this.render();
	}

	async refreshExternal() {
		const externalRequest = (this.externalRefreshSequence || 0) + 1;
		const calendarRequest = (this.calendarRefreshSequence || 0) + 1;
		this.externalRefreshSequence = externalRequest;
		this.calendarRefreshSequence = calendarRequest;
		const range = calendarRange(this.calendarMode, this.calendarDate);
		let loaded;
		try {
			loaded = await this.plugin.loadExternalItems(range.start, range.days, {
				shouldWriteCalendarCache: () =>
					shouldApplyRefresh(externalRequest, this.externalRefreshSequence) &&
					shouldApplyRefresh(calendarRequest, this.calendarRefreshSequence),
			});
		} catch (error) {
			if (!shouldApplyRefresh(externalRequest, this.externalRefreshSequence)) return false;
			throw error;
		}
		if (!shouldApplyRefresh(externalRequest, this.externalRefreshSequence)) return false;
		this.external = mergeExternalSnapshot(
			this.external,
			loaded,
			calendarRequest !== this.calendarRefreshSequence,
		);
		return true;
	}

	async refreshCalendar({ throwOnFailure = false } = {}) {
		const request = (this.calendarRefreshSequence || 0) + 1;
		this.calendarRefreshSequence = request;
		const range = calendarRange(this.calendarMode, this.calendarDate);
		try {
			const calendar = await this.plugin.loadCalendar(range.start, range.days, {
				shouldWriteCache: () => shouldApplyRefresh(request, this.calendarRefreshSequence),
			});
			if (request !== this.calendarRefreshSequence) return false;
			this.external = mergeCalendarSnapshot(this.external, calendar, domainT);
			return true;
		} catch (error) {
			if (request !== this.calendarRefreshSequence) return false;
			if (throwOnFailure) throw error;
			this.external = mergeCalendarFailure(this.external, error, domainT);
			return true;
		}
	}

	renderExternal(main, tasks = []) {
		const data = externalIssuesData(this.external, this.plugin.settings.externalItemState, tasks, {
			label: this.issueLabelFilter,
			query: this.query,
			showHandled: this.issueShowHandled,
		});
		this.externalIssuesModel = {
			errors: data.errors,
			sources: data.sources,
			labels: data.labels,
			activeLabel: this.issueLabelFilter,
			showHandled: this.issueShowHandled,
			onSelectLabel: (label) => {
				this.issueLabelFilter = label;
				void this.render();
			},
			onToggleHandled: () => {
				this.issueShowHandled = !this.issueShowHandled;
				void this.render();
			},
			items: data.items.map((item) => {
				const plan = async (taskKey, date, scheduled = false) =>
					this.openTaskInPlannerAndRender(taskKey, date, scheduled);
				return {
					...item,
					onImport: async () => {
						await this.plugin.importExternalItem(item);
						await this.render();
					},
					onImportAndPlan: async () => {
						const key = await this.plugin.importExternalItem(item);
						if (!key) throw new Error(this.plugin.t("error.schedule.taskCreate"));
						await plan(key, item.due);
					},
					onPlan: item.importedTaskKey
						? () => plan(item.importedTaskKey, item.planDate, item.scheduled)
						: undefined,
					onDismiss: async () => {
						await this.plugin.dismissExternalItem(item);
						await this.render();
					},
				};
			}),
		};
		main.createDiv({ attr: { "data-react-slot": "external-issues" } });
	}

	renderCalendarControlsModel(tasks) {
		const moveDate = async (direction) => {
			this.calendarDate = calendarControlsDomain.moveCalendarDate(
				this.calendarMode,
				this.calendarDate,
				direction,
			);
			await this.refreshCalendar();
			await this.render();
		};
		const selectedLists = this.plugin.settings.calendarListFilter || [];
		const calendarIds = selectedCalendarIds(this.plugin.settings);
		const subscriptions = this.plugin.settings.calendarSubscriptions || [];
		return {
			...calendarControlsDomain.calendarControlsState({
				calendarIds,
				date: this.calendarDate,
				error: this.external.errors.calendar || "",
				mode: this.calendarMode,
				search: this.calendarSearch,
				selectedLists,
				selectionMode: this.calendarSelectionMode,
				subscriptions,
			}),
			onPrevious: () => moveDate(-1),
			onNext: () => moveDate(1),
			onToday: async () => {
				this.calendarDate = localDate();
				await this.refreshCalendar();
				await this.render();
			},
			onMode: async (mode) => {
				if (this.calendarMode === mode) return;
				this.calendarMode = mode;
				await this.refreshCalendar();
				await this.render();
			},
			onSearch: (query) => {
				this.calendarSearch = query;
				void this.render();
			},
			onOpenFilter: () =>
				new CalendarFilterModal(
					this.app,
					["Inbox", ...this.plugin.allLists(tasks)],
					selectedLists,
					async (values) => {
						this.plugin.settings.calendarListFilter = values;
						this.calendarSelectedTaskKeys.clear();
						await this.plugin.saveSettings();
						await this.render();
					},
				).open(),
			onOpenGoogle: async () => {
				try {
					const calendars = await this.plugin.listGoogleCalendars();
					new CalendarSourcesModal(
						this.app,
						calendars,
						selectedCalendarIds(this.plugin.settings),
						async (ids) => {
							this.plugin.settings.googleCalendarIds = ids;
							this.plugin.settings.googleCalendarMeta = Object.fromEntries(
								calendars.map((calendar) => [
									calendar.id,
									{ name: calendar.name, color: calendar.color },
								]),
							);
							await this.plugin.saveSettings();
							await this.refreshCalendar();
							await this.render();
						},
					).open();
				} catch (error) {
					new Notice(this.plugin.t("error.calendar.list", { error: error.message }));
				}
			},
			onOpenSubscriptions: () =>
				new CalendarSubscriptionsModal(this.app, subscriptions, async (values) => {
					this.plugin.settings.calendarSubscriptions = values;
					await this.plugin.saveSettings();
					await this.refreshCalendar();
					await this.render();
				}).open(),
			onOpenViewOptions: () =>
				new CalendarViewOptionsModal(
					this.app,
					this.plugin.settings,
					async ({
						colorMode,
						showCompleted,
						density,
						showDetails,
						showEvents,
						showHabits,
						showFocus,
						showFutureRepeats,
						showTasks,
						timeZones,
					}) => {
						this.plugin.settings.calendarColorMode = colorMode;
						this.plugin.settings.calendarShowCompleted = showCompleted;
						this.plugin.settings.calendarDensity = density;
						this.plugin.settings.calendarShowDetails = showDetails;
						this.plugin.settings.calendarShowEvents = showEvents;
						this.plugin.settings.calendarShowHabits = showHabits;
						this.plugin.settings.calendarShowFocus = showFocus;
						this.plugin.settings.calendarShowFutureRepeats = showFutureRepeats;
						this.plugin.settings.calendarShowTasks = showTasks;
						this.plugin.settings.calendarTimeZones = timeZones;
						await this.plugin.saveSettings();
						await this.render();
					},
				).open(),
			onSelectMode: async () => {
				this.calendarSelectionMode = !this.calendarSelectionMode;
				if (!this.calendarSelectionMode) this.calendarSelectedTaskKeys.clear();
				await this.render();
			},
		};
	}

	renderPlanTrayModel(tasks) {
		const selectedLists = this.plugin.settings.calendarListFilter || [];
		const visibleTasks = planTrayVisibleTasks(
			tasks,
			selectedLists,
			this.calendarSearch,
			this.calendarSelectedTaskKeys,
		);
		const unscheduled = sortPlanTrayTasks(
			visibleTasks.filter((task) => !task.done && !task.wontDo && !task.timeBlock),
			this.calendarTraySort,
			this.calendarSelectedTaskKeys,
		);
		const selected = unscheduled.filter((task) => this.calendarSelectedTaskKeys.has(task.key));
		const payloadFor = (task) => {
			const dragged =
				this.calendarSelectedTaskKeys.has(task.key) && selected.length ? selected : [task];
			const keys = dragged.map((item) => ({ path: item.path, line: item.line }));
			return JSON.stringify(keys.length === 1 ? keys[0] : keys);
		};
		return {
			collapsed: this.calendarTrayCollapsed,
			date: this.calendarDate,
			sort: this.calendarTraySort,
			selectionMode: this.calendarSelectionMode,
			selectedCount: selected.length,
			items: unscheduled.map((task) => {
				const title = document.createElement("div");
				void MarkdownRenderer.render(this.app, cleanDescription(task.raw), title, task.path, this);
				return {
					color: calendarTaskColor(
						task,
						this.plugin.settings.calendarColorMode || "list",
						(kind, value) => this.plugin.taxonomyColor(kind, value),
					),
					context: task.list || "Inbox",
					key: task.key,
					meta: task.due || "",
					plainTitle: cleanDescription(task.raw),
					title,
					searchText:
						`${cleanDescription(task.raw)} ${task.list || "Inbox"} ${(task.tags || []).join(" ")}`.toLowerCase(),
					selected: this.calendarSelectedTaskKeys.has(task.key),
					dragPayload: payloadFor(task),
					onOpen: () => this.openEditor(task),
					onToggle: async () => {
						await this.plugin.toggleTask(task);
						await this.render();
					},
					onSelect: async () => {
						if (this.calendarSelectedTaskKeys.has(task.key))
							this.calendarSelectedTaskKeys.delete(task.key);
						else this.calendarSelectedTaskKeys.add(task.key);
						await this.render();
					},
				};
			}),
			onSort: async (sort) => {
				this.calendarTraySort = sort;
				await this.render();
			},
			onToggleCollapsed: async () => {
				this.calendarTrayCollapsed = !this.calendarTrayCollapsed;
				await this.render();
			},
			onToggleSelection: async () => {
				this.calendarSelectionMode = !this.calendarSelectionMode;
				if (!this.calendarSelectionMode) this.calendarSelectedTaskKeys.clear();
				await this.render();
			},
			onSchedule: async (date, time, duration) => {
				const startMinutes = minutesOf(time);
				if (!date || !Number.isFinite(startMinutes) || !selected.length) return;
				await this.plugin.batchScheduleTasks(selected, date, startMinutes, duration);
				this.calendarSelectedTaskKeys.clear();
				this.calendarSelectionMode = false;
				await this.render();
			},
			onScheduleAvailable: async (date, time, duration) => {
				const startMinutes = minutesOf(time);
				if (!date || !Number.isFinite(startMinutes) || !selected.length) return;
				const calendar = await this.plugin.loadCalendar(date, 1);
				if (calendar.errors.length)
					throw new Error(
						this.plugin.t("error.schedule.calendar", { error: calendar.errors.join(" / ") }),
					);
				const busyTasks = tasks
					.filter(
						(task) => !task.done && !task.wontDo && task.timeBlock && taskOccursOnDate(task, date),
					)
					.map((task) => taskTimeSegment(task, date))
					.filter(Boolean);
				const busyEvents = calendar.items
					.filter(
						(item) =>
							calendarItemDates(item).includes(date) &&
							Number.isFinite(item.startMinutes) &&
							Number.isFinite(item.endMinutes),
					)
					.map((item) => ({ startMinutes: item.startMinutes, endMinutes: item.endMinutes }));
				const slots = availableScheduleSlots(selected.length, date, startMinutes, duration, [
					...busyTasks,
					...busyEvents,
				]);
				if (!slots.length)
					throw new Error(
						this.plugin.t("error.schedule.noSlots", { time, duration, count: selected.length }),
					);
				await this.plugin.batchWriteTaskTimes(
					selected.map((task, index) => ({ task, slot: slots[index] })),
				);
				this.calendarSelectedTaskKeys.clear();
				this.calendarSelectionMode = false;
				this.external = mergeCalendarSnapshot(this.external, calendar, domainT);
				await this.render();
			},
		};
	}

	renderCalendar(main, tasks) {
		const density = this.plugin.settings.calendarDensity || "comfortable";
		const showDetails = this.plugin.settings.calendarShowDetails !== false;
		const shell = main.createDiv({
			cls: `ttd-calendar-shell is-${density}${showDetails ? "" : " is-hide-details"} m-0 max-w-none`,
		});
		const range = calendarRange(this.calendarMode, this.calendarDate);
		const span = range.days;
		const selectedLists = this.plugin.settings.calendarListFilter || [];
		shell.createDiv({ attr: { "data-react-slot": "calendar-controls" } });

		const listTasks =
			this.plugin.settings.calendarShowTasks === false
				? []
				: selectedLists.length
					? tasks.filter((task) => selectedLists.includes(task.list || "Inbox"))
					: tasks;
		const visibleTasks = listTasks.filter((task) =>
			matchesCalendarQuery(
				[cleanDescription(task.raw), task.list, ...(task.tags || []), task.path]
					.filter(Boolean)
					.join(" "),
				this.calendarSearch,
			),
		);
		const calendarTasks = expandRecurringTasks(
			visibleTasks,
			range.start,
			range.days,
			this.plugin.settings.calendarShowFutureRepeats !== false,
		);
		if (this.calendarSelectionMode) {
			this.calendarBatchActionsModel = this.renderCalendarBatchActionsModel(visibleTasks);
			shell.createDiv({ attr: { "data-react-slot": "calendar-batch-actions" } });
		}

		const planner = shell.createDiv({
			cls: `grid h-[calc(100vh-142px)] min-h-[460px] overflow-hidden rounded-lg border border-[var(--background-modifier-border)] max-[720px]:h-[calc(100dvh-270px)] max-[720px]:min-h-[420px] max-[720px]:grid-rows-[auto_minmax(0,1fr)] ${this.calendarMode === "year" ? "grid-cols-[minmax(0,1fr)]" : "grid-cols-[190px_minmax(0,1fr)] max-[720px]:grid-cols-1"}`,
		});
		planner.createDiv({
			cls: `${this.calendarMode === "year" ? "hidden" : ""} min-h-0 overflow-hidden border-r border-[var(--background-modifier-border)] max-[720px]:border-b max-[720px]:border-r-0`,
			attr: { "data-react-slot": "plan-tray" },
		});

		if (this.calendarMode === "month") {
			this.renderCalendarMonth(planner, calendarTasks);
		} else if (this.calendarMode === "multiweek") {
			this.renderCalendarMonth(planner, calendarTasks, {
				dates: Array.from({ length: 28 }, (_, index) => addDays(range.start, index)),
				multiweek: true,
			});
		} else if (this.calendarMode === "year") {
			this.renderCalendarYear(planner, calendarTasks);
		} else if (this.calendarMode === "agenda") {
			this.renderCalendarAgenda(planner, calendarTasks);
		} else if (span > 1) {
			const week = planner.createDiv({
				cls: `ttd-week flex min-w-0 overflow-x-auto bg-[var(--background-primary)] [&>.ttd-day]:min-w-0 [&>.ttd-day]:border-r [&>.ttd-day]:border-[var(--background-modifier-border)] [&>.ttd-day]:bg-[var(--background-primary)] [&>.ttd-day:last-child]:border-r-0 ${span === 3 ? "[&>.ttd-day]:w-1/3 [&>.ttd-day]:flex-[0_0_33.333%]" : "[&>.ttd-day]:flex-[1_0_240px]"}`,
			});
			for (let offset = 0; offset < span; offset += 1)
				this.renderCalendarDay(week, addDays(this.calendarDate, offset), calendarTasks, true);
		} else {
			this.renderCalendarDay(planner, this.calendarDate, calendarTasks, false);
		}
	}

	visibleCalendarEvents() {
		if (this.plugin.settings.calendarShowEvents === false) return [];
		return this.external.calendar.filter((item) =>
			matchesCalendarQuery(`${item.title || ""} ${item.meta || ""}`, this.calendarSearch),
		);
	}

	calendarActivities(date) {
		return calendarActivityItems(this.plugin.settings, date, this.calendarSearch);
	}

	renderCalendarBatchActionsModel(tasks) {
		const selected = tasks.filter(
			(task) =>
				this.calendarSelectedTaskKeys.has(task.key) && task.timeBlock && !task.done && !task.wontDo,
		);
		const shift = async (days) => {
			await this.plugin.batchMoveTaskTimes(selected, (task) => addDays(task.timeBlock.date, days));
			this.calendarSelectedTaskKeys.clear();
			await this.render();
		};
		return {
			date: this.calendarDate,
			selectedCount: selected.length,
			onShift: shift,
			onMoveTo: async (date) => {
				if (!date) return;
				await this.plugin.batchMoveTaskTimes(selected, () => date);
				this.calendarSelectedTaskKeys.clear();
				this.calendarDate = date;
				await this.refreshCalendar();
				await this.render();
			},
			onClear: async () => {
				this.calendarSelectedTaskKeys.clear();
				await this.render();
			},
		};
	}

	renderCalendarMonth(parent, tasks, options = {}) {
		const dates = options.dates || monthGridDates(this.calendarDate);
		const activeMonth = options.multiweek ? "" : this.calendarDate.slice(0, 7);
		const cells = dates.map((date, index) => {
			const dayLabel =
				options.multiweek && (index === 0 || date.endsWith("-01"))
					? `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`
					: String(Number(date.slice(8)));
			const dayTasks = tasks
				.filter(
					(task) =>
						!task.wontDo &&
						(this.plugin.settings.calendarShowCompleted || !task.done) &&
						taskOccursOnDate(task, date),
				)
				.toSorted(
					(a, b) =>
						(a.timeBlock?.startMinutes ?? 24 * 60) - (b.timeBlock?.startMinutes ?? 24 * 60) ||
						(b.priority || 0) - (a.priority || 0),
				);
			const dayEvents = this.visibleCalendarEvents().filter((item) =>
				calendarItemDates(item).includes(date),
			);
			const dayActivities = this.calendarActivities(date);
			const entries = [
				...dayTasks.map((task) => ({
					type: "task",
					task,
					order: task.timeBlock?.startMinutes ?? 24 * 60,
				})),
				...dayEvents.map((event) => ({ type: "event", event, order: event.startMinutes ?? -1 })),
				...dayActivities.map((activity) => ({ type: "activity", activity, order: -2 })),
			].toSorted((a, b) => a.order - b.order);
			const monthEntries = entries.map((entry) => {
				if (entry.type === "activity") {
					return {
						achieved: entry.activity.achieved,
						icon: entry.activity.icon,
						kind: "activity",
						title: entry.activity.title,
						type: entry.activity.activityType,
					};
				}
				if (entry.type === "event") {
					return {
						color: entry.event.calendarColor || "#7693e8",
						kind: "event",
						title: entry.event.title,
						url: entry.event.url,
					};
				}
				const { task } = entry;
				const title = document.createElement("span");
				void MarkdownRenderer.render(this.app, cleanDescription(task.raw), title, task.path, this);
				return {
					color: calendarTaskColor(
						task,
						this.plugin.settings.calendarColorMode || "list",
						(kind, value) => this.plugin.taxonomyColor(kind, value),
					),
					done: task.done,
					dragPayload:
						!task.done && !task.isVirtualOccurrence && !task.timeBlock?.multiDay
							? JSON.stringify({ path: task.path, line: task.line })
							: null,
					kind: "task",
					onOpen: () => {
						if (!task.isVirtualOccurrence) this.openEditor(task);
					},
					repeat: task.isVirtualOccurrence,
					time: task.timeBlock ? taskTimeSegment(task, date)?.start || task.timeBlock.start : null,
					title,
				};
			});
			return {
				date,
				dayLabel,
				entries: monthEntries,
				outside: Boolean(activeMonth && date.slice(0, 7) !== activeMonth),
				today: date === localDate(),
				onOpenDay: async () => {
					this.calendarDate = date;
					this.calendarMode = "day";
					await this.refreshCalendar();
					await this.render();
				},
				onDrop: async (payload) => {
					const parsed = JSON.parse(payload);
					const keys = Array.isArray(parsed) ? parsed : [parsed];
					const dropped = keys
						.map((key) => tasks.find((task) => task.path === key.path && task.line === key.line))
						.filter(Boolean);
					for (const task of dropped) {
						if (task.timeBlock) {
							const moved = moveTimeBlockToDate(task.timeBlock, date);
							await this.plugin.setTaskTime(
								task,
								moved.date,
								moved.startMinutes,
								moved.durationMinutes,
							);
						} else await this.plugin.setTaskDue(task, date);
					}
					this.calendarSelectedTaskKeys.clear();
					await this.render();
				},
			};
		});
		this.calendarMonths.push({ cells, multiweek: Boolean(options.multiweek) });
		parent.createDiv({ cls: "h-full min-h-0", attr: { "data-react-slot": "calendar-month" } });
	}

	renderCalendarYear(parent, tasks) {
		const year = Number(this.calendarDate.slice(0, 4));
		const taskCounts = new Map();
		tasks.forEach((task) => {
			if (task.wontDo || (task.done && !this.plugin.settings.calendarShowCompleted)) return;
			const start = task.timeBlock?.date || task.due;
			const end = task.timeBlock?.endDate || start;
			if (!start) return;
			for (let date = start; date <= end; date = addDays(date, 1)) {
				if (date.startsWith(`${year}-`)) taskCounts.set(date, (taskCounts.get(date) || 0) + 1);
			}
		});
		const eventCounts = new Map();
		this.visibleCalendarEvents().forEach((item) =>
			calendarItemDates(item).forEach((date) => {
				if (date?.startsWith(`${year}-`)) eventCounts.set(date, (eventCounts.get(date) || 0) + 1);
			}),
		);
		const months = [];
		for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
			const first = new Date(year, monthIndex, 1);
			const leading = (first.getDay() + 6) % 7;
			const lastDay = new Date(year, monthIndex + 1, 0).getDate();
			const days = [];
			for (let day = 1; day <= lastDay; day += 1) {
				const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
				const activityCount = this.calendarActivities(date).length;
				const count = (taskCounts.get(date) || 0) + (eventCounts.get(date) || 0) + activityCount;
				days.push({
					count,
					date,
					day,
					today: date === localDate(),
					onOpen: async () => {
						this.calendarDate = date;
						this.calendarMode = "day";
						await this.refreshCalendar();
						await this.render();
					},
				});
			}
			months.push({ days, leading, month: monthIndex + 1 });
		}
		this.calendarYear = { months };
		parent.createDiv({ cls: "h-full min-h-0", attr: { "data-react-slot": "calendar-year" } });
	}

	renderCalendarAgenda(parent, tasks) {
		const days = Array.from({ length: 30 }, (_, index) => addDays(this.calendarDate, index))
			.map((date) => {
				const dayTasks = tasks
					.filter(
						(task) =>
							!task.wontDo &&
							(this.plugin.settings.calendarShowCompleted || !task.done) &&
							taskOccursOnDate(task, date),
					)
					.toSorted(
						(a, b) =>
							(a.timeBlock?.startMinutes ?? 24 * 60) - (b.timeBlock?.startMinutes ?? 24 * 60) ||
							(b.priority || 0) - (a.priority || 0),
					);
				const dayEvents = this.visibleCalendarEvents()
					.filter((item) => calendarItemDates(item).includes(date))
					.toSorted((a, b) => (a.startMinutes ?? -1) - (b.startMinutes ?? -1));
				const dayActivities = this.calendarActivities(date);
				if (!dayTasks.length && !dayEvents.length && !dayActivities.length) return null;
				const entries = dayActivities.map((activity) => ({
					achieved: activity.achieved,
					icon: activity.icon,
					kind: "activity",
					label: this.plugin.t(
						`calendarDay.${["habit", "focus", "countdown"].includes(activity.activityType) ? activity.activityType : "activity"}`,
					),
					meta: activity.meta,
					title: activity.title,
					type: activity.activityType,
				}));
				dayEvents.forEach((event) =>
					entries.push({
						kind: "event",
						color: event.calendarColor || "#7693e8",
						meta: event.calendarName || "Google Calendar",
						time: event.allDay ? this.plugin.t("calendarDay.allDay") : timeOf(event.startMinutes),
						title: event.title,
						url: event.url,
					}),
				);
				dayTasks.forEach((task) => {
					const title = document.createElement("span");
					void MarkdownRenderer.render(
						this.app,
						cleanDescription(task.raw),
						title,
						task.path,
						this,
					);
					entries.push({
						kind: "task",
						color: calendarTaskColor(
							task,
							this.plugin.settings.calendarColorMode || "list",
							(kind, value) => this.plugin.taxonomyColor(kind, value),
						),
						done: task.done,
						dragPayload:
							!task.done && !task.isVirtualOccurrence && !task.timeBlock?.multiDay
								? JSON.stringify({ path: task.path, line: task.line })
								: null,
						list: task.list || "Inbox",
						onEdit: () => {
							if (!task.isVirtualOccurrence) this.openEditor(task);
						},
						onToggle: async () => {
							if (!task.isVirtualOccurrence) {
								await this.plugin.toggleTask(task);
								await this.render();
							}
						},
						repeat: task.isVirtualOccurrence,
						time: task.timeBlock
							? taskTimeSegment(task, date)?.start || task.timeBlock.start
							: this.plugin.t("taskEdit.due"),
						title,
					});
				});
				return {
					count: entries.length,
					date,
					day: Number(date.slice(8)),
					entries,
					label: formatDisplayDate(activeDomainLocale, new Date(`${date}T00:00:00`), {
						month: "short",
						weekday: "short",
					}),
					today: date === localDate(),
					onOpenDay: async () => {
						this.calendarDate = date;
						this.calendarMode = "day";
						await this.refreshCalendar();
						await this.render();
					},
					onDrop: async (payload) => {
						const parsed = JSON.parse(payload);
						const keys = Array.isArray(parsed) ? parsed : [parsed];
						const dropped = keys
							.map((key) => tasks.find((task) => task.path === key.path && task.line === key.line))
							.filter(Boolean);
						for (const task of dropped) {
							if (task.timeBlock) {
								const moved = moveTimeBlockToDate(task.timeBlock, date);
								await this.plugin.setTaskTime(
									task,
									moved.date,
									moved.startMinutes,
									moved.durationMinutes,
								);
							} else await this.plugin.setTaskDue(task, date);
						}
						this.calendarSelectedTaskKeys.clear();
						await this.render();
					},
				};
			})
			.filter(Boolean);
		this.calendarAgenda = {
			compact: (this.plugin.settings.calendarDensity || "comfortable") === "compact",
			days,
			hideDetails: this.plugin.settings.calendarShowDetails === false,
		};
		parent.createDiv({ cls: "h-full min-h-0", attr: { "data-react-slot": "calendar-agenda" } });
	}

	renderCalendarDay(parent, date, tasks, showHeader) {
		const day = parent.createDiv({
			cls: `ttd-day h-full min-h-0 min-w-0 overflow-hidden bg-[var(--background-primary)]${date === localDate() ? " is-today" : ""}`,
		});
		const allDay = this.visibleCalendarEvents().filter(
			(item) => item.allDay && calendarItemDates(item).includes(date),
		);
		const activities = this.calendarActivities(date);
		this.calendarDayChrome.push({
			activities: activities.map((activity) => ({
				achieved: activity.achieved,
				icon: activity.icon,
				meta: activity.meta,
				title: activity.title,
				type: activity.activityType,
			})),
			allDayEvents: allDay.map((item) => ({
				color: item.calendarColor || "#7693e8",
				title: item.title,
				url: item.url,
			})),
			date,
			dayNumber: Number(date.slice(8)),
			showHeader,
			today: date === localDate(),
			weekday: formatDisplayDate(activeDomainLocale, new Date(`${date}T00:00:00`), {
				weekday: "short",
			}),
		});
		day.createDiv({ attr: { "data-react-slot": "calendar-day-chrome", "data-date": date } });
		const scroll = day.createDiv({
			cls: `h-full min-h-0 overflow-y-auto${showHeader ? " min-h-[560px]" : ""}`,
			attr: { "data-calendar-scroll": date },
		});
		const timeline = scroll.createDiv({
			cls: "relative h-[1152px]",
			attr: { "data-calendar-timeline": date },
		});
		const startHour = 6;
		const endHour = 24;
		const timeZones = calendarTimeZones(this.plugin.settings.calendarTimeZones);
		const now = new Date();
		const nowMinutes = now.getHours() * 60 + now.getMinutes();
		const span = calendarSpan(this.calendarMode);
		const multiDay = span > 1;
		const scrollLayout = window.innerWidth <= 720 ? "mobile" : "desktop";
		const scrollKey = multiDay
			? `${scrollLayout}:${this.calendarMode}:${this.calendarDate}`
			: `${scrollLayout}:${this.calendarMode}:${date}`;
		const todayInView =
			localDate(now) >= this.calendarDate && localDate(now) <= addDays(this.calendarDate, span - 1);
		const timedEvents = this.visibleCalendarEvents().filter(
			(item) => !item.allDay && item.date === date,
		);
		const scheduledTasks = tasks
			.filter(
				(task) =>
					!task.wontDo &&
					(this.plugin.settings.calendarShowCompleted || !task.done) &&
					task.timeBlock &&
					taskOccursOnDate(task, date),
			)
			.map((task) => ({ task, segment: taskTimeSegment(task, date) || task.timeBlock }));
		const layoutItems = [
			...timedEvents.map((event) => ({
				kind: "event",
				event,
				startMinutes: event.startMinutes,
				endMinutes: event.endMinutes,
			})),
			...scheduledTasks.map(({ task, segment }) => ({
				kind: "task",
				task,
				segment,
				startMinutes: segment.startMinutes,
				endMinutes: segment.endMinutes,
			})),
		];
		const blockItems = calendarBlockLayout(layoutItems).map(({ item, lane, lanes }) => {
			if (item.kind === "event")
				return {
					kind: "event",
					title: item.event.title,
					meta: item.event.meta,
					url: item.event.url,
					color: item.event.calendarColor || "#7693e8",
					startMinutes: item.event.startMinutes,
					endMinutes: item.event.endMinutes,
					startHour,
					lane,
					lanes,
				};
			const task = item.task;
			const segment = item.segment;
			const title = document.createElement("div");
			void MarkdownRenderer.render(this.app, cleanDescription(task.raw), title, task.path, this);
			const canChange = !task.done && !task.isVirtualOccurrence && !task.timeBlock.multiDay;
			return {
				kind: "task",
				color: calendarTaskColor(
					task,
					this.plugin.settings.calendarColorMode || "list",
					(kind, value) => this.plugin.taxonomyColor(kind, value),
				),
				conflictLabel: calendarConflictLabel(item, layoutItems, domainT),
				done: task.done,
				dragPayload: JSON.stringify({ path: task.path, line: task.line }),
				multiDay: task.timeBlock.multiDay,
				onOpen: () => {
					if (!task.isVirtualOccurrence) this.openEditor(task);
				},
				selected: this.calendarSelectedTaskKeys.has(task.key),
				selectionMode: this.calendarSelectionMode,
				title,
				virtual: task.isVirtualOccurrence,
				startMinutes: segment.startMinutes,
				endMinutes: segment.endMinutes,
				startHour,
				lane,
				lanes,
				onToggleSelection: async () => {
					if (!canChange) return;
					if (this.calendarSelectedTaskKeys.has(task.key))
						this.calendarSelectedTaskKeys.delete(task.key);
					else this.calendarSelectedTaskKeys.add(task.key);
					await this.render();
				},
				onResize: async (endMinutes) => {
					const duration = Math.max(15, endMinutes - task.timeBlock.startMinutes);
					await this.plugin.setTaskTime(
						task,
						task.timeBlock.date,
						task.timeBlock.startMinutes,
						duration,
					);
					await this.render();
				},
				onShorter: async () => {
					const duration = Math.max(
						15,
						task.timeBlock.endMinutes - task.timeBlock.startMinutes - 15,
					);
					await this.plugin.setTaskTime(
						task,
						task.timeBlock.date,
						task.timeBlock.startMinutes,
						duration,
					);
					await this.render();
				},
				onLonger: async () => {
					const duration = task.timeBlock.endMinutes - task.timeBlock.startMinutes + 15;
					await this.plugin.setTaskTime(
						task,
						task.timeBlock.date,
						task.timeBlock.startMinutes,
						duration,
					);
					await this.render();
				},
				onUnschedule: async () => {
					await this.plugin.clearTaskTime(task);
					await this.render();
				},
			};
		});
		const earliestItemMinutes = layoutItems.length
			? Math.min(...layoutItems.map((item) => item.startMinutes))
			: null;
		this.calendarTimeBlocks.push({
			autoScrollMinutes:
				(date === localDate(now) || (multiDay && todayInView)) &&
				nowMinutes >= startHour * 60 &&
				nowMinutes < endHour * 60
					? nowMinutes
					: !multiDay
						? earliestItemMinutes
						: null,
			compact: showHeader,
			currentMinutes:
				date === localDate(now) && nowMinutes >= startHour * 60 && nowMinutes < endHour * 60
					? nowMinutes
					: null,
			date,
			hideDetails: this.plugin.settings.calendarShowDetails === false,
			hours: Array.from({ length: endHour - startHour }, (_, index) => {
				const hour = startHour + index;
				return {
					hour,
					zones: timeZones.map((timeZone) => ({
						label: `${timeZone.split("/").at(-1).replaceAll("_", " ")} ${calendarTimeZoneLabel(date, hour, timeZone, () => activeDomainLocale)}`,
						timeZone,
					})),
				};
			}),
			items: blockItems,
			onCreate: (startMinutes) => {
				new CalendarTaskModal(
					this.app,
					date,
					startMinutes,
					this.plugin.allLists(tasks),
					async (parsed, durationMinutes, list) => {
						await this.plugin.addTask(parsed.description, date, {
							...parsed,
							list,
							timeBlock: { date, startMinutes, durationMinutes },
						});
						await this.render();
					},
				).open();
			},
			onDrop: async (payload, requestedStart) => {
				const parsed = JSON.parse(payload);
				const keys = Array.isArray(parsed) ? parsed : [parsed];
				const droppedTasks = keys
					.map((key) =>
						tasks.find((candidate) => candidate.path === key.path && candidate.line === key.line),
					)
					.filter(Boolean);
				if (!droppedTasks.length) return;
				if (droppedTasks.length > 1)
					await this.plugin.batchScheduleTasks(droppedTasks, date, requestedStart, 60);
				else {
					const task = droppedTasks[0];
					const schedule = calendarDropSchedule(task.timeBlock, date, requestedStart);
					await this.plugin.setTaskTime(
						task,
						schedule.date,
						schedule.startMinutes,
						schedule.durationMinutes,
					);
				}
				this.calendarSelectedTaskKeys.clear();
				await this.render();
			},
			onScroll: (scrollTop) => this.calendarScrollPositions.set(scrollKey, scrollTop),
			savedScrollTop: this.calendarScrollPositions.get(scrollKey) ?? null,
			scrollGroup: multiDay ? scrollKey : null,
		});
		timeline.createDiv({ attr: { "data-react-slot": "calendar-time-blocks", "data-date": date } });
	}

	renderFocus(main, tasks) {
		const active = tasks.filter((task) => !task.done && !task.wontDo && task.depth === 0);
		const selectedFocusTask = active.find((task) => task.key === this.focusState.taskKey);
		const estimatedFocusMinutes =
			selectedFocusTask?.estimatedMinutes ||
			(selectedFocusTask?.estimatedPomos ? selectedFocusTask.estimatedPomos * 25 : 0);
		const durationOptions = [
			[1500, this.plugin.t("common.minutes", { count: 25 })],
			[3000, this.plugin.t("common.minutes", { count: 50 })],
		];
		if (
			estimatedFocusMinutes &&
			!durationOptions.some(([seconds]) => seconds === estimatedFocusMinutes * 60)
		)
			durationOptions.push([
				estimatedFocusMinutes * 60,
				this.plugin.t("focus.estimate", { minutes: estimatedFocusMinutes }),
			]);
		const dates = Array.from({ length: 7 }, (_, index) => addDays(localDate(), index - 6));
		const totals = dates.map((date) =>
			(this.plugin.settings.focusLog || [])
				.filter((entry) => entry.date === date)
				.reduce((sum, entry) => sum + entry.minutes, 0),
		);
		const last30 = addDays(localDate(), -29);
		const detail = focusLogStats(this.plugin.settings.focusLog || [], last30, localDate());
		this.focusModel = {
			tasks: active.map((task) => ({ key: task.key, title: cleanDescription(task.raw) })),
			selectedTaskKey: this.focusState.taskKey || "",
			mode: this.focusState.mode || "timer",
			running: this.focusState.running,
			duration: this.focusState.duration,
			durationOptions: durationOptions.map(([seconds, label]) => ({ seconds, label })),
			getSeconds: () => this.currentFocusSeconds(),
			days: dates.map((date, index) => ({
				date,
				minutes: totals[index],
				label: formatDisplayDate(activeDomainLocale, new Date(`${date}T00:00:00`), {
					weekday: "short",
				}),
			})),
			summary: [
				[
					this.plugin.t("focus.total30"),
					this.plugin.t("common.minutes", { count: detail.totalMinutes }),
				],
				[
					this.plugin.t("focus.sessions"),
					this.plugin.t("common.times", { count: detail.sessions }),
				],
				[
					this.plugin.t("focus.timer"),
					this.plugin.t("common.minutes", { count: detail.byMode.timer }),
				],
				[
					this.plugin.t("focus.stopwatch"),
					this.plugin.t("common.minutes", { count: detail.byMode.stopwatch }),
				],
			].map(([label, value]) => ({ label, value })),
			taskStats: detail.byTask.slice(0, 6).map(([title, minutes]) => ({ title, minutes })),
			onTaskChange: async (key) => {
				this.focusState.taskKey = key;
				const selected = active.find((task) => task.key === key);
				const estimate =
					selected?.estimatedMinutes ||
					(selected?.estimatedPomos ? selected.estimatedPomos * 25 : 0);
				if (estimate && !this.focusState.running && this.focusState.mode !== "stopwatch") {
					this.focusState.duration = estimate * 60;
					this.focusState.remaining = estimate * 60;
				}
				await this.saveFocusState();
				await this.render();
			},
			onModeChange: async (mode) => {
				this.focusState.mode = mode;
				this.focusState.endAt = null;
				this.focusState.startedAt = null;
				await this.saveFocusState();
				await this.render();
			},
			onDurationChange: async (seconds) => {
				this.focusState.duration = seconds;
				this.focusState.remaining = seconds;
				await this.saveFocusState();
				await this.render();
			},
			onToggle: async () => {
				if (this.focusState.running) {
					if (this.focusState.mode === "stopwatch") {
						this.focusState.elapsed = this.currentFocusSeconds();
						this.focusState.startedAt = null;
					} else this.focusState.remaining = this.currentFocusRemaining();
					this.focusState.running = false;
					this.focusState.endAt = null;
				} else {
					this.focusState.running = true;
					if (this.focusState.mode === "stopwatch") this.focusState.startedAt = Date.now();
					else {
						if (this.focusState.remaining <= 0)
							this.focusState.remaining = this.focusState.duration;
						this.focusState.endAt = Date.now() + this.focusState.remaining * 1000;
					}
				}
				await this.saveFocusState();
				await this.render();
			},
			onReset: async () => {
				this.focusState.running = false;
				this.focusState.endAt = null;
				this.focusState.startedAt = null;
				this.focusState.remaining = this.focusState.duration;
				this.focusState.elapsed = 0;
				await this.saveFocusState();
				await this.render();
			},
			onRecord: async () => {
				const seconds = this.currentFocusSeconds();
				const task = active.find((item) => item.key === this.focusState.taskKey);
				await this.plugin.completeFocusSession(
					Math.max(1, Math.round(seconds / 60)),
					task,
					"stopwatch",
					seconds,
				);
				this.focusState.running = false;
				this.focusState.startedAt = null;
				this.focusState.elapsed = 0;
				await this.saveFocusState();
				await this.render();
			},
		};
		main.createDiv({ attr: { "data-react-slot": "focus" } });
	}

	renderHabits(main) {
		const allHabits = this.plugin.settings.habits || [];
		const archivedCount = allHabits.filter((habit) => habit.archived).length;
		const openEditor = (habit = null) => {
			new HabitModal(
				this.app,
				habit,
				async (value) => {
					await this.plugin.saveHabit(value);
					await this.render();
				},
				async () => {
					await this.plugin.deleteHabit(habit.id);
					await this.render();
				},
				async (archived) => {
					await this.plugin.archiveHabit(habit.id, archived);
					await this.render();
				},
			).open();
		};
		const habits = allHabits.filter((habit) => Boolean(habit.archived) === this.showArchivedHabits);
		const dates = Array.from({ length: 7 }, (_, index) => addDays(localDate(), index - 6));
		const today = localDate();
		const activeHabits = allHabits.filter((habit) => !habit.archived);
		const scheduledToday = activeHabits.filter((habit) => isHabitScheduled(habit, today));
		this.habitsModel = {
			archivedCount,
			showArchived: this.showArchivedHabits,
			todayScheduled: scheduledToday.length,
			todayCompleted: scheduledToday.filter(
				(habit) =>
					habitValue(this.plugin.settings.habitLog, habit.id, today) >= (habit.target || 1),
			).length,
			habits: habits.map((habit) => {
				const target = habit.target || 1;
				const weekly = habit.scheduleMode === "weekly";
				const streakUnit = this.plugin.t(weekly ? "common.week" : "common.day");
				const days = dates.map((date) => {
					const weekday = new Date(`${date}T00:00:00`).getDay();
					const scheduled = !habit.archived && (weekly || habit.weekdays.includes(weekday));
					const value = habitValue(this.plugin.settings.habitLog, habit.id, date);
					const done = value >= target;
					return {
						date,
						done,
						scheduled,
						today: date === today,
						value,
						label: formatDisplayDate(activeDomainLocale, new Date(`${date}T00:00:00`), {
							weekday: "narrow",
						}),
					};
				});
				let weeklyProgress = null;
				if (weekly) {
					const start = weekStart();
					const completed = Array.from({ length: 7 }, (_, index) => addDays(start, index)).filter(
						(date) => habitValue(this.plugin.settings.habitLog, habit.id, date) >= target,
					).length;
					weeklyProgress = this.plugin.t("habits.weeklyProgress", {
						completed,
						target: habit.weeklyTarget || 1,
					});
				}
				const heatmap = Array.from({ length: 35 }, (_, index) => addDays(today, index - 34)).map(
					(date) => {
						const value = habitValue(this.plugin.settings.habitLog, habit.id, date);
						const scheduled = isHabitScheduled({ ...habit, archived: false }, date);
						return {
							date,
							scheduled,
							state: value >= target ? "done" : value > 0 ? "partial" : "empty",
							title: this.plugin.t("habits.dayValue", {
								date,
								value,
								target,
								unit: habit.unit || this.plugin.t("habitDialog.defaultUnit"),
							}),
						};
					},
				);
				return {
					id: habit.id,
					name: habit.name,
					archived: Boolean(habit.archived),
					streakLabel: this.plugin.t("habits.streak", {
						count: this.habitStreak(habit),
						unit: streakUnit,
					}),
					targetLabel: this.plugin.t(weekly ? "habits.weeklyTargetLabel" : "habits.targetLabel", {
						target,
						unit: habit.unit || this.plugin.t("habitDialog.defaultUnit"),
						weeklyTarget: habit.weeklyTarget || 1,
					}),
					reminders: habit.reminders || [],
					days,
					heatmap,
					weeklyProgress,
					target,
					unit: habit.unit || this.plugin.t("habitDialog.defaultUnit"),
					onEdit: () => openEditor(habit),
					onToggle: async (date) => {
						await this.plugin.toggleHabit(habit.id, date, target);
						await this.render();
					},
				};
			}),
			onAdd: () => openEditor(),
			onToggleArchiveView: async () => {
				this.showArchivedHabits = !this.showArchivedHabits;
				await this.render();
			},
		};
		main.createDiv({ attr: { "data-react-slot": "habits" } });
	}

	habitStreak(habit) {
		const target = habit.target || 1;
		const completed = (date) => habitValue(this.plugin.settings.habitLog, habit.id, date) >= target;
		if (habit.scheduleMode === "weekly") {
			let start = weekStart();
			const countWeek = (week) =>
				Array.from({ length: 7 }, (_, index) => addDays(week, index)).filter(completed).length;
			if (countWeek(start) < (habit.weeklyTarget || 1)) start = addDays(start, -7);
			let streak = 0;
			for (let attempts = 0; attempts < 53; attempts += 1) {
				if (countWeek(start) < (habit.weeklyTarget || 1)) break;
				streak += 1;
				start = addDays(start, -7);
			}
			return streak;
		}
		let date = localDate();
		let streak = 0;
		if (!completed(date)) date = addDays(date, -1);
		for (let attempts = 0; attempts < 366; attempts += 1) {
			const weekday = new Date(`${date}T00:00:00`).getDay();
			if (habit.weekdays.includes(weekday)) {
				if (!completed(date)) break;
				streak += 1;
			}
			date = addDays(date, -1);
		}
		return streak;
	}

	renderCountdowns(main) {
		const openEditor = (item = null) =>
			new CountdownModal(
				this.app,
				item,
				async (value) => {
					await this.plugin.saveCountdown(value);
					await this.render();
				},
				async () => {
					await this.plugin.deleteCountdown(item.id);
					await this.render();
				},
			).open();
		const countdowns = this.plugin.settings.countdowns || [];
		const sorted = [...countdowns].toSorted((a, b) => {
			const left = countdownStatus(a);
			const right = countdownStatus(b);
			const leftRank = left.delta < 0 ? Number.MAX_SAFE_INTEGER + left.delta : left.delta;
			const rightRank = right.delta < 0 ? Number.MAX_SAFE_INTEGER + right.delta : right.delta;
			return leftRank - rightRank;
		});
		const toModel = (item) => {
			const status = countdownStatus(item);
			return {
				id: item.id,
				title: item.title,
				target: status.target,
				label: status.label,
				delta: status.delta,
				color: item.color || "#e58b3e",
				repeatLabel:
					item.repeat && item.repeat !== "none"
						? this.plugin.t("countdowns.repeatLabel", {
								frequency: this.plugin.t(
									item.repeat.startsWith("monthly") ? "countdowns.monthly" : "countdowns.yearly",
								),
							})
						: null,
				reminderLabel: item.reminder
					? this.plugin.t("countdowns.reminderLabel", {
							advance: item.reminderDays
								? this.plugin.t("countdowns.daysBefore", { count: item.reminderDays })
								: "",
							time: item.reminder,
						})
					: null,
				note: item.note || "",
				onEdit: () => openEditor(item),
			};
		};
		const featuredItem =
			sorted.find((item) => countdownStatus(item).delta >= 0) || sorted[0] || null;
		const remaining = featuredItem ? sorted.filter((item) => item.id !== featuredItem.id) : [];
		this.countdownsModel = {
			featured: featuredItem ? toModel(featuredItem) : null,
			upcoming: remaining.filter((item) => countdownStatus(item).delta >= 0).map(toModel),
			past: remaining.filter((item) => countdownStatus(item).delta < 0).map(toModel),
			onAdd: () => openEditor(),
		};
		main.createDiv({ attr: { "data-react-slot": "countdowns" } });
	}

	renderStats(main, tasks) {
		this.statsModel = {
			...statsDomain.statsSnapshot({
				tasks,
				focusLog: this.plugin.settings.focusLog,
				habits: this.plugin.settings.habits,
				habitLog: this.plugin.settings.habitLog,
			}),
			onOpenReview: async () => {
				const previousFilter = this.filter;
				this.filter = "review";
				try {
					await this.render({ throwOnFailure: true });
				} catch (error) {
					this.filter = previousFilter;
					throw error;
				}
			},
		};
		main.createDiv({ attr: { "data-react-slot": "stats" } });
	}

	renderReviewReminderModel() {
		const prompt = weeklyReviewPrompt(
			this.plugin.settings.lastReview,
			localDate(),
			this.plugin.settings.reviewPromptSnoozedUntil,
			domainT,
		);
		const focus = reviewFocusProgress(
			previousReviewFocus(this.plugin.settings.lastReview),
			(this.tasks || [])
				.filter((task) => !task.parentKey && !task.wontDo)
				.map((task) => ({
					id: task.taskId,
					title: plainDescription(task.raw),
					doneDate: task.done ? task.doneDate : "",
					scheduled: Boolean(task.timeBlock),
				})),
			domainT,
		);
		if (!prompt && !focus) return null;
		return {
			detail: prompt?.detail || this.plugin.t("review.focusDetail", { date: focus.date }),
			focus,
			reviewDue: Boolean(prompt),
			onOpen: () => {
				this.filter = "review";
				void this.render();
			},
			onDismiss: async () => {
				const previousSnooze = this.plugin.settings.reviewPromptSnoozedUntil;
				this.plugin.settings.reviewPromptSnoozedUntil = weeklyReviewSnoozeUntil();
				try {
					await this.plugin.saveSettings();
				} catch (error) {
					this.plugin.settings.reviewPromptSnoozedUntil = previousSnooze;
					throw error;
				}
				await this.render();
			},
			onPlanFocus: (item) => this.planReviewFocusItem(item),
		};
	}

	async planReviewFocusItem(item) {
		const tasks = this.tasks || [];
		const focusId = this.plugin.settings.lastReview?.focusIds?.[item] || "";
		const existing = tasks.find(
			(task) =>
				!task.done &&
				!task.wontDo &&
				!task.parentKey &&
				(focusId
					? task.taskId === focusId
					: plainDescription(task.raw) === item || cleanDescription(task.raw) === item),
		);
		const key = await resolveReviewFocusTaskKey(item, existing?.key, this.reviewFocusTaskKeys, () =>
			this.plugin.addTask(item, ""),
		);
		if (!key) {
			this.reviewFocusTaskKeys.delete(item);
			throw new Error(this.plugin.t("review.error.focusTask"));
		}
		const identityTask =
			existing || (await this.plugin.collectTasks()).find((task) => task.key === key);
		if (identityTask) {
			const taskId = await this.plugin.ensureTaskIdentity(identityTask);
			if (
				this.plugin.settings.lastReview?.next?.includes(item) &&
				this.plugin.settings.lastReview.focusIds?.[item] !== taskId
			) {
				this.plugin.settings.lastReview.focusIds = {
					...this.plugin.settings.lastReview.focusIds,
					[item]: taskId,
				};
				await this.plugin.saveSettings();
			}
		}
		await this.openTaskInPlannerAndRender(
			key,
			existing?.timeBlock?.date || existing?.due,
			Boolean(existing?.timeBlock),
		);
		this.reviewFocusTaskKeys.delete(item);
	}

	renderReview(main, tasks) {
		const today = localDate();
		const {
			start,
			completed,
			focusEntries,
			focusMinutes,
			planReview,
			carryovers,
			carryoverContexts,
			carryoverOverflow,
			carryoverOverflowCount,
		} = reviewPeriodSnapshot(tasks, this.plugin.settings.focusLog || [], today, domainT);
		const previousMetrics = this.plugin.settings.lastReview?.metrics;
		const reviewApp = this.app || this.plugin.app;
		const reviewHistory = reviewHistoryPaths(reviewApp?.vault?.getMarkdownFiles?.() || []).map(
			(path) => ({
				path,
				label: path.slice(path.lastIndexOf("/") + 1, -3),
				onOpen: () => reviewApp.workspace.openLinkText(path, "", true),
			}),
		);
		const renderMarkdown = (value, sourcePath) => {
			if (typeof document === "undefined") return value;
			const element = document.createElement("span");
			element.className = "markdown-rendered";
			void MarkdownRenderer.render(this.app, value, element, sourcePath, this);
			return element;
		};
		this.reviewModel = {
			previousFocus: reviewFocusProgress(
				previousReviewFocus(this.plugin.settings.lastReview),
				tasks
					.filter((task) => !task.parentKey && !task.wontDo)
					.map((task) => ({
						id: task.taskId,
						title: plainDescription(task.raw),
						doneDate: task.done ? task.doneDate : "",
						scheduled: Boolean(task.timeBlock),
					})),
				domainT,
			),
			history: reviewHistory,
			summary: reviewSummary(
				{
					completedCount: completed.length,
					focusMinutes,
					ongoingCount: tasks.filter(
						(task) => !task.done && !task.wontDo && task.status !== this.plugin.statuses()[0].id,
					).length,
					planCompleted: planReview.completed.length,
					planned: planReview.planned.length,
					previousMetrics,
				},
				domainT,
			),
			achievements: completed.map((task) => ({
				title: renderMarkdown(cleanDescription(task.raw), task.path),
				meta: task.doneDate,
				source: externalSourceLabel(task) || undefined,
			})),
			focus: focusEntries
				.slice()
				.toReversed()
				.map((entry) => ({
					title: entry.title || this.plugin.t("focus.noTask"),
					meta: `${entry.date} · ${this.plugin.t("common.minutes", { count: entry.minutes })}`,
				})),
			carryovers: carryovers.map((task) => ({
				key: task.key,
				plainTitle: plainDescription(task.raw),
				title: renderMarkdown(cleanDescription(task.raw), task.path),
				reason: this.reviewDraft.carryoverReasons[task.key] || "",
				context: carryoverContexts[task.key],
				source: externalSourceLabel(task) || undefined,
			})),
			carryoverOverflowCount,
			draft: {
				wins: this.reviewDraft.wins,
				friction: this.reviewDraft.friction,
				lessons: this.reviewDraft.lessons,
				next: this.reviewDraft.next,
			},
			onPlanPreviousFocus: (item) => this.planReviewFocusItem(item),
			onReasonChange: (key, reason) => {
				this.reviewDraft.carryoverReasons[key] = reason;
				this.reviewDraftDirty = true;
				this.reviewDraftVersion += 1;
			},
			onFocusSourceChange: (title, key) => {
				this.reviewDraft.focusTaskKeys[title] = key;
				this.reviewDraftDirty = true;
				this.reviewDraftVersion += 1;
			},
			onDraftChange: (key, value) => {
				this.reviewDraft[key] = value;
				this.reviewDraftDirty = true;
				this.reviewDraftVersion += 1;
			},
			onPersistDraft: (draft, carryoverReasons) => {
				this.reviewDraft = {
					...draft,
					carryoverReasons: { ...carryoverReasons },
					focusTaskKeys: { ...this.reviewDraft.focusTaskKeys },
				};
				return this.queueReviewDraftSave();
			},
			onOpenRemainingCarryovers: async () => {
				const previousFilter = this.filter;
				const previousQuery = this.query;
				const previousOverflowTaskKeys = new Set(this.reviewOverflowTaskKeys);
				this.reviewOverflowTaskKeys = new Set(carryoverOverflow.map((task) => task.key));
				this.filter = "review-overflow";
				this.query = "";
				try {
					await this.render({ throwOnFailure: true });
				} catch (error) {
					this.filter = previousFilter;
					this.query = previousQuery;
					this.reviewOverflowTaskKeys = previousOverflowTaskKeys;
					throw error;
				}
			},
			onSave: async () => {
				await this.reviewDraftSavePromise.catch(() => undefined);
				const nextFocus = requiredReviewFocusItems(this.reviewDraft.next, domainT);
				const focusIds = {};
				for (const title of nextFocus) {
					const sourceKey = this.reviewDraft.focusTaskKeys?.[title];
					const task =
						tasks.find(
							(candidate) =>
								candidate.key === sourceKey &&
								!candidate.done &&
								!candidate.wontDo &&
								!candidate.parentKey,
						) ||
						tasks.find(
							(candidate) =>
								!candidate.done &&
								!candidate.wontDo &&
								!candidate.parentKey &&
								(plainDescription(candidate.raw) === title ||
									cleanDescription(candidate.raw) === title),
						);
					if (task) focusIds[title] = await this.plugin.ensureTaskIdentity(task);
				}
				await this.plugin.createReviewNote({
					start,
					end: today,
					completed,
					focusMinutes,
					carryovers,
					carryoverContexts,
					reflection: this.reviewDraft,
				});
				const previousLastReview = this.plugin.settings.lastReview;
				const previousSnooze = this.plugin.settings.reviewPromptSnoozedUntil;
				const previousPersistedDraft = this.plugin.settings.reviewDraft;
				try {
					this.plugin.settings.lastReview = completedReviewRecord({
						completedCount: completed.length,
						date: today,
						focusIds,
						focusMinutes,
						next: nextFocus,
						planCompleted: planReview.completed.length,
						planned: planReview.planned.length,
					});
					this.plugin.settings.reviewPromptSnoozedUntil = "";
					this.plugin.settings.reviewDraft = emptyReviewDraft();
					await this.plugin.saveSettings();
				} catch (error) {
					this.plugin.settings.lastReview = previousLastReview;
					this.plugin.settings.reviewPromptSnoozedUntil = previousSnooze;
					this.plugin.settings.reviewDraft = previousPersistedDraft;
					throw error;
				}
				this.reviewDraft = emptyReviewDraft();
				this.reviewDraftDirty = false;
				new Notice(this.plugin.t("review.saved"));
				this.filter = "today";
				await this.render();
			},
		};
		main.createDiv({ attr: { "data-react-slot": "review" } });
	}

	currentFocusRemaining() {
		if (!this.focusState.running || !this.focusState.endAt) return this.focusState.remaining;
		return Math.max(0, Math.ceil((this.focusState.endAt - Date.now()) / 1000));
	}

	currentFocusSeconds() {
		if (this.focusState.mode !== "stopwatch") return this.currentFocusRemaining();
		return focusElapsedSeconds(this.focusState);
	}

	formatFocusTime(seconds) {
		const safe = Math.max(0, seconds);
		return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
	}

	async saveFocusState() {
		this.plugin.settings.focusState = { ...this.focusState };
		await this.plugin.saveSettings();
	}

	async tickFocus() {
		if (!this.focusState.running) return;
		if (this.focusState.mode === "stopwatch") {
			if (this.focusClockEl?.isConnected)
				this.focusClockEl.setText(this.formatFocusTime(this.currentFocusSeconds()));
			return;
		}
		const remaining = this.currentFocusRemaining();
		if (this.focusClockEl?.isConnected) this.focusClockEl.setText(this.formatFocusTime(remaining));
		if (remaining > 0) return;
		const task = (this.tasks || []).find((item) => item.key === this.focusState.taskKey);
		this.focusState.running = false;
		this.focusState.endAt = null;
		this.focusState.remaining = this.focusState.duration;
		await this.plugin.completeFocusSession(
			Math.round(this.focusState.duration / 60),
			task,
			"timer",
			this.focusState.duration,
		);
		await this.saveFocusState();
		new Notice(
			this.plugin.t("focus.completed", { task: task ? `: ${cleanDescription(task.raw)}` : "" }),
			10_000,
		);
		if (this.filter === "focus") await this.render();
	}

	renderMatrix(main, tasks) {
		const open = tasks.filter((task) => !task.done && !task.wontDo);
		const quadrants = [
			[this.plugin.t("matrix.do.title"), this.plugin.t("matrix.do.action"), true, true, "do"],
			[
				this.plugin.t("matrix.plan.title"),
				this.plugin.t("matrix.plan.action"),
				true,
				false,
				"plan",
			],
			[
				this.plugin.t("matrix.delegate.title"),
				this.plugin.t("matrix.delegate.action"),
				false,
				true,
				"delegate",
			],
			[
				this.plugin.t("matrix.drop.title"),
				this.plugin.t("matrix.drop.action"),
				false,
				false,
				"drop",
			],
		];
		const moveTasks = async (payload, important, urgent) => {
			try {
				const parsed = JSON.parse(payload);
				const keys = Array.isArray(parsed) ? parsed : [parsed];
				const moving = keys
					.map((key) => open.find((task) => task.path === key.path && task.line === key.line))
					.filter(Boolean);
				for (const task of moving) {
					if (task.important === important && task.urgent === urgent) continue;
					await this.plugin.setTaskMatrix(task, important, urgent);
				}
				if (moving.length) await this.render();
			} catch (error) {
				new Notice(this.plugin.t("matrix.error.move", { error: error.message }));
			}
		};
		const definitions = quadrants.map(([label, action, important, urgent, tone]) => ({
			id: tone,
			label,
			action,
			important,
			urgent,
			tone,
		}));
		this.matrixModel = {
			quadrants: definitions.map((definition) => ({
				...definition,
				tasks: open
					.filter(
						(task) => task.important === definition.important && task.urgent === definition.urgent,
					)
					.map((task) => {
						const title = document.createElement("div");
						title.className = "markdown-rendered";
						void MarkdownRenderer.render(
							this.app,
							cleanDescription(task.raw),
							title,
							task.path,
							this,
						);
						return {
							key: task.key,
							plainTitle: cleanDescription(task.raw),
							title,
							list: task.list || "",
							dueLabel: task.due ? this.friendlyDate(task.due) : null,
							priorityLabel:
								task.priority === 3
									? this.plugin.t("matrix.priority.high")
									: task.priority === 2
										? this.plugin.t("matrix.priority.medium")
										: task.priority === 0
											? this.plugin.t("matrix.priority.low")
											: null,
							dragPayload: JSON.stringify({ path: task.path, line: task.line }),
							quadrantId: definition.id,
							onEdit: () => this.openEditor(task),
							onMove: async (targetId) => {
								const target = definitions.find((candidate) => candidate.id === targetId);
								if (target)
									await moveTasks(
										JSON.stringify({ path: task.path, line: task.line }),
										target.important,
										target.urgent,
									);
							},
						};
					}),
				onDrop: (payload) => moveTasks(payload, definition.important, definition.urgent),
			})),
		};
		main.createDiv({ attr: { "data-react-slot": "matrix" } });
	}

	renderBoard(main, tasks) {
		const query = this.query.trim().toLocaleLowerCase("ja-JP");
		const open = tasks.filter(
			(task) =>
				!task.done &&
				!task.wontDo &&
				!task.parentKey &&
				(!query ||
					`${cleanDescription(task.raw)} ${task.list || "Inbox"} ${task.section || ""} ${(task.tags || []).join(" ")}`
						.toLocaleLowerCase("ja-JP")
						.includes(query)),
		);
		const scopedTasks =
			this.boardList === "__status__"
				? open
				: this.boardList === "__inbox__"
					? open.filter((task) => !task.list)
					: this.boardList
						? open.filter((task) => task.list === this.boardList)
						: open;
		const statuses = this.plugin.statuses();
		const columns =
			this.boardList === "__status__"
				? statuses.map((status) => ({ id: status.id, label: status.name }))
				: this.boardList
					? [
							this.plugin.t("board.noSection"),
							...new Set([
								...(this.plugin.settings.sections?.[this.boardList] || []),
								...scopedTasks.map((task) => task.section).filter(Boolean),
							]),
						].map((label) => ({
							id: label === this.plugin.t("board.noSection") ? "__none__" : label,
							label,
						}))
					: [
							{ id: "__inbox__", label: "Inbox" },
							...this.plugin.allLists(tasks).map((list) => ({ id: list, label: list })),
						];
		const moveTasks = async (payload, columnId) => {
			try {
				const parsed = JSON.parse(payload);
				const keys = Array.isArray(parsed) ? parsed : [parsed];
				const moving = keys
					.map((key) => tasks.find((task) => task.path === key.path && task.line === key.line))
					.filter(Boolean);
				for (const task of moving) {
					if (this.boardList === "__status__") await this.plugin.setTaskStatus(task, columnId);
					else if (this.boardList) {
						await this.plugin.setTaskList(
							task,
							this.boardList === "__inbox__" ? "" : this.boardList,
						);
						await this.plugin.setTaskSection(task, columnId === "__none__" ? "" : columnId);
					} else await this.plugin.setTaskList(task, columnId === "__inbox__" ? "" : columnId);
				}
				if (moving.length) await this.render();
			} catch (error) {
				new Notice(this.plugin.t("board.error.move", { error: error.message }));
			}
		};
		this.boardModel = {
			scope: this.boardList,
			scopes: [
				{ value: "__status__", label: this.plugin.t("taskEdit.status") },
				{ value: "", label: this.plugin.t("filter.all") },
				{ value: "__inbox__", label: "Inbox" },
				...this.plugin.allLists(tasks).map((list) => ({ value: list, label: list })),
			],
			canAddSection: Boolean(this.boardList && this.boardList !== "__status__"),
			onScopeChange: (scope) => {
				this.boardList = scope;
				void this.render();
			},
			onAddSection: () =>
				new NameModal(
					this.app,
					this.plugin.t("board.createSection"),
					this.plugin.t("board.sectionName"),
					async (name) => {
						await this.plugin.createSection(this.boardList, name);
						await this.render();
					},
				).open(),
			columns: columns.map((column) => {
				const items =
					this.boardList === "__status__"
						? scopedTasks.filter((task) => task.status === column.id)
						: this.boardList
							? scopedTasks.filter((task) =>
									column.id === "__none__" ? !task.section : task.section === column.id,
								)
							: open.filter((task) =>
									column.id === "__inbox__" ? !task.list : task.list === column.id,
								);
				const manageable = Boolean(
					this.boardList && this.boardList !== "__status__" && column.id !== "__none__",
				);
				return {
					...column,
					manageable,
					onManage: () =>
						new TaxonomyEditModal(
							this.app,
							"section",
							column.id,
							async (next) => {
								await this.plugin.renameSection(this.boardList, column.id, next);
								await this.render();
							},
							async () => {
								await this.plugin.removeSection(this.boardList, column.id);
								await this.render();
							},
						).open(),
					onDrop: (payload) => moveTasks(payload, column.id),
					tasks: items.map((task) => {
						const title = document.createElement("div");
						title.className = "markdown-rendered";
						void MarkdownRenderer.render(
							this.app,
							cleanDescription(task.raw),
							title,
							task.path,
							this,
						);
						const status = this.plugin.statusById(task.status);
						return {
							key: task.key,
							plainTitle: cleanDescription(task.raw),
							title,
							dragPayload: JSON.stringify({ path: task.path, line: task.line }),
							columnId: column.id,
							status:
								this.boardList === "__status__"
									? null
									: { label: status.name, color: status.color },
							dueLabel: task.due ? this.friendlyDate(task.due) : null,
							section: task.section || null,
							tags: task.tags.map((tag) => ({
								label: tag,
								color: this.plugin.taxonomyColor("tag", tag),
							})),
							onEdit: () => this.openEditor(task),
							onMove: (target) =>
								moveTasks(JSON.stringify({ path: task.path, line: task.line }), target),
						};
					}),
				};
			}),
		};
		main.createDiv({ attr: { "data-react-slot": "board" } });
	}

	renderNotes(main, notes) {
		const query = this.query.trim().toLocaleLowerCase("ja-JP");
		const visible = notes.filter(
			(note) =>
				!query ||
				`${note.raw} ${note.note} ${note.path}`.toLocaleLowerCase("ja-JP").includes(query),
		);
		this.notesModel = {
			query: this.query,
			total: notes.length,
			onQueryChange: (value) => {
				this.query = value;
				this.scheduleRender();
			},
			items: visible.map((note) => {
				const title = document.createElement("div");
				title.className = "markdown-rendered";
				void MarkdownRenderer.render(this.app, cleanDescription(note.raw), title, note.path, this);
				const content = note.note ? document.createElement("div") : null;
				if (content) {
					content.className = "markdown-rendered";
					void MarkdownRenderer.render(this.app, note.note, content, note.path, this);
				}
				return {
					key: note.key,
					title,
					note: content,
					path: note.path,
					comments: note.comments.length,
					onConvert: async () => {
						await this.plugin.convertNoteToTask(note);
						await this.render();
					},
					onOpen: () => this.plugin.openSource(note),
				};
			}),
		};
		main.createDiv({ attr: { "data-react-slot": "notes" } });
	}

	renderTaskListModel(tasks) {
		const filtered = this.filteredTasks(tasks);
		const trashed = this.filter === "trash";
		const empty = {
			icon: trashed ? "archive-restore" : "check-check",
			title: this.plugin.t(trashed ? "taskList.emptyTrash" : "taskList.empty"),
			description: this.plugin.t(
				trashed ? "taskList.emptyTrashDescription" : "taskList.emptyDescription",
			),
		};
		if (!filtered.length) return { empty, groups: [] };
		const grouped = this.groupTasks(filtered);
		const manualOrdering =
			this.plugin.settings.sortMode === "manual" &&
			this.plugin.settings.groupMode === "none" &&
			!trashed;
		const renderMarkdown = (value, path) => {
			const element = document.createElement("div");
			void MarkdownRenderer.render(this.app, value, element, path, this);
			return element;
		};
		const rerender = async (action) => {
			await action();
			await this.render();
		};
		return {
			empty,
			groups: grouped.map(([label, group]) => {
				const roots = group.filter((task) => !task.parentKey);
				return {
					label: grouped.length > 1 ? label : "",
					items: group.map((task) => {
						const rootIndex = roots.indexOf(task);
						const focusKey = taskFocusIdentity(task);
						const children = (this.tasks || []).filter(
							(candidate) => candidate.parentKey === task.key,
						);
						const progress = progressFor(task, this.tasks || []);
						const meta = [];
						if (!task.done && !task.wontDo) {
							const status = this.plugin.statusById(task.status);
							meta.push({ label: status.name, color: status.color, tone: "status" });
						}
						if (task.due)
							meta.push({
								label: this.friendlyDate(task.due),
								icon: "calendar-days",
								tone: task.due < localDate() && !task.done ? "danger" : undefined,
							});
						if (task.list)
							meta.push({
								label: task.list,
								icon: "list",
								color: this.plugin.taxonomyColor("list", task.list),
							});
						if (task.section) meta.push({ label: task.section, icon: "columns-3" });
						task.tags.forEach((tag) =>
							meta.push({ label: `#${tag}`, color: this.plugin.taxonomyColor("tag", tag) }),
						);
						if (task.repeat) {
							const repeatKey = {
								"every day": "repeat.every-day",
								"every weekday": "repeat.every-weekday",
								"every week": "repeat.every-week",
								"every month": "repeat.every-month",
								"every year": "repeat.every-year",
							}[task.repeat];
							meta.push({
								label: repeatKey ? this.plugin.t(repeatKey) : task.repeat.replace(/^every /u, ""),
								icon: "repeat-2",
							});
						}
						if (task.reminders?.length) {
							const reminder = task.reminders[0];
							meta.push({
								label: `${this.friendlyDate(reminder.date)} ${reminder.time}${task.reminders.length > 1 ? ` +${task.reminders.length - 1}` : ""}`,
								icon: "bell",
							});
						}
						if (task.estimatedPomos)
							meta.push({
								label: this.plugin.t("task.pomodoros", { count: task.estimatedPomos }),
								icon: "timer",
							});
						if (task.estimatedMinutes)
							meta.push({
								label: this.plugin.t("common.minutes", { count: task.estimatedMinutes }),
								icon: "hourglass",
							});
						if (children.length)
							meta.push({
								label: `${children.filter((child) => child.done).length}/${children.length}`,
								icon: "list-checks",
							});
						meta.push({ label: task.path.replace(/\.md$/u, ""), tone: "muted" });

						const actions = [];
						if (trashed) {
							actions.push({
								label: this.plugin.t("task.restore"),
								icon: "undo-2",
								onAction: () => rerender(() => this.plugin.restoreTask(task)),
							});
						} else {
							if (manualOrdering && rootIndex >= 0) {
								const moveAndKeepIdentity = async (target, after) => {
									await this.plugin.ensureTaskIdentity(task, focusKey);
									await this.plugin.moveTaskRelative(task, target, after);
								};
								actions.push({
									label: this.plugin.t("task.moveUpManual"),
									icon: "arrow-up",
									disabled: rootIndex === 0,
									focusAfterAction: true,
									onAction: () =>
										rootIndex === 0
											? undefined
											: rerender(() => moveAndKeepIdentity(roots[rootIndex - 1], false)),
								});
								actions.push({
									label: this.plugin.t("task.moveDownManual"),
									icon: "arrow-down",
									disabled: rootIndex === roots.length - 1,
									focusAfterAction: true,
									onAction: () =>
										rootIndex === roots.length - 1
											? undefined
											: rerender(() => moveAndKeepIdentity(roots[rootIndex + 1], true)),
								});
							}
							actions.push({
								label: this.plugin.t("common.edit"),
								icon: "pencil",
								onAction: () => this.openEditor(task),
							});
							actions.push({
								label: this.plugin.t("task.duplicate"),
								icon: "copy",
								onAction: () => rerender(() => this.plugin.duplicateTask(task)),
							});
							if (!task.wontDo && !task.done)
								actions.push({
									label: this.plugin.t("task.wontDoAction"),
									icon: "circle-slash-2",
									onAction: () => rerender(() => this.plugin.setTaskWontDo(task, true)),
								});
							if (!task.done)
								actions.push({
									label: this.plugin.t("task.convertToNote"),
									icon: "notebook-pen",
									onAction: async () => {
										await this.plugin.convertTaskToNote(task);
										this.filter = "notes";
										await this.render();
									},
								});
							if (task.repeat && !task.done)
								actions.push({
									label: this.plugin.t("task.skipOccurrence"),
									icon: "skip-forward",
									onAction: () => rerender(() => this.plugin.skipRecurringTask(task)),
								});
							actions.push({
								label: this.plugin.t("task.openSource"),
								icon: "external-link",
								onAction: () => this.plugin.openSource(task),
							});
							actions.push({
								label: this.plugin.t("common.delete"),
								icon: "trash-2",
								onAction: async () => {
									const detail = children.length ? this.plugin.t("task.deleteChildrenDetail") : "";
									if (
										!window.confirm(
											this.plugin.t("task.deleteConfirm", {
												title: cleanDescription(task.raw),
												detail,
											}),
										)
									)
										return;
									await this.plugin.deleteTask(task);
									await this.render();
								},
							});
						}
						let nextStatus;
						if (!trashed && !task.done && !task.wontDo) {
							const statuses = this.plugin.statuses();
							const currentIndex = Math.max(
								0,
								statuses.findIndex((status) => status.id === task.status),
							);
							const next = statuses[(currentIndex + 1) % statuses.length];
							nextStatus = {
								label: this.plugin.t("task.changeStatus", { name: next.name }),
								icon: "refresh-cw",
								onAction: () => rerender(() => this.plugin.setTaskStatus(task, next.id)),
							};
						}
						return {
							key: task.key,
							focusKey,
							title: renderMarkdown(cleanDescription(task.raw), task.path),
							note: task.note ? renderMarkdown(task.note, task.path) : undefined,
							done: task.done,
							wontDo: task.wontDo,
							disabled: trashed,
							completeLabel: this.plugin.t(
								trashed
									? "task.inTrash"
									: task.wontDo
										? "task.restoreAction"
										: task.done
											? "task.reopen"
											: "task.complete",
							),
							onComplete: () =>
								trashed
									? undefined
									: rerender(() =>
											task.wontDo
												? this.plugin.setTaskWontDo(task, false)
												: this.plugin.toggleTask(task),
										),
							onEdit: () => this.openEditor(task),
							depth: task.depth || 0,
							priority: task.priority,
							progress: progress > 0 || children.length ? progress : undefined,
							meta,
							actions,
							nextStatus,
							selected: this.selectedTaskKeys.has(task.key),
							selectionLabel: this.plugin.t(
								this.selectedTaskKeys.has(task.key) ? "common.deselect" : "common.select",
							),
							onSelect: this.selectionMode
								? () => {
										if (this.selectedTaskKeys.has(task.key)) this.selectedTaskKeys.delete(task.key);
										else this.selectedTaskKeys.add(task.key);
										void this.render();
									}
								: undefined,
							draggable: manualOrdering && rootIndex >= 0,
							onMoveRelative: manualOrdering
								? async (sourceKey, after) => {
										const source = (this.tasks || []).find(
											(candidate) => candidate.key === sourceKey,
										);
										if (!source) return;
										await this.plugin.moveTaskRelative(source, task, after);
										await this.render();
									}
								: undefined,
						};
					}),
				};
			}),
		};
	}

	openEditor(task) {
		this.activeTaskKey = task.key;
		void this.render();
	}

	renderTaskDetailModel() {
		if (!this.activeTaskKey) return null;
		const task = (this.tasks || []).find((candidate) => candidate.key === this.activeTaskKey);
		if (!task) {
			this.activeTaskKey = null;
			return null;
		}
		const children = (this.tasks || []).filter((candidate) => candidate.parentKey === task.key);
		const editableTask = {
			...task,
			autoProgress: children.length ? progressFor(task, this.tasks || []) : null,
			subtasks: children,
		};
		return {
			key: task.key,
			dialog: taskEditDialogModel({
				app: this.app,
				task: editableTask,
				lists: this.plugin.allLists(this.tasks || []),
				statuses: this.plugin.statuses(),
				onCancel: () => {
					this.activeTaskKey = null;
					void this.render();
				},
				onSave: async (values) => {
					await this.plugin.updateTask(task, values);
					this.activeTaskKey = null;
					await this.render();
				},
				onSaveTemplate: async (values) => {
					new NameModal(
						this.app,
						this.plugin.t("task.saveTemplate"),
						this.plugin.t("task.templateName"),
						async (name) => {
							await this.plugin.saveTaskTemplate(name, values, task);
							new Notice(this.plugin.t("task.templateSaved", { name }));
						},
					).open();
				},
			}),
		};
	}

	filteredTasks(tasks) {
		return taskListDomain.filteredTasks(tasks, {
			filter: this.filter,
			overflowTaskKeys: this.reviewOverflowTaskKeys,
			query: this.query,
			smartFilters: this.plugin.settings.smartFilters || [],
			sortMode: this.plugin.settings.sortMode || "smart",
			taskMap: this.taskMap,
		});
	}

	compareTasks(a, b) {
		return taskListDomain.compareTasks(a, b, {
			mode: this.plugin.settings.sortMode || "smart",
			taskMap: this.taskMap,
			tasks: this.tasks || [],
		});
	}

	rootTask(task) {
		return taskListDomain.rootTask(task, this.tasks || [], this.taskMap);
	}

	matchesSavedFilter(task, saved, today, end) {
		return taskListDomain.matchesSavedFilter(task, saved, today, end);
	}

	groupTasks(tasks) {
		return taskListDomain.groupTasks(tasks, {
			filter: this.filter,
			groupMode: this.plugin.settings.groupMode || "auto",
			statusById: (id) => this.plugin.statusById(id),
			taskMap: this.taskMap,
			allTasks: this.tasks || tasks,
		});
	}

	navigationContext() {
		return {
			external: this.external,
			notes: this.notes,
			overflowTaskKeys: this.reviewOverflowTaskKeys,
			settings: this.plugin.settings,
			statusById: (id) => this.plugin.statusById(id),
			taskMap: this.taskMap,
			trashTasks: this.trashTasks,
		};
	}

	countFor(filter, tasks) {
		return dashboardNavigationDomain.countFor(filter, tasks, this.navigationContext());
	}

	labelFor(filter) {
		const key = {
			today: "nav.today",
			inbox: "nav.inbox",
			next: "nav.next",
			calendar: "nav.calendar",
			issues: "nav.issues",
			review: "nav.review",
			tomorrow: "nav.tomorrow",
			overdue: "nav.overdue",
			all: "nav.all",
			scheduled: "nav.scheduled",
			recurring: "nav.recurring",
			matrix: "nav.matrix",
			board: "nav.board",
			completed: "nav.completed",
			wontdo: "nav.wontdo",
			notes: "nav.notes",
			trash: "nav.trash",
			focus: "nav.focus",
			habits: "nav.habits",
			countdown: "nav.countdown",
			stats: "nav.stats",
		}[filter];
		if (key) return this.plugin.t(key);
		return dashboardNavigationDomain.labelFor(filter, this.navigationContext());
	}

	subtitleFor(filter, tasks) {
		return dashboardNavigationDomain.subtitleFor(filter, tasks, this.navigationContext());
	}

	friendlyDate(date) {
		return taskListDomain.friendlyDate(date);
	}

	compactDateTime(timestamp) {
		if (!timestamp) return this.plugin.t("common.unknown");
		return formatDisplayDate(activeDomainLocale, new Date(timestamp), {
			month: "numeric",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}
}

module.exports = class TaktunePlugin extends Plugin {
	async onload() {
		const storedSettings = (await this.loadData()) || {};
		const hadLegacyTaskMutationJournal = Boolean(storedSettings.taskMutationJournal);
		this.setLocale(migrateSettings(storedSettings).locale);
		const needsSchemaMigration = storedSettings.settingsVersion !== SETTINGS_SCHEMA_VERSION;
		const needsSecretMigration = hasLegacySecrets(storedSettings);
		let migrationBackupReady = true;
		if (needsSchemaMigration || needsSecretMigration) {
			try {
				await this.writeSettingsBackup(storedSettings);
			} catch (error) {
				migrationBackupReady = false;
				console.error("Taktune: failed to create settings backup", error);
				new Notice(this.t("notice.backup.createFailed"), 15_000);
			}
		}
		this.settings = migrateSettings(storedSettings);
		this.taskMutationClaimId = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
		this.taskMutationJournalBackend = this.createTaskMutationJournalBackend();
		const legacyJournal = this.settings.taskMutationJournal;
		const dedicatedJournal = await reconcileLegacyTaskMutationJournal(
			this.taskMutationJournalBackend,
			legacyJournal,
		);
		this.settings = { ...this.settings, taskMutationJournal: dedicatedJournal };
		this.setLocale(this.settings.locale);
		const migratedSecrets = migrationBackupReady ? this.migrateLegacySecrets() : false;
		if (
			migrationBackupReady &&
			(needsSchemaMigration || migratedSecrets || hadLegacyTaskMutationJournal)
		)
			await this.queueSettingsSnapshot(settingsForPersistence(this.settings));
		this.firedReminders = new Set();
		this.reminderQueue = [];
		this.activeReminder = null;
		this.checkingReminders = false;
		this.workspaceFocusState = null;
		this.registerView(VIEW_TYPE, (leaf) => new TaktuneView(leaf, this));
		this.addRibbonIcon("circle-check-big", this.t("ribbon.open"), () => this.activateView());
		this.addCommand({
			id: "open-dashboard",
			name: this.t("command.open"),
			callback: () => this.activateView(),
		});
		this.addCommand({
			id: "quick-add-task",
			name: this.t("command.quickAdd"),
			hotkeys: [{ modifiers: ["Shift", "Alt"], key: "a" }],
			callback: () => this.openQuickAdd(),
		});
		this.addCommand({
			id: "enable-system-notifications",
			name: this.t("command.notifications"),
			callback: () => this.requestNotificationPermission(),
		});
		this.addCommand({
			id: "test-reminder",
			name: this.t("command.testReminder"),
			callback: () => this.testReminder(),
		});
		this.addCommand({
			id: "diagnostics",
			name: this.t("command.diagnostics"),
			callback: () => this.showDiagnostics(),
		});
		this.addCommand({
			id: "restore-settings-backup",
			name: this.t("command.restore"),
			callback: () => this.restoreSettingsBackupWithConfirmation(),
		});
		this.addCommand({
			id: "recover-stale-task-mutation-claim",
			name: this.t("command.taskMutation.recoverClaim"),
			callback: () => this.recoverStaleTaskMutationClaimWithConfirmation(),
		});
		this.addSettingTab(new TaktuneSettingTab(this.app, this));
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => this.syncWorkspaceFocus(leaf)),
		);
		this.registerEvent(
			this.app.vault.on("modify", (file) => this.updateCollectionIndex("modify", file)),
		);
		this.registerEvent(
			this.app.vault.on("create", (file) => this.updateCollectionIndex("create", file)),
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => this.updateCollectionIndex("delete", file)),
		);
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) =>
				this.updateCollectionIndex("rename", file, oldPath),
			),
		);
		await this.resumeTaskMutation();
		this.registerInterval(window.setInterval(() => void this.checkReminders(), 60_000));
		this.app.workspace.onLayoutReady(() => {
			this.dedupeFileLeaves(this.settings.dashboardNotePath);
			this.dedupeDashboardLeaves();
			this.syncWorkspaceFocus(this.app.workspace.activeLeaf);
		});
		void this.checkReminders();
	}

	async onunload() {
		this.restoreWorkspaceFocus();
		this.app.workspace.detachLeavesOfType(VIEW_TYPE);
	}

	createTaskMutationJournalBackend() {
		const adapter = this.app.vault.adapter;
		const directory = normalizePath(`${this.manifest.dir}/task-mutation-journal`);
		const established = normalizePath(`${directory}/manifest-established-v2.json`);
		const ensureDirectory = async () => {
			if (!(await adapter.exists(directory))) await adapter.mkdir(directory);
		};
		return createAtomicManifestBackend({
			adapter,
			root: directory,
			ensureDirectory,
			lockKey: normalizePath(`${directory}/manifest.json`),
			isEstablished: () => adapter.exists(established),
			establish: async () => {
				await ensureDirectory();
				if (!(await adapter.exists(established))) await adapter.write(established, '{"version":2}');
			},
		});
	}

	setLocale(preference = "system") {
		const systemLocale =
			globalThis.document?.documentElement?.lang || globalThis.navigator?.language || "en";
		this.locale = resolveLocale(preference, systemLocale);
		activeDomainLocale = this.locale;
		this.t = createTranslator(this.locale);
		setDefaultLocale(this.locale);
	}

	isDashboardLeaf(leaf) {
		return leaf?.getViewState?.().type === VIEW_TYPE || leaf?.view?.getViewType?.() === VIEW_TYPE;
	}

	syncWorkspaceFocus(leaf) {
		if (this.settings?.collapseObsidianSidebars === false || !this.isDashboardLeaf(leaf)) {
			this.restoreWorkspaceFocus();
			return;
		}
		const { leftSplit, rightSplit } = this.app.workspace;
		if (!this.workspaceFocusState) {
			this.workspaceFocusState = {
				leftCollapsed: Boolean(leftSplit?.collapsed),
				rightCollapsed: Boolean(rightSplit?.collapsed),
			};
		}
		if (leftSplit && !leftSplit.collapsed) leftSplit.collapse();
		if (rightSplit && !rightSplit.collapsed) rightSplit.collapse();
	}

	restoreWorkspaceFocus() {
		if (!this.workspaceFocusState) return;
		const { leftSplit, rightSplit } = this.app.workspace;
		const { leftCollapsed, rightCollapsed } = this.workspaceFocusState;
		this.workspaceFocusState = null;
		if (leftSplit && leftSplit.collapsed !== leftCollapsed) {
			if (leftCollapsed) leftSplit.collapse();
			else leftSplit.expand();
		}
		if (rightSplit && rightSplit.collapsed !== rightCollapsed) {
			if (rightCollapsed) rightSplit.collapse();
			else rightSplit.expand();
		}
	}

	settingsBackupPath(name = "settings-backup.json", settings = this.settings) {
		const configured = migrateSettings(settings || {}).settingsBackupDirectory;
		const directory =
			configured ||
			this.manifest?.dir ||
			`${this.app.vault.configDir}/plugins/${this.manifest?.id || "ticktick-dashboard"}`;
		return normalizePath(`${directory}/${name}`);
	}

	async ensureVaultDirectory(directory) {
		const adapter = this.app.vault.adapter;
		const parts = normalizePath(directory).split("/").filter(Boolean);
		let current = "";
		for (const part of parts) {
			current = normalizePath(current ? `${current}/${part}` : part);
			if (!(await adapter.exists(current))) await adapter.mkdir(current);
		}
	}

	async writeSettingsBackup(settings, name = "settings-backup.json") {
		const path = this.settingsBackupPath(name, settings);
		const directory = path.slice(0, path.lastIndexOf("/"));
		if (directory) await this.ensureVaultDirectory(directory);
		await this.app.vault.adapter.write(
			path,
			`${JSON.stringify(settingsBackup(settings), null, 2)}\n`,
		);
		return path;
	}

	async readSettingsBackup() {
		const path = this.settingsBackupPath();
		if (!(await this.app.vault.adapter.exists(path))) return null;
		return JSON.parse(await this.app.vault.adapter.read(path));
	}

	async restoreSettingsBackupWithConfirmation() {
		let backup;
		try {
			backup = await this.readSettingsBackup();
		} catch (error) {
			console.error("Taktune: failed to read settings backup", error);
			new Notice(this.t("notice.backup.readFailed"), 10_000);
			return false;
		}
		if (!backup) {
			new Notice(this.t("notice.backup.none"));
			return false;
		}
		const createdAt = new Date(backup.createdAt);
		const label = Number.isNaN(createdAt.getTime())
			? this.t("common.unknownDate")
			: createdAt.toLocaleString(this.t("locale.date"));
		if (!window.confirm(this.t("notice.backup.restoreConfirm", { label }))) return false;
		try {
			const restored = migrateSettings(settingsFromBackup(backup));
			await this.writeSettingsBackup(this.settings, "settings-before-restore.json");
			await this.queueSettingsSnapshot(settingsForPersistence(restored));
			this.settings = restored;
			new Notice(this.t("notice.backup.restored"), 10_000);
			return true;
		} catch (error) {
			console.error("Taktune: failed to restore settings", error);
			new Notice(this.t("notice.backup.restoreFailed", { error: error.message }), 10_000);
			return false;
		}
	}

	async showDiagnostics() {
		const platform = Platform.isMobileApp
			? this.t("diagnostics.platform.mobile")
			: this.t("diagnostics.platform.desktop");
		const vault =
			typeof this.app.vault.getName === "function"
				? this.app.vault.getName()
				: this.t("diagnostics.unknownVault");
		const integrations = [
			`Google ${this.t(this.settings.googleCalendarEnabled ? "diagnostics.configured" : "diagnostics.notConfigured")}`,
			`Linear ${this.t(this.integrationSecret("linear") ? "diagnostics.configured" : "diagnostics.notConfigured")}`,
			`Jira ${this.t(this.integrationSecret("jira") ? "diagnostics.configured" : "diagnostics.notConfigured")}`,
			`Slack ${this.t(this.integrationSecret("slack") ? "diagnostics.configured" : "diagnostics.notConfigured")}`,
		];
		const notificationPermission =
			typeof window.Notification === "function" ? window.Notification.permission : "unsupported";
		const googleCalendarCache = this.settings.googleCalendarEnabled
			? await this.readGoogleCalendarCache()
			: null;
		const diagnosticsForEnvironment = createEnvironmentDiagnostics({
			cacheAgeOf: googleCalendarCacheAge,
			inboxPath: this.inboxPath(),
			settingsSchemaVersion: SETTINGS_SCHEMA_VERSION,
			t: domainT,
		});
		const items = diagnosticsForEnvironment({
			googleCalendarCache,
			googleCalendarEnabled: this.settings.googleCalendarEnabled,
			inboxPresent: Boolean(this.app.vault.getAbstractFileByPath(this.inboxPath())),
			notificationPermission,
			performanceSnapshot: this.performanceSnapshot,
			secretStorage: Boolean(this.app.secretStorage),
			settingsVersion: this.settings.settingsVersion,
			statusCount: this.statuses().length,
		});
		new DiagnosticsModal(this.app, {
			version: this.manifest.version,
			platform,
			vault,
			integrations,
			items,
			plugin: this,
		}).open();
	}

	async testIntegrations(notify = true) {
		const checks = [
			[
				"Google Calendar",
				this.settings.googleCalendarEnabled,
				async () => (await this.loadCalendar(localDate(), 1)).items,
			],
			["Linear", Boolean(this.integrationSecret("linear")), () => this.loadLinear()],
			[
				"Jira",
				Boolean(
					this.settings.jiraBaseUrl && this.settings.jiraEmail && this.integrationSecret("jira"),
				),
				() => this.loadJira(),
			],
			[
				"Slack",
				Boolean(this.integrationSecret("slack") && this.settings.slackBookmarkChannelIds?.length),
				() => this.loadSlackBookmarks(),
			],
		];
		const lines = await Promise.all(
			checks.map(async ([name, configured, load]) => {
				if (!configured) return this.t("integrations.result.notConfigured", { name });
				try {
					const items = await load();
					return this.t("integrations.result.success", { name, count: items.length });
				} catch (error) {
					return this.t("integrations.result.failure", { name, error: error.message });
				}
			}),
		);
		if (notify) new Notice(lines.join("\n"), 20_000);
		return lines;
	}

	integrationSecret(service) {
		const references = {
			linear: ["linearSecretId", "linearApiKey"],
			jira: ["jiraSecretId", "jiraApiToken"],
			slack: ["slackSecretId", "slackToken"],
		};
		const [referenceKey, legacyKey] = references[service] || [];
		if (!referenceKey) return "";
		return (
			this.app.secretStorage?.getSecret(this.settings[referenceKey]) ||
			this.settings[legacyKey] ||
			""
		);
	}

	migrateLegacySecrets() {
		if (!this.app.secretStorage) return false;
		let changed = false;
		for (const [legacyKey, referenceKey] of [
			["linearApiKey", "linearSecretId"],
			["jiraApiToken", "jiraSecretId"],
			["slackToken", "slackSecretId"],
		]) {
			const value = this.settings[legacyKey];
			if (!value) continue;
			this.app.secretStorage.setSecret(this.settings[referenceKey], value);
			this.settings[legacyKey] = "";
			changed = true;
		}
		return changed;
	}

	dedupeFileLeaves(path) {
		const leaves = [];
		this.app.workspace.iterateAllLeaves((leaf) => {
			const state = leaf.getViewState?.();
			const filePath = leaf.view?.file?.path || state?.state?.file;
			if (state?.type === "markdown" && filePath === path) leaves.push(leaf);
		});
		if (leaves.length < 2) return leaves[0] || null;
		const keep =
			this.app.workspace.activeLeaf && leaves.includes(this.app.workspace.activeLeaf)
				? this.app.workspace.activeLeaf
				: leaves[0];
		for (const leaf of leaves) {
			if (leaf !== keep) leaf.detach();
		}
		return keep;
	}

	dedupeDashboardLeaves() {
		const leaves = [];
		this.app.workspace.iterateAllLeaves((leaf) => {
			const stateType = leaf.getViewState?.().type;
			const viewType = leaf.view?.getViewType?.();
			if (stateType === VIEW_TYPE || viewType === VIEW_TYPE) leaves.push(leaf);
		});
		if (leaves.length < 2) return leaves[0] || null;
		const keep =
			this.app.workspace.activeLeaf && leaves.includes(this.app.workspace.activeLeaf)
				? this.app.workspace.activeLeaf
				: leaves[0];
		for (const leaf of leaves) {
			if (leaf !== keep) leaf.detach();
		}
		return keep;
	}

	async activateView() {
		if (this.activationPromise) return this.activationPromise;
		this.activationPromise = (async () => {
			let leaf = this.dedupeDashboardLeaves();
			if (!leaf) {
				leaf = this.dedupeFileLeaves(this.settings.dashboardNotePath);
			}
			if (!leaf) {
				this.app.workspace.iterateAllLeaves((candidate) => {
					if (!leaf && candidate.getViewState?.().type === "empty") leaf = candidate;
				});
			}
			if (leaf?.getViewState?.().type !== VIEW_TYPE) {
				leaf ||= this.app.workspace.getLeaf("tab");
				await leaf.setViewState({ type: VIEW_TYPE, active: true });
			}
			await this.app.workspace.revealLeaf(leaf);
			this.syncWorkspaceFocus(leaf);
			this.dedupeDashboardLeaves();
		})();
		try {
			await this.activationPromise;
		} finally {
			this.activationPromise = null;
		}
	}

	openQuickAdd() {
		new QuickAddModal(
			this.app,
			this.settings.taskTemplates || [],
			async (parsed, due, template) => {
				await this.addTask(
					parsed.description,
					due ||
						parsed.due ||
						(template?.dueOffset === null || template?.dueOffset === undefined
							? ""
							: addDays(localDate(), template.dueOffset)),
					{
						...template,
						list: parsed.list || template?.list || "",
						tags: [...new Set([...(template?.tags || []), ...parsed.tags])],
						priority: parsed.priority !== 1 ? parsed.priority : template?.priority,
						repeat: parsed.repeat || template?.repeat || "",
						reminderTime: parsed.reminderTime || "",
						reminderOffsetMinutes: parsed.reminderOffsetMinutes || 0,
					},
				);
				new Notice(this.t("notice.taskAdded"));
			},
		).open();
	}

	async cachedVaultRead(file, cache) {
		this.pendingCollectionReads ||= new Map();
		const read = () => {
			const pending = readThroughPendingCache(this.pendingCollectionReads, file.path, () =>
				this.app.vault.cachedRead(file),
			);
			return readWithDeadline(
				() => pending,
				file.path,
				this.collectionReadTimeoutMs ?? COLLECTION_READ_TIMEOUT_MS,
			);
		};
		if (!cache) return read();
		if (!cache.has(file.path)) cache.set(file.path, read());
		return cache.get(file.path);
	}

	collectionFailureState(readCache) {
		let state = readCache.get(COLLECTION_FAILURE_STATE_KEY);
		if (!state) {
			state = { attemptedPaths: new Set(), failedPaths: new Set(), succeededPaths: new Set() };
			readCache.set(COLLECTION_FAILURE_STATE_KEY, state);
		}
		return state;
	}

	async collectIndexedFiles(files, readCache) {
		const state = this.collectionFailureState(readCache);
		for (const file of files) state.attemptedPaths.add(file.path);
		const { values, failedFiles } = await settleAvailable(
			files,
			(file) => this.indexedCollectionItems(file, readCache),
			4,
			this.collectionReadTimeoutMs ?? COLLECTION_READ_TIMEOUT_MS,
		);
		const failed = new Set(failedFiles.map((file) => file.path));
		for (const file of files) {
			if (failed.has(file.path)) state.failedPaths.add(file.path);
			else state.succeededPaths.add(file.path);
		}
		return values;
	}

	invalidateCollectionCache(...paths) {
		for (const path of paths) {
			if (typeof path !== "string" || !path) continue;
			this.collectionCache?.delete(path);
			const indexed = this.collectionIndex?.get(path);
			if (indexed) {
				indexed.signature = "";
				indexed.value = null;
			}
		}
	}

	collectionSignature(file) {
		const mtime = Number(file?.stat?.mtime);
		const size = Number(file?.stat?.size);
		const statusDefinitionsForCache =
			Array.isArray(this.settings?.statuses) && this.settings.statuses.length
				? this.settings.statuses
				: this.persistedStatuses();
		return Number.isFinite(mtime) && Number.isFinite(size)
			? `${mtime}:${size}:${statusCollectionSignature(statusDefinitionsForCache)}`
			: "";
	}

	ensureCollectionIndex() {
		if (this.collectionIndex) return this.collectionIndex;
		this.collectionIndex = new Map();
		for (const file of this.app.vault.getMarkdownFiles()) {
			this.collectionIndex.set(file.path, { file, signature: "", value: null });
		}
		return this.collectionIndex;
	}

	updateCollectionIndex(kind, file, oldPath = "") {
		this.trackTaskMutationVaultEvent(kind, file, oldPath);
		this.invalidateCollectionCache(file?.path, oldPath);
		if (!this.collectionIndex) return;
		const path = file?.path;
		if (typeof path !== "string") return;
		if (!path.endsWith(".md")) {
			const affected = [...this.collectionIndex.entries()].filter(([indexedPath]) => {
				const root = kind === "rename" ? oldPath : path;
				return root && indexedPath.startsWith(`${root}/`);
			});
			for (const [indexedPath, entry] of affected) {
				this.collectionIndex.delete(indexedPath);
				this.collectionCache?.delete(indexedPath);
				if (kind === "delete") continue;
				const nextPath = entry.file?.path;
				if (typeof nextPath !== "string" || !nextPath.endsWith(".md")) continue;
				this.collectionCache?.delete(nextPath);
				this.collectionIndex.set(nextPath, { file: entry.file, signature: "", value: null });
			}
			return;
		}
		if (oldPath) this.collectionIndex.delete(oldPath);
		if (kind === "delete") {
			this.collectionIndex.delete(path);
			return;
		}
		this.collectionIndex.set(path, { file, signature: "", value: null });
	}

	indexedCollectionItems(file, readCache = null) {
		const index = this.ensureCollectionIndex();
		const currentPath = file.path;
		let entry = index.get(currentPath);
		if (!entry) {
			entry = { file, signature: "", value: null };
			index.set(currentPath, entry);
		}
		const signature = this.collectionSignature(file);
		const reparsed = collectionEntryNeedsRefresh(entry, file, signature);
		recordCollectionLookup(this.collectionRunMetrics, reparsed);
		if (reparsed) {
			entry.file = file;
			entry.signature = signature;
			entry.value = this.collectFileItems(file, readCache);
			const pending = entry.value;
			pending.catch(() => {
				if (entry.value === pending) entry.value = null;
			});
		}
		return entry.value;
	}

	collectionFiles() {
		const index = this.ensureCollectionIndex();
		for (const [path, entry] of index) {
			if (entry.file?.path === path) continue;
			index.delete(path);
			this.collectionCache?.delete(path);
			if (entry.file?.path?.endsWith(".md")) {
				this.collectionCache?.delete(entry.file.path);
				index.set(entry.file.path, { file: entry.file, signature: "", value: null });
			}
		}
		return [...index.values()].map((entry) => entry.file);
	}

	async collectFileItems(file, readCache = null) {
		const cacheKey = `\0taktune-items:${file.path}`;
		if (readCache?.has(cacheKey)) return readCache.get(cacheKey);
		const fileSignature = this.collectionSignature(file);
		if (!this.collectionCache) this.collectionCache = new Map();
		const cachedCollection = fileSignature ? this.collectionCache.get(file.path) : null;
		if (cachedCollection?.signature === fileSignature) {
			if (readCache) readCache.set(cacheKey, cachedCollection.value);
			return cachedCollection.value;
		}
		const collected = (async () => {
			const content = await this.cachedVaultRead(file, readCache);
			const tasks = [];
			const notes = [];
			const taskStack = [];
			const noteStack = [];
			const tasksByIndent = new Map();
			const notesByIndent = new Map();
			const { lines, taskLines } = markdownTaskLineMask(content);

			for (let index = 0; index < lines.length; index += 1) {
				const line = lines[index];
				const taskMatch = taskLines[index] ? line.match(TASK_RE) : null;
				const noteItemMatch = taskLines[index] ? line.match(NOTE_ITEM_RE) : null;
				const itemIndent = taskMatch
					? taskMatch[1].match(/^\s*/u)[0].length
					: noteItemMatch?.[1].length;

				if (itemIndent !== undefined) {
					while (taskStack.length && taskStack.at(-1).indent >= itemIndent) {
						tasksByIndent.delete(taskStack.pop().indent);
					}
					while (noteStack.length && noteStack.at(-1).indent >= itemIndent) {
						notesByIndent.delete(noteStack.pop().indent);
					}
				}

				if (noteItemMatch) {
					const note = {
						key: `${file.path}:${index}`,
						file,
						path: file.path,
						line: index,
						indent: noteItemMatch[1].length,
						raw: noteItemMatch[2],
						note: "",
						comments: [],
						activities: [],
					};
					notes.push(note);
					noteStack.push(note);
					notesByIndent.set(note.indent, note);
					continue;
				}

				if (taskMatch) {
					if (noteStack.length) continue;
					const raw = taskMatch[4];
					const indent = itemIndent;
					const parent = taskStack.at(-1) || null;
					const timeBlock = timeBlockOf(raw);
					const reminders = remindersOf(raw);
					const task = {
						key: `${file.path}:${index}`,
						file,
						path: file.path,
						line: index,
						raw,
						taskId: raw.match(TASK_ID_RE)?.[1] || "",
						prefix: taskMatch[1],
						middle: taskMatch[3],
						done: taskMatch[2].toLowerCase() === "x",
						wontDo: WONT_DO_RE.test(raw),
						status:
							taskMatch[2].toLowerCase() === "x"
								? "completed"
								: WONT_DO_RE.test(raw)
									? "wontdo"
									: raw.match(STATUS_RE)?.[1] || this.statuses()[0].id,
						due: raw.match(DATE_RE)?.[1] || "",
						doneDate: raw.match(DONE_RE)?.[1] || "",
						priority: priorityOf(raw),
						important: raw.includes(IMPORTANT_TAG),
						urgent: raw.includes(URGENT_TAG),
						timeBlock,
						list: raw.match(LIST_RE)?.[1]?.trim() || "",
						section: raw.match(SECTION_RE)?.[1]?.trim() || "",
						tags: tagsOf(raw),
						repeat: raw.match(REPEAT_RE)?.[1] || "",
						reminders,
						reminder: reminders[0] || null,
						progress: Number(raw.match(PROGRESS_RE)?.[1] || 0),
						estimatedPomos: Number(raw.match(ESTIMATED_POMOS_RE)?.[1] || 0),
						estimatedMinutes: Number(raw.match(ESTIMATED_DURATION_RE)?.[1] || 0),
						indent,
						depth: taskStack.length,
						parentKey: parent?.key || "",
						note: "",
						comments: [],
						activities: [],
						createdAt: 0,
						modifiedAt: 0,
						trashMeta: null,
					};
					const marker = lines[index - 1]?.match(/^<!-- ttd-trash (.+) -->$/u);
					if (marker) {
						try {
							task.trashMeta = JSON.parse(marker[1]);
						} catch {
							task.trashMeta = null;
						}
					}
					tasks.push(task);
					taskStack.push(task);
					tasksByIndent.set(task.indent, task);
					continue;
				}

				const recordIndent =
					line.match(NOTE_LINE_RE)?.[1].length ??
					line.match(COMMENT_LINE_RE)?.[1].length ??
					line.match(ACTIVITY_LINE_RE)?.[1].length;
				if (recordIndent === undefined) continue;
				const recordOwner =
					notesByIndent.get(recordIndent - 2) || tasksByIndent.get(recordIndent - 2);
				if (!recordOwner) continue;
				const noteMatch = line.match(NOTE_LINE_RE);
				if (noteMatch && noteMatch[1].length === recordOwner.indent + 2) {
					recordOwner.note = noteMatch[2].replace(/\\n/gu, "\n");
				}
				const record = taskRecordFromLine(line, recordOwner.indent);
				if (record?.type === "comment") recordOwner.comments.push(record);
				if (record?.type === "activity") recordOwner.activities.push(record);
			}

			for (const task of tasks)
				Object.assign(task, taskTemporalMetadata(file, task.activities, task.comments));
			return { tasks, notes };
		})();
		if (fileSignature) {
			this.collectionCache.set(file.path, { signature: fileSignature, value: collected });
			collected.catch(() => {
				if (this.collectionCache.get(file.path)?.value === collected)
					this.collectionCache.delete(file.path);
			});
		}
		if (readCache) readCache.set(cacheKey, collected);
		return collected;
	}

	async collectTasks(scope = "active", readCache = null) {
		const tasks = [];
		const runCache = readCache || new Map();
		const files = this.collectionFiles().filter((file) => {
			if (this.isTaskPathExcluded(file.path)) return false;
			return scope === "trash" ? file.path === this.trashPath() : file.path !== this.trashPath();
		});
		const collections = await this.collectIndexedFiles(files, runCache);
		for (const collected of collections) {
			tasks.push(...collected.tasks);
		}
		return tasks;
	}

	async collectNotes(readCache = null) {
		const notes = [];
		const runCache = readCache || new Map();
		const files = this.collectionFiles().filter(
			(file) => !this.isTaskPathExcluded(file.path) && file.path !== this.trashPath(),
		);
		const collections = await this.collectIndexedFiles(files, runCache);
		for (const collected of collections) {
			notes.push(...collected.notes);
		}
		return notes;
	}

	async collectTrashTasks(readCache = null) {
		return this.collectTasks("trash", readCache);
	}

	async moveTaskRelative(source, target, after = false) {
		if (source.path === target.path && source.line === target.line) return;
		const sourceFile = this.app.vault.getAbstractFileByPath(source.path);
		const targetFile = this.app.vault.getAbstractFileByPath(target.path);
		if (!(sourceFile instanceof TFile) || !(targetFile instanceof TFile))
			throw new Error(this.t("error.data.moveNotesMissing"));

		if (source.path === target.path) {
			await this.app.vault.process(sourceFile, (content) => {
				const lines = content.split("\n");
				const sourceLocation = resolveTaskLine(lines, source);
				const targetLocation = resolveTaskLine(lines, target);
				if (!sourceLocation || !targetLocation)
					throw new Error(this.t("error.data.taskMovedReload"));
				return moveTaskBlock(
					lines,
					{ line: sourceLocation.index, indent: sourceLocation.indent },
					{ line: targetLocation.index, indent: targetLocation.indent },
					after,
				).join("\n");
			});
			return;
		}

		const sourceContent = await this.app.vault.cachedRead(sourceFile);
		const targetContent = await this.app.vault.cachedRead(targetFile);
		const sourceLines = sourceContent.split("\n");
		const targetLines = targetContent.split("\n");
		const sourceLocation = resolveTaskLine(sourceLines, source);
		const targetLocation = resolveTaskLine(targetLines, target);
		if (!sourceLocation || !targetLocation) throw new Error(this.t("error.data.taskMovedReload"));
		const sourceIndent = sourceLocation.indent;
		const targetIndent = targetLocation.indent;
		if (sourceIndent || targetIndent) throw new Error(this.t("error.data.subtaskMove"));
		const sourceRange = taskBlockRange(sourceLines, sourceLocation.index, sourceIndent);
		const targetRange = taskBlockRange(targetLines, targetLocation.index, targetIndent);
		const originalBlock = sourceLines.slice(sourceRange.start, sourceRange.end);
		const block = normalizeTaskBlock(originalBlock, sourceIndent);

		await this.app.vault.process(targetFile, (content) => {
			if (content !== targetContent) throw new Error(this.t("error.data.targetChanged"));
			const lines = content.split("\n");
			lines.splice(after ? targetRange.end : targetRange.start, 0, ...block);
			return lines.join("\n");
		});
		try {
			await this.app.vault.process(sourceFile, (content) => {
				if (content !== sourceContent) throw new Error(this.t("error.data.sourceChangedCopied"));
				const lines = content.split("\n");
				lines.splice(sourceRange.start, sourceRange.end - sourceRange.start);
				return lines.join("\n");
			});
		} catch (error) {
			throw new Error(this.t("error.data.moveProtected", { error: error.message }), {
				cause: error,
			});
		}
	}

	async mergeTasks(target, sources) {
		const candidates = sources.filter((task) => task.key !== target.key && !task.parentKey);
		if (!candidates.length) return;
		const involvedPaths = [...new Set([target.path, ...candidates.map((task) => task.path)])];
		const snapshots = new Map();
		for (const path of involvedPaths) {
			const file = this.app.vault.getAbstractFileByPath(path);
			if (!(file instanceof TFile)) throw new Error(this.t("error.data.noteMissing", { path }));
			snapshots.set(path, { file, content: await this.app.vault.cachedRead(file) });
		}
		const targetSnapshot = snapshots.get(target.path);
		const targetLocation = resolveTaskLine(targetSnapshot.content.split("\n"), target);
		if (!targetLocation) throw new Error(this.t("error.data.mergeTargetMissing"));
		const blocks = candidates.map((task) => {
			const lines = snapshots.get(task.path).content.split("\n");
			const location = resolveTaskLine(lines, task);
			if (!location) throw new Error(this.t("error.data.taskMovedMerge"));
			const range = taskBlockRange(lines, location.index, location.indent);
			return {
				task,
				range,
				nested: nestTaskBlock(lines.slice(range.start, range.end), location.indent),
			};
		});
		await this.app.vault.process(targetSnapshot.file, (content) => {
			if (content !== targetSnapshot.content)
				throw new Error(this.t("error.data.mergeTargetChanged"));
			const lines = content.split("\n");
			let targetLine = targetLocation.index;
			const localBlocks = blocks
				.filter(({ task }) => task.path === target.path)
				.toSorted((a, b) => b.range.start - a.range.start);
			for (const { range } of localBlocks) {
				lines.splice(range.start, range.end - range.start);
				if (range.start < targetLine) targetLine -= range.end - range.start;
			}
			if (!lines[targetLine]?.match(TASK_RE))
				throw new Error(this.t("error.data.mergeTargetMissing"));
			const targetRange = taskBlockRange(lines, targetLine, targetLocation.indent);
			const additions = blocks.flatMap(({ nested }) => nested);
			additions.push(
				`${" ".repeat(targetLocation.indent + 2)}> 🕘 ${new Date().toISOString()} ${this.t("history.tasksMerged", { count: candidates.length + 1 })}`,
			);
			lines.splice(targetRange.end, 0, ...additions);
			return lines.join("\n");
		});
		for (const path of involvedPaths.filter((value) => value !== target.path)) {
			const snapshot = snapshots.get(path);
			const ranges = blocks
				.filter(({ task }) => task.path === path)
				.map(({ range }) => range)
				.toSorted((a, b) => b.start - a.start);
			if (!ranges.length) continue;
			await this.app.vault.process(snapshot.file, (content) => {
				if (content !== snapshot.content)
					throw new Error(this.t("error.data.mergeSourceChanged", { path }));
				const lines = content.split("\n");
				ranges.forEach((range) => lines.splice(range.start, range.end - range.start));
				return lines.join("\n");
			});
		}
	}

	async mutateTask(task, transform, logActivity = true) {
		const file = this.app.vault.getAbstractFileByPath(task.path);
		if (!(file instanceof TFile)) return;
		let resolvedTask = null;
		await this.app.vault.process(file, (content) => {
			const lines = content.split("\n");
			const location = resolveTaskLine(lines, task);
			if (!location) throw new Error(this.t("error.data.taskMovedUpdate"));
			const current = lines[location.index];
			const updated = transform(current);
			lines[location.index] = updated;
			if (logActivity && updated !== current) {
				const range = taskBlockRange(lines, location.index, location.indent);
				const label = describeTaskChange(current, updated);
				lines.splice(
					range.end,
					0,
					`${" ".repeat(location.indent + 2)}> 🕘 ${new Date().toISOString()} ${label}`,
				);
			}
			resolvedTask = {
				line: location.index,
				indent: location.indent,
				raw: updated.match(TASK_RE)?.[4] || location.raw,
			};
			return lines.join("\n");
		});
		if (resolvedTask) Object.assign(task, resolvedTask);
	}

	async appendTaskRecord(task, type, text) {
		const file = this.app.vault.getAbstractFileByPath(task.path);
		if (!(file instanceof TFile) || !text.trim()) return;
		await this.app.vault.process(file, (content) => {
			const lines = content.split("\n");
			const location = resolveTaskLine(lines, task);
			if (!location) throw new Error(this.t("error.data.taskMovedRecord"));
			const range = taskBlockRange(lines, location.index, location.indent);
			const icon = type === "comment" ? "💬" : "🕘";
			lines.splice(
				range.end,
				0,
				`${" ".repeat(location.indent + 2)}> ${icon} ${new Date().toISOString()} ${text.trim().replace(/\n/gu, "\\n")}`,
			);
			task.line = location.index;
			return lines.join("\n");
		});
	}

	async appendTaskActivity(task, text) {
		return this.appendTaskRecord(task, "activity", text);
	}

	async addTaskComment(task, text) {
		if (!text.trim()) return;
		await this.appendTaskRecord(task, "comment", text);
	}

	async toggleTask(task) {
		try {
			if (!task.done && task.repeat) {
				const file = this.app.vault.getAbstractFileByPath(task.path);
				if (!(file instanceof TFile)) return;
				await this.app.vault.process(file, (content) => {
					const lines = content.split("\n");
					const location = resolveTaskLine(lines, task);
					if (!location) throw new Error(this.t("error.data.taskMovedUpdate"));
					const current = lines[location.index];
					const match = current?.match(TASK_RE);
					if (!match) throw new Error(this.t("error.data.taskMovedUpdate"));
					const completedRaw = `${match[4].replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/gu, "").trimEnd()} ✅ ${localDate()}`;
					lines[location.index] = `${match[1]}x${match[3]}${completedRaw}`;
					const nextDate = nextRepeatDate(
						task.due || task.timeBlock?.date || localDate(),
						task.repeat,
					);
					let nextRaw = match[4]
						.replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/gu, "")
						.replace(/\s*<!--\s*ttd:[a-z0-9-]+\s*-->/gu, "")
						.trimEnd();
					if (DATE_RE.test(nextRaw)) nextRaw = nextRaw.replace(DATE_RE, `📅 ${nextDate}`);
					else nextRaw += ` 📅 ${nextDate}`;
					nextRaw = shiftTimeBlockToDate(nextRaw, nextDate);
					nextRaw = nextRaw.replace(
						REMINDER_GLOBAL_RE,
						(value, date, time) => `🔔 ${nextDate} ${time}`,
					);
					lines.splice(
						location.index + 1,
						0,
						`${" ".repeat(task.indent + 2)}> 🕘 ${new Date().toISOString()} ${this.t("history.completedRecurring", { date: nextDate })}`,
						`${match[1]} ${match[3]}${nextRaw}`,
					);
					task.line = location.index;
					return lines.join("\n");
				});
				return;
			}
			await this.mutateTask(task, (line) => {
				const match = line.match(TASK_RE);
				const nextDone = !task.done;
				let raw = match[4].replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/gu, "").trimEnd();
				if (nextDone) raw += ` ✅ ${localDate()}`;
				return `${match[1]}${nextDone ? "x" : " "}${match[3]}${raw}`;
			});
		} catch (error) {
			new Notice(error.message);
		}
	}

	async updateTask(task, values) {
		const attachments = values.attachments?.length
			? await this.storeAttachments(values.attachments, task.path)
			: [];
		const priorityEmoji = { 3: "⏫", 2: "🔼", 1: "", 0: "🔽" }[values.priority];
		let updatedLine = "";
		await this.mutateTask(
			task,
			(line) => {
				const match = line.match(TASK_RE);
				const done = task.done ? ` ✅ ${task.doneDate || localDate()}` : "";
				const due = values.due ? ` 📅 ${values.due}` : "";
				let timeBlock = "";
				if (values.startAt && values.endAt) {
					const [startDate, startTime] = values.startAt.split("T");
					const [endDate, endTime] = values.endAt.split("T");
					timeBlock =
						startDate === endDate
							? ` ⏰ ${startDate} ${startTime}-${endTime}`
							: ` ⏰ ${startDate} ${startTime}→${endDate} ${endTime}`;
				}
				const priority = priorityEmoji ? ` ${priorityEmoji}` : "";
				const matrix = `${values.important ? ` ${IMPORTANT_TAG}` : ""}${values.urgent ? ` ${URGENT_TAG}` : ""}`;
				const list = values.list ? ` 📋 ${values.list}` : "";
				const section = values.section ? ` 🗂 ${values.section}` : "";
				const tags = values.tags.map((tag) => ` #${tag.replace(/\s+/gu, "-")}`).join("");
				const repeat = values.repeat ? ` 🔁 ${values.repeat}` : "";
				const reminder = values.reminders.map((value) => ` 🔔 ${value.replace("T", " ")}`).join("");
				const progress =
					!values.progressAuto && values.progress > 0
						? ` 📊 ${Math.min(100, Math.max(0, values.progress))}%`
						: "";
				const status =
					values.status && values.status !== this.statuses()[0].id ? ` 🚦 ${values.status}` : "";
				const estimatedPomos = values.estimatedPomos
					? ` 🍅 ${Math.min(999, values.estimatedPomos)}`
					: "";
				const estimatedMinutes = values.estimatedMinutes
					? ` ⏳ ${Math.min(9999, values.estimatedMinutes)}m`
					: "";
				const wontDo = task.wontDo ? " 🚫" : "";
				const identity = task.taskId ? ` <!-- ttd:${task.taskId} -->` : "";
				updatedLine = `${match[1]}${match[2]}${match[3]}${values.description}${list}${section}${tags}${matrix}${priority}${due}${timeBlock}${repeat}${reminder}${progress}${estimatedPomos}${estimatedMinutes}${status}${wontDo}${identity}${done}`;
				return updatedLine;
			},
			false,
		);
		if (values.list) await this.createTaxonomy("list", values.list);
		for (const tag of values.tags) await this.createTaxonomy("tag", tag);
		if (values.existingSubtasks?.length) await this.updateSubtasks(task, values.existingSubtasks);
		if (values.newSubtasks.length) await this.addSubtasks(task, values.newSubtasks);
		await this.updateTaskNote(task, [values.note, ...attachments].filter(Boolean).join("\n"));
		if (values.newComment) await this.addTaskComment(task, values.newComment);
		await this.appendTaskActivity(
			task,
			describeTaskChange(task.raw, updatedLine) || this.t("history.taskUpdated"),
		);
	}

	async storeAttachments(files, sourcePath) {
		const links = [];
		for (const file of files) {
			const path = normalizePath(
				await this.app.fileManager.getAvailablePathForAttachment(file.name, sourcePath),
			);
			const folder = path.split("/").slice(0, -1).join("/");
			if (folder) {
				const parts = folder.split("/");
				let current = "";
				for (const part of parts) {
					current = current ? `${current}/${part}` : part;
					if (!this.app.vault.getAbstractFileByPath(current))
						await this.app.vault.createFolder(current);
				}
			}
			await this.app.vault.createBinary(path, await file.arrayBuffer());
			links.push(attachmentMarkdown(path, file.type));
		}
		return links;
	}

	async updateSubtasks(parent, specs) {
		const file = this.app.vault.getAbstractFileByPath(parent.path);
		if (!(file instanceof TFile)) return;
		await this.app.vault.process(file, (content) => {
			const lines = content.split("\n");
			const location = resolveTaskLine(lines, parent);
			if (!location) throw new Error(this.t("error.data.taskMovedUpdate"));
			parent.line = location.index;
			return reorderSubtaskBlocks(
				lines,
				{ ...parent, line: location.index, indent: location.indent },
				specs,
			).join("\n");
		});
	}

	async updateTaskNote(task, note) {
		const file = this.app.vault.getAbstractFileByPath(task.path);
		if (!(file instanceof TFile)) return;
		await this.app.vault.process(file, (content) => {
			const lines = content.split("\n");
			const location = resolveTaskLine(lines, task);
			if (!location) throw new Error(this.t("error.data.taskMovedUpdate"));
			task.line = location.index;
			let end = location.index + 1;
			let existing = -1;
			while (end < lines.length) {
				const nextTask = lines[end].match(TASK_RE);
				if (nextTask && nextTask[1].match(/^\s*/u)[0].length <= task.indent) break;
				const noteMatch = lines[end].match(NOTE_LINE_RE);
				if (noteMatch && noteMatch[1].length === task.indent + 2) existing = end;
				end += 1;
			}
			if (existing !== -1) lines.splice(existing, 1);
			if (note)
				lines.splice(
					location.index + 1,
					0,
					`${" ".repeat(location.indent + 2)}> 📝 ${note.replace(/\n/gu, "\\n")}`,
				);
			return lines.join("\n");
		});
	}

	async addSubtasks(task, descriptions) {
		const file = this.app.vault.getAbstractFileByPath(task.path);
		if (!(file instanceof TFile)) return;
		await this.app.vault.process(file, (content) => {
			const lines = content.split("\n");
			const location = resolveTaskLine(lines, task);
			if (!location) throw new Error(this.t("error.data.taskMovedUpdate"));
			task.line = location.index;
			const indent = " ".repeat(location.indent + 2);
			const additions = descriptions.map((description) => `${indent}- [ ] ${description}`);
			lines.splice(location.index + 1, 0, ...additions);
			return lines.join("\n");
		});
	}

	async duplicateTask(task) {
		const file = this.app.vault.getAbstractFileByPath(task.path);
		if (!(file instanceof TFile)) return;
		await this.app.vault.process(file, (content) => {
			const lines = content.split("\n");
			const location = resolveTaskLine(lines, task);
			if (!location) throw new Error(this.t("error.data.taskMovedUpdate"));
			const range = taskBlockRange(lines, location.index, location.indent);
			const existingIds = new Set(
				[...content.matchAll(/<!--\s*ttd:([a-z0-9-]+)\s*-->/gu)].map((match) => match[1]),
			);
			const nextIdentity = () => {
				let identity = createTaskId("copy");
				while (existingIds.has(identity)) identity = createTaskId("copy");
				existingIds.add(identity);
				return identity;
			};
			const block = lines
				.slice(range.start, range.end)
				.filter((line) => !ACTIVITY_LINE_RE.test(line))
				.map((line) => {
					const match = line.match(TASK_RE);
					if (!match) return line;
					const raw = match[4]
						.replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/gu, "")
						.replace(/\s*<!--\s*ttd:[a-z0-9-]+\s*-->/gu, "")
						.trimEnd();
					return `${match[1]} ${match[3]}${raw} <!-- ttd:${nextIdentity()} -->`;
				});
			block.splice(
				1,
				0,
				`${" ".repeat(location.indent + 2)}> 🕘 ${new Date().toISOString()} ${this.t("history.taskCreated")}`,
			);
			lines.splice(range.end, 0, ...block);
			return lines.join("\n");
		});
	}

	async ensureMarkdownFile(path, initial = "") {
		let file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) return file;
		const folder = path.split("/").slice(0, -1).join("/");
		if (folder) {
			let current = "";
			for (const part of folder.split("/")) {
				current = current ? `${current}/${part}` : part;
				if (!this.app.vault.getAbstractFileByPath(current))
					await this.app.vault.createFolder(current);
			}
		}
		file = await this.app.vault.create(path, initial);
		this.updateCollectionIndex("create", file);
		return file;
	}

	async deleteTask(task) {
		const file = this.app.vault.getAbstractFileByPath(task.path);
		if (!(file instanceof TFile)) return;
		const content = await this.app.vault.cachedRead(file);
		const lines = content.split("\n");
		const location = resolveTaskLine(lines, task);
		if (!location) throw new Error(this.t("error.data.taskMovedUpdate"));
		const range = taskBlockRange(lines, location.index, location.indent);
		const block = normalizeTaskBlock(lines.slice(range.start, range.end), location.indent);
		const trash = await this.ensureMarkdownFile(this.trashPath(), "# Taktune Trash\n\n");
		const marker = JSON.stringify({ source: task.path, deletedAt: new Date().toISOString() });
		await this.app.vault.append(trash, `\n<!-- ttd-trash ${marker} -->\n${block.join("\n")}\n`);
		await this.app.vault.process(file, (currentContent) => {
			if (currentContent !== content) throw new Error(this.t("error.data.sourceChangedCopied"));
			const currentLines = currentContent.split("\n");
			const currentRange = taskBlockRange(currentLines, location.index, location.indent);
			currentLines.splice(currentRange.start, currentRange.end - currentRange.start);
			return currentLines.join("\n");
		});
		new Notice(this.t("notice.movedToTrash"));
	}

	async restoreTask(task) {
		const trash = this.app.vault.getAbstractFileByPath(this.trashPath());
		if (!(trash instanceof TFile)) return;
		const content = await this.app.vault.cachedRead(trash);
		const lines = content.split("\n");
		const location = resolveTaskLine(lines, task);
		if (!location) throw new Error(this.t("error.data.taskMovedUpdate"));
		const range = taskBlockRange(lines, location.index, location.indent);
		const block = normalizeTaskBlock(lines.slice(range.start, range.end), location.indent);
		const sourcePath = task.trashMeta?.source || this.inboxPath();
		const source = await this.ensureMarkdownFile(sourcePath, "");
		const sourceContent = await this.app.vault.cachedRead(source);
		await this.app.vault.append(
			source,
			`${sourceContent && !sourceContent.endsWith("\n") ? "\n" : ""}${block.join("\n")}\n`,
		);
		await this.app.vault.process(trash, (trashContent) => {
			if (trashContent !== content) throw new Error(this.t("error.data.sourceChangedCopied"));
			const trashLines = trashContent.split("\n");
			const currentRange = taskBlockRange(trashLines, location.index, location.indent);
			const markerIndex =
				location.index > 0 && trashLines[location.index - 1].startsWith("<!-- ttd-trash ")
					? location.index - 1
					: location.index;
			trashLines.splice(markerIndex, currentRange.end - markerIndex);
			return trashLines.join("\n");
		});
		new Notice(this.t("notice.taskRestored", { title: cleanDescription(task.raw) }));
	}

	async setTaskMatrix(task, important, urgent) {
		await this.mutateTask(task, (line) => {
			const match = line.match(TASK_RE);
			let raw = match[4].replace(/\s*#(?:重要|緊急)(?=\s|$)/gu, "").trimEnd();
			const doneMatch = raw.match(/\s+✅\s*\d{4}-\d{2}-\d{2}\s*$/u);
			const done = doneMatch?.[0] || "";
			if (done) raw = raw.slice(0, -done.length).trimEnd();
			const matrix = `${important ? ` ${IMPORTANT_TAG}` : ""}${urgent ? ` ${URGENT_TAG}` : ""}`;
			return `${match[1]}${match[2]}${match[3]}${raw}${matrix}${done}`;
		});
	}

	async setTaskWontDo(task, wontDo) {
		await this.mutateTask(task, (line) => {
			const match = line.match(TASK_RE);
			let raw = match[4].replace(/\s*🚫(?=\s|$)/gu, "").trimEnd();
			const doneMatch = raw.match(/\s+✅\s*\d{4}-\d{2}-\d{2}\s*$/u);
			const done = doneMatch?.[0] || "";
			if (done) raw = raw.slice(0, -done.length).trimEnd();
			return `${match[1]}${match[2]}${match[3]}${raw}${wontDo ? " 🚫" : ""}${done}`;
		});
	}

	async setTaskStatus(task, status) {
		if (!this.statuses().some((item) => item.id === status)) return;
		await this.mutateTask(task, (line) => {
			const match = line.match(TASK_RE);
			let raw = match[4].replace(/\s*🚦\s*[\p{L}\p{N}_-]+/gu, "").trimEnd();
			const doneMatch = raw.match(/\s+✅\s*\d{4}-\d{2}-\d{2}\s*$/u);
			const done = doneMatch?.[0] || "";
			if (done) raw = raw.slice(0, -done.length).trimEnd();
			return `${match[1]}${match[2]}${match[3]}${raw}${status === this.statuses()[0].id ? "" : ` 🚦 ${status}`}${done}`;
		});
		await this.appendTaskActivity(
			task,
			this.t("history.statusChanged", { name: this.statusById(status).name }),
		);
	}

	async convertTaskToNote(task) {
		const file = this.app.vault.getAbstractFileByPath(task.path);
		if (!(file instanceof TFile)) return;
		await this.app.vault.process(file, (content) => {
			const lines = content.split("\n");
			const location = resolveTaskLine(lines, task);
			if (!location) throw new Error(this.t("error.data.taskMovedConvert"));
			const match = lines[location.index]?.match(TASK_RE);
			if (!match) throw new Error(this.t("error.data.taskMovedConvert"));
			const range = taskBlockRange(lines, location.index, location.indent);
			const raw = match[4].replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/gu, "").trimEnd();
			lines[location.index] = `${" ".repeat(location.indent)}- 🗒️ ${raw}`;
			lines.splice(
				range.end,
				0,
				`${" ".repeat(location.indent + 2)}> 🕘 ${new Date().toISOString()} ${this.t("history.convertedToNote")}`,
			);
			return lines.join("\n");
		});
		new Notice(this.t("notice.convertedToNote"));
	}

	async convertNoteToTask(note) {
		const file = this.app.vault.getAbstractFileByPath(note.path);
		if (!(file instanceof TFile)) return;
		await this.app.vault.process(file, (content) => {
			const lines = content.split("\n");
			const match = lines[note.line]?.match(NOTE_ITEM_RE);
			if (!match) throw new Error(this.t("error.data.noteMovedConvert"));
			const range = noteItemBlockRange(lines, note.line, note.indent);
			lines[note.line] = `${" ".repeat(note.indent)}- [ ] ${match[2]}`;
			lines.splice(
				range.end,
				0,
				`${" ".repeat(note.indent + 2)}> 🕘 ${new Date().toISOString()} ${this.t("history.convertedToTask")}`,
			);
			return lines.join("\n");
		});
		new Notice(this.t("notice.convertedToTask"));
	}

	async setTaskList(task, list) {
		await this.mutateTask(task, (line) => {
			const match = line.match(TASK_RE);
			let raw = match[4]
				.replace(/\s*📋\s*.+?(?=\s+(?:🗂️?|📅|✅|⏰|🔁|🔔|⏫|🔼|🔽|#)|$)/gu, "")
				.trimEnd();
			const doneMatch = raw.match(/\s+✅\s*\d{4}-\d{2}-\d{2}\s*$/u);
			const done = doneMatch?.[0] || "";
			if (done) raw = raw.slice(0, -done.length).trimEnd();
			return `${match[1]}${match[2]}${match[3]}${raw}${list ? ` 📋 ${list}` : ""}${done}`;
		});
		if (list) await this.createTaxonomy("list", list);
	}

	async setTaskTime(task, date, startMinutes, durationMinutes) {
		await this.mutateTask(task, (line) =>
			taskLineWithTime(line, date, startMinutes, durationMinutes),
		);
	}

	async batchMoveTaskTimes(tasks, dateForTask) {
		const updates = [];
		for (const task of tasks) {
			if (!task.timeBlock) continue;
			const moved = moveTimeBlockToDate(task.timeBlock, dateForTask(task));
			updates.push({ task, slot: moved });
		}
		await this.batchWriteTaskTimes(updates);
	}

	async batchScheduleTasks(tasks, date, startMinutes, durationMinutes) {
		const slots = batchScheduleSlots(tasks.length, date, startMinutes, durationMinutes);
		await this.batchWriteTaskTimes(tasks.map((task, index) => ({ task, slot: slots[index] })));
	}

	async batchWriteTaskTimes(updates) {
		const groups = new Map();
		updates.forEach(({ task, slot }) => {
			const entries = groups.get(task.path) || [];
			entries.push({ task, slot });
			groups.set(task.path, entries);
		});
		const snapshots = new Map();
		for (const [path] of groups) {
			const file = this.app.vault.getAbstractFileByPath(path);
			if (!(file instanceof TFile)) throw new Error(this.t("error.data.scheduleRead", { path }));
			const content =
				typeof this.app.vault.cachedRead === "function"
					? await this.app.vault.cachedRead(file)
					: await this.app.vault.read(file);
			snapshots.set(path, { file, content });
		}
		const resolvedGroups = new Map();
		for (const [path, entries] of groups) {
			const lines = snapshots.get(path).content.split("\n");
			const resolvedEntries = entries.map(({ task, slot }) => {
				const resolved = resolveTaskLine(lines, task);
				if (!resolved) throw new Error(this.t("error.data.taskMovedSchedule"));
				return { resolved, slot };
			});
			if (
				new Set(resolvedEntries.map(({ resolved }) => resolved.index)).size !==
				resolvedEntries.length
			)
				throw new Error(this.t("error.data.taskMovedSchedule"));
			resolvedGroups.set(path, resolvedEntries);
		}
		const modified = [];
		try {
			for (const [path, entries] of resolvedGroups) {
				const snapshot = snapshots.get(path);
				let afterContent = snapshot.content;
				await this.app.vault.process(snapshot.file, (content) => {
					if (content !== snapshot.content)
						throw new Error(this.t("error.data.scheduleChanged", { path }));
					const lines = content.split("\n");
					for (const { resolved, slot } of [...entries].toSorted(
						(a, b) => b.resolved.index - a.resolved.index,
					)) {
						const current = lines[resolved.index];
						if (!current || !TASK_RE.test(current))
							throw new Error(this.t("error.data.taskMovedSchedule"));
						const updated = taskLineWithTime(
							current,
							slot.date,
							slot.startMinutes,
							slot.durationMinutes,
						);
						lines[resolved.index] = updated;
						if (updated !== current) {
							const range = taskBlockRange(lines, resolved.index, resolved.indent);
							lines.splice(
								range.end,
								0,
								`${" ".repeat(resolved.indent + 2)}> 🕘 ${new Date().toISOString()} ${describeTaskChange(current, updated)}`,
							);
						}
					}
					afterContent = lines.join("\n");
					return afterContent;
				});
				modified.push({ ...snapshot, path, afterContent });
			}
		} catch (cause) {
			const rollbackErrors = [];
			const recoveredPaths = [];
			const preservedExternalEditPaths = [];
			for (const snapshot of modified.toReversed()) {
				try {
					let recovered = false;
					await this.app.vault.process(snapshot.file, (current) => {
						if (current !== snapshot.afterContent) {
							preservedExternalEditPaths.push(snapshot.path);
							return current;
						}
						recovered = true;
						return snapshot.content;
					});
					if (recovered) recoveredPaths.push(snapshot.path);
				} catch (error) {
					rollbackErrors.push(`${snapshot.path}: ${error?.message || String(error)}`);
				}
			}
			const error = cause instanceof Error ? cause : new Error(String(cause));
			error.recovery = {
				recoveredPaths,
				preservedExternalEditPaths,
				rollbackErrors,
			};
			const recoveryMessages = [
				...preservedExternalEditPaths.map((path) => `${path}: external edit preserved`),
				...rollbackErrors,
			];
			if (recoveryMessages.length)
				error.message = this.t("error.data.rollback", {
					error: error.message,
					rollback: recoveryMessages.join(" / "),
				});
			throw error;
		}
	}

	async setTaskSection(task, section) {
		await this.mutateTask(task, (line) => {
			const match = line.match(TASK_RE);
			let raw = match[4]
				.replace(/\s*🗂️?\s*.+?(?=\s+(?:📋|📅|✅|⏰|🔁|🔔|⏫|🔼|🔽|#)|$)/gu, "")
				.trimEnd();
			const doneMatch = raw.match(/\s+✅\s*\d{4}-\d{2}-\d{2}\s*$/u);
			const done = doneMatch?.[0] || "";
			if (done) raw = raw.slice(0, -done.length).trimEnd();
			return `${match[1]}${match[2]}${match[3]}${raw}${section ? ` 🗂 ${section}` : ""}${done}`;
		});
	}

	async setTaskDue(task, date) {
		await this.mutateTask(task, (line) => {
			const match = line.match(TASK_RE);
			let raw = match[4].replace(/\s*📅\s*\d{4}-\d{2}-\d{2}/gu, "").trimEnd();
			const doneMatch = raw.match(/\s+✅\s*\d{4}-\d{2}-\d{2}\s*$/u);
			const done = doneMatch?.[0] || "";
			if (done) raw = raw.slice(0, -done.length).trimEnd();
			return `${match[1]}${match[2]}${match[3]}${raw}${date ? ` 📅 ${date}` : ""}${done}`;
		});
	}

	async setTaskPriority(task, priority) {
		const emoji = { 3: "⏫", 2: "🔼", 1: "", 0: "🔽" }[Number(priority)] ?? "";
		await this.mutateTask(task, (line) => {
			const match = line.match(TASK_RE);
			let raw = match[4].replace(/\s*[⏫🔼🔽]/gu, "").trimEnd();
			const doneMatch = raw.match(/\s+✅\s*\d{4}-\d{2}-\d{2}\s*$/u);
			const done = doneMatch?.[0] || "";
			if (done) raw = raw.slice(0, -done.length).trimEnd();
			return `${match[1]}${match[2]}${match[3]}${raw}${emoji ? ` ${emoji}` : ""}${done}`;
		});
	}

	async updateTaskTag(task, value, add) {
		const tag = value
			.trim()
			.replace(/^#+/u, "")
			.replace(/\s+/gu, "-")
			.replace(/[^\p{L}\p{N}_/-]/gu, "");
		if (!tag) return;
		await this.mutateTask(task, (line) => {
			const match = line.match(TASK_RE);
			const tagPattern = new RegExp(`(?:^|\\s)#${escapeRegex(tag)}(?=\\s|$)`, "gu");
			let raw = match[4]
				.replace(tagPattern, "")
				.replace(/\s{2,}/gu, " ")
				.trim();
			if (add) {
				const doneMatch = raw.match(/\s+✅\s*\d{4}-\d{2}-\d{2}\s*$/u);
				const done = doneMatch?.[0] || "";
				if (done) raw = raw.slice(0, -done.length).trimEnd();
				raw = `${raw} #${tag}${done}`;
			}
			return `${match[1]}${match[2]}${match[3]}${raw}`;
		});
	}

	async batchUpdateTasks(tasks, action, value) {
		const ordered = [...tasks].toSorted((a, b) =>
			a.path === b.path ? b.line - a.line : a.path.localeCompare(b.path),
		);
		for (const task of ordered) {
			if (action === "list") await this.setTaskList(task, value);
			if (action === "due") await this.setTaskDue(task, value);
			if (action === "priority") await this.setTaskPriority(task, value);
			if (action === "tag-add") await this.updateTaskTag(task, value, true);
			if (action === "tag-remove") await this.updateTaskTag(task, value, false);
			if (action === "complete" && !task.done) await this.toggleTask(task);
			if (action === "wontdo") await this.setTaskWontDo(task, value === "true");
			if (action === "delete") await this.deleteTask(task);
		}
	}

	async clearTaskTime(task) {
		await this.mutateTask(task, (line) =>
			line
				.replace(TIMEBLOCK_MULTI_RE, "")
				.replace(/\s*⏰\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}-\d{2}:\d{2}/gu, ""),
		);
	}

	async checkReminders() {
		if (this.checkingReminders) return;
		this.checkingReminders = true;
		try {
			const now = new Date();
			const state = this.settings.reminderState;
			let shouldPersist = false;
			const savedLast = Date.parse(state.lastCheck || "");
			const lastCheck = Number.isFinite(savedLast)
				? Math.max(savedLast, now.getTime() - 86_400_000)
				: now.getTime() - 61_000;
			const tasks = await this.collectTasks();
			for (const task of tasks) {
				if (task.done || task.wontDo || !task.reminders.length) continue;
				for (const reminder of task.reminders) {
					const original = `${reminder.date}T${reminder.time}:00`;
					const sourceId = `${task.key}:${original}`;
					const effective = state.snoozes[sourceId] || original;
					const eventKey = `${sourceId}:${effective}`;
					if (!isReminderDue(effective, lastCheck, now.getTime())) continue;
					if (state.dismissed[eventKey] || this.firedReminders.has(eventKey)) continue;
					this.firedReminders.add(eventKey);
					this.enqueueReminder({ ...task, notificationTime: effective }, eventKey, sourceId);
					shouldPersist = true;
				}
			}
			const reminderDates = [...new Set([localDate(new Date(lastCheck)), localDate(now)])];
			for (const habit of (this.settings.habits || []).filter(
				(item) => !item.archived && item.reminders?.length,
			)) {
				for (const date of reminderDates) {
					if (
						!isHabitScheduled(habit, date) ||
						habitValue(this.settings.habitLog, habit.id, date) >= (habit.target || 1)
					)
						continue;
					for (const time of habit.reminders) {
						const original = `${date}T${time}:00`;
						const sourceId = `habit:${habit.id}:${date}:${time}`;
						const effective = state.snoozes[sourceId] || original;
						const eventKey = `${sourceId}:${effective}`;
						if (!isReminderDue(effective, lastCheck, now.getTime())) continue;
						if (state.dismissed[eventKey] || this.firedReminders.has(eventKey)) continue;
						this.firedReminders.add(eventKey);
						this.enqueueReminder(
							{
								key: `habit:${habit.id}:${date}`,
								raw: habit.name,
								path: this.t("nav.habits"),
								due: date,
								done: false,
								isHabit: true,
								habitId: habit.id,
								habitDate: date,
								habitTarget: habit.target || 1,
								notificationTime: effective,
							},
							eventKey,
							sourceId,
						);
						shouldPersist = true;
					}
				}
			}
			for (const countdown of (this.settings.countdowns || []).filter((item) => item.reminder)) {
				for (const date of reminderDates) {
					const target = countdownNextDate(countdown, date);
					const notifyDate = addDays(target, -Number(countdown.reminderDays || 0));
					if (notifyDate !== date) continue;
					const original = `${date}T${countdown.reminder}:00`;
					const sourceId = `countdown:${countdown.id}:${target}`;
					const effective = state.snoozes[sourceId] || original;
					const eventKey = `${sourceId}:${effective}`;
					if (!isReminderDue(effective, lastCheck, now.getTime())) continue;
					if (state.dismissed[eventKey] || this.firedReminders.has(eventKey)) continue;
					this.firedReminders.add(eventKey);
					this.enqueueReminder(
						{
							key: sourceId,
							raw: countdown.title,
							path: this.t("nav.countdown"),
							due: target,
							done: false,
							isCountdown: true,
							notificationTime: effective,
						},
						eventKey,
						sourceId,
					);
					shouldPersist = true;
				}
			}
			state.lastCheck = now.toISOString();
			const cutoff = now.getTime() - 7 * 86_400_000;
			const dismissed = Object.fromEntries(
				Object.entries(state.dismissed).filter(([, value]) => Date.parse(value) >= cutoff),
			);
			const snoozes = Object.fromEntries(
				Object.entries(state.snoozes).filter(([, value]) => Date.parse(value) >= cutoff),
			);
			shouldPersist ||= Object.keys(dismissed).length !== Object.keys(state.dismissed).length;
			shouldPersist ||= Object.keys(snoozes).length !== Object.keys(state.snoozes).length;
			state.dismissed = dismissed;
			state.snoozes = snoozes;
			if (this.firedReminders.size > 500) this.firedReminders.clear();
			if (shouldPersist) await this.saveSettings();
		} finally {
			this.checkingReminders = false;
		}
	}

	enqueueReminder(task, eventKey, sourceId) {
		this.reminderQueue.push({ task, eventKey, sourceId });
		if (typeof window.Notification === "function" && window.Notification.permission === "granted") {
			const notification = new window.Notification("Taktune", {
				body: cleanDescription(task.raw),
				tag: eventKey,
			});
			notification.addEventListener("click", () => void this.activateView(), { once: true });
		}
		this.showNextReminder();
	}

	showNextReminder() {
		if (this.activeReminder || !this.reminderQueue.length) return;
		const item = this.reminderQueue.shift();
		this.activeReminder = item;
		new ReminderModal(this.app, item.task, async (action, value) => {
			await this.handleReminderAction(item.task, item.eventKey, item.sourceId, action, value);
			this.activeReminder = null;
			this.showNextReminder();
		}).open();
	}

	async handleReminderAction(task, eventKey, sourceId, action, value) {
		const state = this.settings.reminderState;
		if (action === "snooze") {
			state.snoozes[sourceId] = new Date(Date.now() + Number(value) * 60_000).toISOString();
		} else {
			delete state.snoozes[sourceId];
			state.dismissed[eventKey] = new Date().toISOString();
		}
		if (action === "complete" && task.isHabit) {
			this.reminderQueue = this.reminderQueue.filter((item) => item.task.key !== task.key);
			await this.completeHabit(task.habitId, task.habitDate, task.habitTarget || 1);
		} else if (action === "complete" && !task.done) {
			this.reminderQueue = this.reminderQueue.filter((item) => item.task.key !== task.key);
			await this.toggleTask(task);
		}
		if (action === "open") {
			await this.activateView();
			if (task.isHabit || task.isCountdown) {
				const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
				if (leaf?.view instanceof TaktuneView) {
					leaf.view.filter = task.isHabit ? "habits" : "countdown";
					await leaf.view.render();
				}
			} else await this.openSource(task);
		}
		await this.saveSettings();
	}

	async requestNotificationPermission() {
		if (typeof window.Notification !== "function")
			return new Notice(this.t("notice.notifications.unsupported"));
		const permission = await window.Notification.requestPermission();
		new Notice(
			this.t(
				permission === "granted"
					? "notice.notifications.enabled"
					: "notice.notifications.permissionRequired",
			),
		);
	}

	testReminder() {
		const task = { raw: this.t("notifications.testTask"), path: "Taktune", due: localDate() };
		new ReminderModal(this.app, task, async (action, value) => {
			const label =
				action === "snooze"
					? this.t("notifications.snoozed", { minutes: value })
					: this.t(`notifications.action.${action}`);
			new Notice(this.t("notifications.testAction", { action: label }));
		}).open();
	}

	async skipRecurringTask(task) {
		if (!task.repeat) return;
		const nextDate = nextRepeatDate(task.due || task.timeBlock?.date || localDate(), task.repeat);
		await this.mutateTask(task, (line) => {
			let next = line;
			if (DATE_RE.test(next)) next = next.replace(DATE_RE, `📅 ${nextDate}`);
			else next += ` 📅 ${nextDate}`;
			next = shiftTimeBlockToDate(next, nextDate);
			next = next.replace(REMINDER_GLOBAL_RE, (value, date, time) => `🔔 ${nextDate} ${time}`);
			return next;
		});
	}

	async ensureTaskIdentity(task, preferredTaskId = "") {
		if (task.taskId) return task.taskId;
		const taskId = preferredTaskId || createTaskId("focus");
		await this.mutateTask(task, (line) => `${line.trimEnd()} <!-- ttd:${taskId} -->`, false);
		task.taskId = taskId;
		task.raw = `${task.raw.trimEnd()} <!-- ttd:${taskId} -->`;
		return taskId;
	}

	async addTask(description, due, metadata = {}) {
		const defaults = { ...DEFAULT_SETTINGS.taskDefaults, ...this.settings.taskDefaults };
		const resolvedDue =
			due ||
			(defaults.dueMode === "today"
				? localDate()
				: defaults.dueMode === "tomorrow"
					? addDays(localDate(), 1)
					: "");
		const resolved = {
			...metadata,
			list: metadata.list || defaults.list,
			priority:
				metadata.priority === undefined || metadata.priority === null
					? defaults.priority
					: metadata.priority,
		};
		const reminderTime = metadata.reminderTime || defaults.reminderTime;
		const reminder = offsetReminder(resolvedDue, reminderTime, metadata.reminderOffsetMinutes || 0);
		const reminders = reminder ? [`${reminder.date} ${reminder.time}`] : [];
		const path = normalizePath(this.inboxPath());
		let file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			const parent = path.split("/").slice(0, -1).join("/");
			if (!this.app.vault.getAbstractFileByPath(parent)) await this.app.vault.createFolder(parent);
			file = await this.app.vault.create(path, "# TODO Inbox\n\n");
			this.updateCollectionIndex("create", file);
		}
		const current = await this.app.vault.cachedRead(file);
		const separator = current && !current.endsWith("\n") ? "\n" : "";
		const line = current.split("\n").length - 1 + (separator ? 1 : 0);
		const priority = { 3: " ⏫", 2: " 🔼", 0: " 🔽" }[resolved.priority] || "";
		const tags = (resolved.tags || (resolved.tag ? [resolved.tag] : []))
			.map((tag) => ` #${tag.replace(/\s+/gu, "-")}`)
			.join("");
		const timeBlock = resolved.timeBlock
			? ` ⏰ ${resolved.timeBlock.date} ${timeOf(resolved.timeBlock.startMinutes)}-${timeOf(Math.min(24 * 60 - 1, resolved.timeBlock.startMinutes + resolved.timeBlock.durationMinutes))}`
			: "";
		const suffix = `${resolved.list ? ` 📋 ${resolved.list}` : ""}${resolved.section ? ` 🗂 ${resolved.section}` : ""}${tags}${resolved.important ? ` ${IMPORTANT_TAG}` : ""}${resolved.urgent ? ` ${URGENT_TAG}` : ""}${priority}${resolvedDue ? ` 📅 ${resolvedDue}` : ""}${timeBlock}${resolved.repeat ? ` 🔁 ${resolved.repeat}` : ""}${reminders.map((value) => ` 🔔 ${value}`).join("")}${resolved.estimatedPomos ? ` 🍅 ${resolved.estimatedPomos}` : ""}${resolved.estimatedMinutes ? ` ⏳ ${resolved.estimatedMinutes}m` : ""}`;
		const note = resolved.note ? `  > 📝 ${resolved.note.replace(/\n/gu, "\\n")}\n` : "";
		const subtasks = (resolved.subtasks || []).map((subtask) => `  - [ ] ${subtask}\n`).join("");
		const created = `  > 🕘 ${new Date().toISOString()} ${this.t("history.taskCreated")}\n`;
		await this.app.vault.append(
			file,
			`${separator}- [ ] ${description}${suffix}\n${created}${note}${subtasks}`,
		);
		return `${path}:${line}`;
	}

	async saveTaskTemplate(name, values, task) {
		const tasks = await this.collectTasks();
		const currentSubtasks = tasks
			.filter((candidate) => candidate.parentKey === task.key)
			.map((candidate) => cleanDescription(candidate.raw));
		const dueOffset = values.due
			? Math.round(
					(new Date(`${values.due}T00:00:00`) - new Date(`${localDate()}T00:00:00`)) / 86_400_000,
				)
			: null;
		const template = {
			id: `${Date.now()}`,
			name,
			description: values.description,
			dueOffset,
			priority: values.priority,
			important: values.important,
			urgent: values.urgent,
			list: values.list,
			section: values.section,
			tags: values.tags,
			repeat: values.repeat,
			estimatedPomos: values.estimatedPomos,
			estimatedMinutes: values.estimatedMinutes,
			note: values.note,
			subtasks: [...currentSubtasks, ...values.newSubtasks],
		};
		this.settings.taskTemplates = [...(this.settings.taskTemplates || []), template];
		await this.saveSettings();
	}

	async deleteTaskTemplate(id) {
		this.settings.taskTemplates = (this.settings.taskTemplates || []).filter(
			(item) => item.id !== id,
		);
		await this.saveSettings();
	}

	async moveTaskTemplate(id, delta) {
		this.settings.taskTemplates = moveItemById(this.settings.taskTemplates || [], id, delta);
		await this.saveSettings();
	}

	async reorderTaskTemplate(sourceId, targetId, after = false) {
		this.settings.taskTemplates = reorderItemsById(
			this.settings.taskTemplates || [],
			sourceId,
			targetId,
			after,
		);
		await this.saveSettings();
	}

	async saveHabit(habit) {
		const habits = this.settings.habits || [];
		this.settings.habits = habits.some((item) => item.id === habit.id)
			? habits.map((item) => (item.id === habit.id ? habit : item))
			: [...habits, habit];
		await this.saveSettings();
	}

	async saveCountdown(countdown) {
		const values = this.settings.countdowns || [];
		this.settings.countdowns = values.some((item) => item.id === countdown.id)
			? values.map((item) => (item.id === countdown.id ? countdown : item))
			: [...values, countdown];
		await this.saveSettings();
	}

	async deleteCountdown(id) {
		this.settings.countdowns = (this.settings.countdowns || []).filter((item) => item.id !== id);
		await this.saveSettings();
	}

	async deleteHabit(id) {
		this.settings.habits = (this.settings.habits || []).filter((habit) => habit.id !== id);
		const { [id]: _removed, ...rest } = this.settings.habitLog || {};
		this.settings.habitLog = rest;
		await this.saveSettings();
	}

	async archiveHabit(id, archived = true) {
		this.settings.habits = (this.settings.habits || []).map((habit) =>
			habit.id === id ? { ...habit, archived } : habit,
		);
		await this.saveSettings();
	}

	async toggleHabit(id, date, target = 1) {
		const values = habitLogMap(this.settings.habitLog?.[id]);
		const current = Number(values[date] || 0);
		const next = current >= target ? 0 : current + 1;
		if (next) values[date] = next;
		else delete values[date];
		this.settings.habitLog = { ...this.settings.habitLog, [id]: values };
		await this.saveSettings();
	}

	async completeHabit(id, date, target = 1) {
		const values = habitLogMap(this.settings.habitLog?.[id]);
		values[date] = Math.max(1, Number(target) || 1);
		this.settings.habitLog = { ...this.settings.habitLog, [id]: values };
		await this.saveSettings();
	}

	async openSource(task) {
		const file = this.app.vault.getAbstractFileByPath(task.path);
		if (!(file instanceof TFile)) return;
		const leaf = this.app.workspace.getLeaf("tab");
		await leaf.openFile(file, { eState: { line: task.line } });
	}

	allLists(tasks = []) {
		const configured = this.settings.lists || [];
		const discovered = [...new Set(tasks.map((task) => task.list).filter(Boolean))]
			.filter((value) => !configured.includes(value))
			.toSorted((a, b) => a.localeCompare(b, "ja"));
		return [...configured, ...discovered];
	}

	taskStorage() {
		return taskStorageSettings(this.settings);
	}

	inboxPath() {
		return this.taskStorage().inboxPath;
	}

	trashPath() {
		return this.taskStorage().trashPath;
	}

	isTaskPathExcluded(path) {
		return isTaskPathExcluded(path, this.settings);
	}

	statuses() {
		return this.persistedStatuses().map((status) => ({
			...status,
			name:
				status.name ||
				(["todo", "doing", "waiting"].includes(status.id)
					? this.t(`status.${status.id}`)
					: status.id),
		}));
	}

	persistedStatuses() {
		return statusDefinitions(this.settings);
	}

	statusById(id) {
		return this.statuses().find((status) => status.id === id) || this.statuses()[0];
	}

	async saveStatus(status) {
		const statuses = this.persistedStatuses();
		const next = { ...status, id: status.id || `status-${Date.now()}` };
		if (
			["todo", "doing", "waiting"].includes(next.id) &&
			[
				createTranslator("en")(`status.${next.id}`),
				createTranslator("ja")(`status.${next.id}`),
			].includes(next.name)
		)
			next.name = "";
		this.settings.statuses = statuses.some((item) => item.id === next.id)
			? statuses.map((item) => (item.id === next.id ? next : item))
			: [...statuses, next];
		await this.saveSettings();
	}

	async moveStatus(id, delta) {
		this.settings.statuses = moveItemById(this.persistedStatuses(), id, delta);
		await this.saveSettings();
	}

	async deleteStatus(id) {
		const statuses = this.persistedStatuses();
		if (statuses.length <= 1) return;
		const fallback = statuses.find((status) => status.id !== id)?.id;
		await this.beginTaskMutation({
			type: "delete-status",
			statusId: id,
			fallbackId: fallback,
			removeMarker: fallback === statuses[0].id,
		});
	}

	allTags(tasks = []) {
		const configured = this.settings.tags || [];
		const discovered = [...new Set(tasks.flatMap((task) => task.tags || []))]
			.filter((value) => !configured.includes(value))
			.toSorted((a, b) => a.localeCompare(b, "ja"));
		return [...configured, ...discovered];
	}

	taxonomyColor(kind, value) {
		return (
			this.settings.taxonomyMeta?.[kind]?.[value]?.color ||
			(kind === "list" ? "#4772fa" : "#8a6dc2")
		);
	}

	async createTaxonomy(kind, value) {
		const key = kind === "list" ? "lists" : "tags";
		const normalized = value.trim().replace(/^#/u, "");
		if (!normalized) return;
		this.settings[key] = [...new Set([...(this.settings[key] || []), normalized])];
		await this.saveSettings();
	}

	async updateTaxonomy(kind, previous, next, color) {
		if (previous !== next) {
			await this.renameTaxonomy(kind, previous, next, color);
			return;
		}
		const meta = this.settings.taxonomyMeta || { list: {}, tag: {} };
		const kindMeta = { ...meta[kind] };
		if (previous !== next) delete kindMeta[previous];
		kindMeta[next] = { ...kindMeta[next], color };
		this.settings.taxonomyMeta = { ...meta, [kind]: kindMeta };
		await this.saveSettings();
	}

	async reorderTaxonomy(kind, source, target) {
		const key = kind === "list" ? "lists" : "tags";
		const values = [...new Set([...(this.settings[key] || []), source, target])];
		const from = values.indexOf(source);
		values.splice(from, 1);
		values.splice(values.indexOf(target), 0, source);
		this.settings[key] = values;
		await this.saveSettings();
	}

	async createSection(list, name) {
		const sections = this.settings.sections || {};
		this.settings.sections = {
			...sections,
			[list]: [...new Set([...(sections[list] || []), name.trim()])],
		};
		await this.saveSettings();
	}

	async renameSection(list, previous, next) {
		await this.beginTaskMutation({
			type: "rename-section",
			list,
			value: previous,
			next,
		});
	}

	async removeSection(list, name) {
		await this.beginTaskMutation({ type: "remove-section", list, value: name });
	}

	async saveSmartFilter(filter) {
		const filters = this.settings.smartFilters || [];
		const index = filters.findIndex((item) => item.id === filter.id);
		this.settings.smartFilters =
			index === -1
				? [...filters, filter]
				: filters.map((item) => (item.id === filter.id ? filter : item));
		await this.saveSettings();
	}

	async deleteSmartFilter(id) {
		this.settings.smartFilters = (this.settings.smartFilters || []).filter(
			(item) => item.id !== id,
		);
		await this.saveSettings();
	}

	async renameTaxonomy(kind, previous, next, color) {
		await this.beginTaskMutation({
			type: "rename-taxonomy",
			kind,
			value: previous,
			next,
			...(typeof color === "string" ? { color } : {}),
		});
	}

	async removeTaxonomy(kind, value) {
		await this.beginTaskMutation({ type: "remove-taxonomy", kind, value });
	}

	trackTaskMutationVaultEvent(kind, file, oldPath = "") {
		const journal = this.settings?.taskMutationJournal;
		if (!journal) return;
		const markdownEvent =
			(file instanceof TFile && file.extension === "md") ||
			journal.targetPaths.some(
				(path) => path === file?.path || path === oldPath || path.startsWith(`${file?.path}/`),
			);
		if (markdownEvent) this.taskMutationGeneration = (this.taskMutationGeneration || 0) + 1;
		const next = updateTaskMutationJournalForVaultEvent(journal, {
			type: kind,
			path: file?.path,
			oldPath,
			isMarkdown: file instanceof TFile && file.extension === "md",
		});
		if (!next || JSON.stringify(next) === JSON.stringify(journal)) return;
		this.settings = { ...this.settings, taskMutationJournal: next };
		void this.persistTaskMutationJournal(next).catch((error) => {
			console.error("Taktune: failed to persist task mutation vault event", error);
			new Notice(this.t("notice.taskMutation.paused"), 15_000);
		});
	}

	persistTaskMutationJournal(journal) {
		const persist = async () => {
			await updateStoredTaskMutationJournal(
				this.taskMutationJournalBackend,
				journal.id,
				journal,
				this.taskMutationClaimId,
				this.activeTaskMutationClaimToken,
			);
		};
		const queued = (this.taskMutationJournalPersistQueue || Promise.resolve()).then(persist);
		this.taskMutationJournalPersistQueue = queued.catch(() => {});
		return queued;
	}

	async flushTaskMutationJournalPersistence() {
		await (this.taskMutationJournalPersistQueue || Promise.resolve());
	}

	taskMutationPaths() {
		return this.app.vault
			.getMarkdownFiles()
			.filter((file) => !this.isTaskPathExcluded(file.path))
			.map((file) => file.path);
	}

	async beginTaskMutation(operation) {
		if (this.taskMutationRunning || this.settings.taskMutationJournal) {
			new Notice(this.t("notice.taskMutation.busy"));
			return false;
		}
		const previousSettings = this.settings;
		const journal = createTaskMutationJournal(operation, this.taskMutationPaths());
		this.settings = { ...this.settings, taskMutationJournal: journal };
		try {
			await createStoredTaskMutationJournal(this.taskMutationJournalBackend, journal);
		} catch (error) {
			this.settings = previousSettings;
			new Notice(this.t("notice.taskMutation.intentFailed"), 10_000);
			throw error;
		}
		return this.executeTaskMutation(journal);
	}

	async resumeTaskMutation() {
		const journal = this.settings.taskMutationJournal;
		if (!journal) return true;
		new Notice(this.t("notice.taskMutation.resuming"));
		return this.executeTaskMutation(journal);
	}

	async recoverStaleTaskMutationClaimWithConfirmation() {
		const journal = this.settings.taskMutationJournal;
		if (!journal) return;
		if (!window.confirm(this.t("notice.taskMutation.recoverClaimConfirm"))) return;
		await recoverStaleTaskMutationClaim(this.taskMutationJournalBackend, journal.id);
		this.taskMutationRecoveryRequiresRestart = true;
		new Notice(this.t("notice.taskMutation.recoverClaimCompleted"));
	}

	async executeTaskMutation(journal) {
		if (this.taskMutationRecoveryRequiresRestart) {
			new Notice(this.t("notice.taskMutation.recoverClaimRestartRequired"), 15_000);
			return false;
		}
		if (this.taskMutationRunning) return false;
		this.taskMutationRunning = true;
		let journalClaimed = false;
		let journalClaimToken = "";
		const total = journal.targetPaths.length;
		const progressNotice = new Notice(
			this.t("notice.taskMutation.progress", { current: 0, total }),
			0,
		);
		try {
			await this.flushTaskMutationJournalPersistence();
			journalClaimToken = await claimTaskMutationJournal(
				this.taskMutationJournalBackend,
				journal.id,
				this.taskMutationClaimId,
			);
			this.activeTaskMutationClaimToken = journalClaimToken;
			journalClaimed = true;
			let stablePasses = 0;
			for (let pass = 0; pass < 20 && stablePasses < 2; pass += 1) {
				let activeJournal = this.settings.taskMutationJournal || journal;
				const markdownFiles = this.app.vault
					.getMarkdownFiles()
					.filter((file) => !this.isTaskPathExcluded(file.path));
				for (const file of markdownFiles) {
					activeJournal = updateTaskMutationJournalForVaultEvent(activeJournal, {
						type: "modify",
						path: file.path,
						isMarkdown: true,
					});
				}
				if (JSON.stringify(activeJournal) !== JSON.stringify(this.settings.taskMutationJournal)) {
					this.settings = { ...this.settings, taskMutationJournal: activeJournal };
					await this.persistTaskMutationJournal(activeJournal);
				}
				const existingPaths = markdownFiles.map((file) => file.path);
				const unresolved = unresolvedTaskMutationPaths(activeJournal, existingPaths);
				if (unresolved.length) {
					throw new Error(`Task mutation targets are missing: ${unresolved.join(", ")}`);
				}
				const generation = this.taskMutationGeneration || 0;
				const deleted = new Set(activeJournal.resolvedDeletedPaths || []);
				let current = 0;
				for (const path of activeJournal.targetPaths) {
					if (deleted.has(path)) continue;
					await this.flushTaskMutationJournalPersistence();
					const file = this.app.vault.getAbstractFileByPath(path);
					if (!(file instanceof TFile) || file.extension !== "md")
						throw new Error(`Task mutation target is missing: ${path}`);
					await assertTaskMutationJournalClaim(
						this.taskMutationJournalBackend,
						activeJournal.id,
						this.taskMutationClaimId,
						journalClaimToken,
					);
					await this.app.vault.process(file, (latestContent) =>
						transformTaskMutationContent(latestContent, activeJournal.operation),
					);
					current += 1;
					progressNotice.setMessage?.(
						this.t("notice.taskMutation.progress", {
							current,
							total: activeJournal.targetPaths.length - deleted.size,
						}),
					);
				}
				const finalFiles = this.app.vault
					.getMarkdownFiles()
					.filter((file) => !this.isTaskPathExcluded(file.path));
				const finalPaths = finalFiles.map((file) => file.path);
				const missingAfterPass = unresolvedTaskMutationPaths(activeJournal, finalPaths);
				if (missingAfterPass.length) {
					throw new Error(`Task mutation targets are missing: ${missingAfterPass.join(", ")}`);
				}
				let oldValueRemains = false;
				for (const file of finalFiles) {
					const content = await this.app.vault.cachedRead(file);
					if (transformTaskMutationContent(content, activeJournal.operation) !== content) {
						oldValueRemains = true;
						break;
					}
				}
				const pathsStable = finalPaths.every((path) => activeJournal.targetPaths.includes(path));
				const eventsStable = generation === (this.taskMutationGeneration || 0);
				stablePasses = !oldValueRemains && pathsStable && eventsStable ? stablePasses + 1 : 0;
			}
			if (stablePasses < 2) throw new Error("Task mutation vault did not become stable");
			const retained = this.settings;
			const finalGeneration = this.taskMutationGeneration || 0;
			await this.flushTaskMutationJournalPersistence();
			await assertTaskMutationJournalClaim(
				this.taskMutationJournalBackend,
				journal.id,
				this.taskMutationClaimId,
				journalClaimToken,
			);
			const finalized = {
				...finalizeTaskMutationSettings(this.settings, journal.operation),
				taskMutationJournal: null,
			};
			try {
				await this.queueSettingsSnapshot(settingsForPersistence(finalized));
			} catch (error) {
				this.settings = retained;
				throw error;
			}
			if (finalGeneration !== (this.taskMutationGeneration || 0)) {
				throw new Error("Task mutation vault changed during finalization");
			}
			await assertTaskMutationJournalClaim(
				this.taskMutationJournalBackend,
				journal.id,
				this.taskMutationClaimId,
				journalClaimToken,
			);
			await clearStoredTaskMutationJournal(
				this.taskMutationJournalBackend,
				journal.id,
				this.taskMutationClaimId,
				journalClaimToken,
			);
			journalClaimed = false;
			this.activeTaskMutationClaimToken = "";
			this.settings = finalized;
			progressNotice.hide?.();
			new Notice(this.t("notice.taskMutation.completed"));
			return true;
		} catch (error) {
			if (journalClaimed)
				await releaseTaskMutationJournalClaim(
					this.taskMutationJournalBackend,
					journal.id,
					this.taskMutationClaimId,
					journalClaimToken,
				).catch(() => {});
			this.activeTaskMutationClaimToken = "";
			progressNotice.hide?.();
			console.error("Taktune: task mutation paused", error);
			new Notice(this.t("notice.taskMutation.paused"), 15_000);
			return false;
		} finally {
			this.taskMutationRunning = false;
		}
	}

	async saveSettings() {
		if (hasLegacySecrets(this.settings)) this.migrateLegacySecrets();
		if (hasLegacySecrets(this.settings)) {
			throw new Error(this.t("error.secrets.migration"));
		}
		await this.queueSettingsSnapshot(settingsForPersistence(this.settings));
	}

	queueSettingsSnapshot(snapshot) {
		this.pendingSettingsSnapshot = snapshot;
		const completion = new Promise((resolve, reject) => {
			if (!this.settingsSaveWaiters) this.settingsSaveWaiters = [];
			this.settingsSaveWaiters.push({ resolve, reject });
		});
		this.queueSettingsSaveLoop();
		return completion;
	}

	queueSettingsSaveLoop() {
		if (this.settingsSavePromise || !this.pendingSettingsSnapshot) return;
		const saveLoop = this.flushSettingsSnapshots();
		this.settingsSavePromise = saveLoop;
		const finish = () => {
			if (this.settingsSavePromise === saveLoop) this.settingsSavePromise = null;
			if (this.pendingSettingsSnapshot) this.queueSettingsSaveLoop();
		};
		saveLoop.then(finish, finish);
	}

	async flushSettingsSnapshots() {
		while (this.pendingSettingsSnapshot) {
			const snapshot = this.pendingSettingsSnapshot;
			this.pendingSettingsSnapshot = null;
			const waiters = this.settingsSaveWaiters || [];
			this.settingsSaveWaiters = [];
			try {
				await this.saveData(snapshot);
				for (const waiter of waiters) waiter.resolve();
			} catch (error) {
				for (const waiter of waiters) waiter.reject(error);
			}
		}
	}

	async completeFocusSession(minutes, task, mode = "timer", seconds = minutes * 60) {
		const cutoff = addDays(localDate(), -90);
		this.settings.focusLog = [
			...(this.settings.focusLog || []).filter((entry) => entry.date >= cutoff),
			{
				date: localDate(),
				minutes,
				seconds,
				mode,
				taskKey: task?.key || "",
				title: task ? cleanDescription(task.raw) : "",
			},
		];
		await this.saveSettings();
	}

	async createReviewNote({
		start,
		end,
		completed,
		focusMinutes,
		carryovers = [],
		carryoverContexts = {},
		reflection = {},
	}) {
		const folder = this.settings.reviewDirectory;
		if (!this.app.vault.getAbstractFileByPath(folder)) await this.ensureVaultDirectory(folder);
		const achievements = completed.length
			? completed
					.map(
						(task) =>
							`- [x] ${cleanDescription(task.raw)}${reviewSourceSuffix(task)} ✅ ${task.doneDate}`,
					)
					.join("\n")
			: `- ${this.t("reviewNote.noCompleted")}`;
		const reasonLabels = Object.fromEntries(
			["capacity", "blocked", "scope", "priority", "unclear"].map((reason) => [
				reason,
				this.t(`reviewNote.reason.${reason}`),
			]),
		);
		const carryoverLines = carryovers.length
			? carryovers
					.map(
						(task) =>
							`- [ ] ${cleanDescription(task.raw)}${reviewSourceSuffix(task)} — ${carryoverContexts[task.key] ? `${carryoverContexts[task.key]} / ` : ""}${reasonLabels[reflection.carryoverReasons?.[task.key]] || this.t("reviewNote.reason.unset")}`,
					)
					.join("\n")
			: `- ${this.t("reviewNote.noCarryovers")}`;
		const bullets = (value, checkbox = false) => {
			const lines = String(value || "")
				.split("\n")
				.map((line) => line.trim())
				.filter(Boolean);
			return lines.length
				? lines.map((line) => `${checkbox ? "- [ ]" : "-"} ${line}`).join("\n")
				: `- ${this.t("reviewNote.blank")}`;
		};
		const content = `# ${end} ${this.t("reviewNote.title")}\n\n${this.t("reviewNote.period")}: ${start}–${end}\n\n## ${this.t("reviewNote.achievements")}\n\n${achievements}\n\n## ${this.t("reviewNote.focus")}\n\n- ${this.t("common.minutes", { count: focusMinutes })}\n\n## ${this.t("reviewNote.carryovers")}\n\n${carryoverLines}\n\n## ${this.t("reviewNote.wins")}\n\n${bullets(reflection.wins)}\n\n## ${this.t("reviewNote.friction")}\n\n${bullets(reflection.friction)}\n\n## ${this.t("reviewNote.lessons")}\n\n${bullets(reflection.lessons)}\n\n## ${this.t("reviewNote.next")}\n\n${bullets(reflection.next, true)}\n`;
		const prefix = normalizePath(`${folder}/${end}`);
		const path = `${prefix}.md`;
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing) {
			const saved =
				typeof this.app.vault.cachedRead === "function"
					? await this.app.vault.cachedRead(existing)
					: await this.app.vault.read(existing);
			if (saved !== content) await this.app.vault.modify(existing, content);
			return path;
		}
		const created = await this.app.vault.create(path, content);
		this.updateCollectionIndex("create", created);
		return path;
	}

	async importExternalItem(item) {
		this.externalImportPromises ||= new Map();
		if (this.externalImportPromises.has(item.externalId))
			return this.externalImportPromises.get(item.externalId);
		const operation = (async () => {
			const state = this.settings.externalItemState || { imported: {}, dismissed: {} };
			const referenceTag = externalReferenceTag(item.externalId);
			const existing = referenceTag
				? (await this.collectTasks()).find((task) => task.tags?.includes(referenceTag))
				: null;
			const key =
				existing?.key ||
				(await this.addTask(item.title, item.due || "", externalTaskMetadata(item)));
			if (!key) throw new Error(this.t("error.external.save"));
			this.settings.externalItemState = markExternalItemState(state, item.externalId, "imported");
			try {
				await this.saveSettings();
			} catch (error) {
				this.settings.externalItemState = state;
				throw error;
			}
			return key;
		})();
		this.externalImportPromises.set(item.externalId, operation);
		try {
			return await operation;
		} finally {
			this.externalImportPromises.delete(item.externalId);
		}
	}

	async dismissExternalItem(item) {
		const state = this.settings.externalItemState || { imported: {}, dismissed: {} };
		this.settings.externalItemState = markExternalItemState(state, item.externalId, "dismissed");
		try {
			await this.saveSettings();
		} catch (error) {
			this.settings.externalItemState = state;
			throw error;
		}
	}

	async loadExternalItems(
		calendarDate = localDate(),
		calendarDays = 1,
		{ shouldWriteCalendarCache = () => true } = {},
	) {
		const result = { calendar: [], linear: [], jira: [], slack: [], errors: {} };
		const jobs = [
			[
				"calendar",
				(signal) =>
					this.loadCalendar(calendarDate, calendarDays, {
						signal,
						shouldWriteCache: shouldWriteCalendarCache,
					}),
			],
			["linear", () => this.loadLinear()],
			["jira", () => this.loadJira()],
			["slack", () => this.loadSlackBookmarks()],
		];
		await Promise.all(
			jobs.map(async ([name, load]) => {
				try {
					const loaded = await loadWithDeadline(load, {
						label: name,
						timeoutMessage: this.t("error.external.timeout", {
							seconds: Math.ceil(EXTERNAL_SOURCE_TIMEOUT_MS / 1000),
						}),
					});
					if (name === "calendar") {
						result[name] = loaded.items;
						if (loaded.errors.length)
							result.errors.calendar = this.t("error.external.partialCalendar", {
								error: loaded.errors.join(" / "),
							});
					} else result[name] = loaded;
				} catch (error) {
					result.errors[name] = this.t("error.external.load", { name, error: error.message });
				}
			}),
		);
		return result;
	}

	async readGoogleCalendarCache() {
		const adapter = this.app.vault.adapter;
		const path = normalizePath(`${this.settings.dataDirectory}/google-calendar-cache.json`);
		if (!(await adapter.exists(path))) return null;
		try {
			const value = JSON.parse(await adapter.read(path));
			return value?.version === 1 && Array.isArray(value.items) ? value : null;
		} catch (error) {
			console.error("Taktune: failed to read Google Calendar cache", error);
			return null;
		}
	}

	async loadCalendar(calendarDate, calendarDays = 1) {
		const sources = [];
		let mobileCache = null;
		if (this.settings.googleCalendarEnabled) {
			const ids = selectedCalendarIds(this.settings);
			mobileCache = await this.readGoogleCalendarCache();
			sources.push({
				kind: "google-cache",
				label: "Google Calendar",
				load: async () => {
					if (!googleCalendarCacheAge(mobileCache).available)
						throw new Error(this.t("error.calendarCache.missing"));
					if (
						!googleCalendarCacheCovers(
							mobileCache,
							calendarDate,
							addDays(calendarDate, calendarDays),
						)
					)
						throw new Error(this.t("error.calendarCache.rangeMissing"));
					const age = googleCalendarCacheAge(mobileCache);
					const suffix = this.t(age.stale ? "calendarCache.stale" : "calendarCache.synced", {
						hours: age.hours,
					});
					return googleCalendarCacheForRange(
						mobileCache,
						ids,
						calendarDate,
						addDays(calendarDate, calendarDays),
					).map((item) => ({
						...item,
						calendarName: `${item.calendarName || "Google Calendar"}（${suffix}）`,
					}));
				},
			});
		}
		sources.push(
			...(this.settings.calendarSubscriptions || [])
				.filter((item) => item.enabled !== false && item.url)
				.map((item) => ({
					kind: "ics",
					label: item.name || "ICS",
					load: () =>
						this.loadSubscribedCalendar(item, calendarDate, addDays(calendarDate, calendarDays)),
				})),
		);
		const results = await Promise.allSettled(
			sources.map((source) =>
				loadWithDeadline(source.load, {
					label: source.label,
					timeoutMessage: this.t("error.external.timeout", {
						seconds: Math.ceil(EXTERNAL_SOURCE_TIMEOUT_MS / 1000),
					}),
				}),
			),
		);
		const settled = settledCalendarGroups(sources, results, domainT);
		if (settled.errors.length && settled.items.length === 0)
			throw new Error(settled.errors.join(" / "));
		if (mobileCache && googleCalendarCacheAge(mobileCache).stale)
			settled.errors.push(
				this.t("error.calendarCache.stale", { hours: googleCalendarCacheAge(mobileCache).hours }),
			);
		return settled;
	}

	async loadSubscribedCalendar(subscription, rangeStart, rangeEnd) {
		const url = subscription.url.replace(/^webcal:\/\//iu, "https://");
		const response = await requestUrl({ url, method: "GET", throw: false });
		if (response.status >= 400)
			throw new Error(`${subscription.name || "ICS"}: HTTP ${response.status}`);
		return parseIcsCalendar(response.text, subscription, rangeStart, rangeEnd);
	}

	async listGoogleCalendars() {
		const cache = await this.readGoogleCalendarCache();
		const calendars = new Map();
		for (const item of cache?.items || []) {
			if (!item.calendarId || calendars.has(item.calendarId)) continue;
			calendars.set(item.calendarId, {
				id: item.calendarId,
				name: item.calendarName || item.calendarId,
				color: item.color || "",
			});
		}
		return [...calendars.values()];
	}

	async loadLinear() {
		const linearApiKey = this.integrationSecret("linear");
		if (!linearApiKey) return [];
		const query = `query DashboardIssues { viewer { assignedIssues(first: 100, filter: { state: { type: { nin: ["completed", "canceled"] } } }) { nodes { identifier title url dueDate priority state { name } } } } }`;
		const response = await requestUrl({
			url: "https://api.linear.app/graphql",
			method: "POST",
			headers: { Authorization: linearApiKey, "Content-Type": "application/json" },
			body: JSON.stringify({ query }),
			throw: false,
		});
		if (response.status >= 400 || response.json.errors)
			throw new Error(response.json.errors?.[0]?.message || `HTTP ${response.status}`);
		return linearIssues(response.json.data.viewer.assignedIssues.nodes);
	}

	async loadJira() {
		const { jiraBaseUrl, jiraEmail } = this.settings;
		const jiraApiToken = this.integrationSecret("jira");
		if (!jiraBaseUrl || !jiraEmail || !jiraApiToken) return [];
		const base = jiraBaseUrl.replace(/\/$/u, "");
		const params = new URLSearchParams({
			jql: "assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC",
			maxResults: "100",
			fields: "summary,status,duedate,priority",
		});
		const response = await requestUrl({
			url: `${base}/rest/api/3/search/jql?${params.toString()}`,
			headers: {
				Authorization: `Basic ${encodeBase64Utf8(`${jiraEmail}:${jiraApiToken}`)}`,
				Accept: "application/json",
			},
			throw: false,
		});
		if (response.status >= 400) throw new Error(`HTTP ${response.status}`);
		return jiraIssues(response.json.issues, base);
	}

	async loadSlackBookmarks() {
		const token = this.integrationSecret("slack");
		const channelIds = this.settings.slackBookmarkChannelIds || [];
		if (!token || !channelIds.length) return [];
		const groups = await Promise.all(
			channelIds.map(async (channelId) => {
				const response = await requestUrl({
					url: `https://slack.com/api/bookmarks.list?channel_id=${encodeURIComponent(channelId)}`,
					headers: { Authorization: `Bearer ${token}` },
					throw: false,
				});
				if (response.status >= 400 || !response.json.ok)
					throw new Error(response.json.error || `HTTP ${response.status}`);
				return slackBookmarks(response.json.bookmarks, channelId);
			}),
		);
		return groups.flat();
	}
};

class TaktuneSettingTab extends PluginSettingTab {
	constructor(app, plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("ttd-settings-tab");
		const intro = containerEl.createDiv({
			cls: "mb-5 border-b border-[var(--background-modifier-border)] pb-4",
		});
		intro.createEl("h2", { text: "Taktune", cls: "mb-1 mt-0 text-xl tracking-[-0.02em]" });
		intro.createEl("p", {
			text: this.plugin.t("settings.intro"),
			cls: "m-0 text-xs text-[var(--text-muted)]",
		});
		const createSection = (title, description) => {
			const section = containerEl.createEl("section", {
				cls: "mb-4 overflow-hidden rounded-lg border border-[var(--background-modifier-border)] bg-[var(--background-primary)]",
			});
			const header = section.createDiv({
				cls: "border-b border-[var(--background-modifier-border)] bg-[var(--background-secondary-alt)] px-4 py-3",
			});
			header.createEl("h3", { text: title, cls: "m-0 text-sm font-semibold" });
			if (description)
				header.createEl("p", {
					text: description,
					cls: "mb-0 mt-1 text-[11px] text-[var(--text-muted)]",
				});
			return section.createDiv({
				cls: "px-4 py-1 max-[700px]:px-3 max-[700px]:[&_.setting-item]:items-start max-[700px]:[&_.setting-item]:flex-col max-[700px]:[&_.setting-item-control]:mt-2 max-[700px]:[&_.setting-item-control]:w-full max-[700px]:[&_.setting-item-control]:flex-wrap max-[700px]:[&_.setting-item-control_input]:min-w-0 max-[700px]:[&_.setting-item-control_input]:flex-1",
			});
		};

		const languageSection = createSection(
			this.plugin.t("settings.language.section"),
			this.plugin.t("settings.language.description"),
		);
		new Setting(languageSection)
			.setName(this.plugin.t("settings.language.name"))
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						system: this.plugin.t("settings.language.system"),
						en: this.plugin.t("settings.language.english"),
						ja: this.plugin.t("settings.language.japanese"),
					})
					.setValue(this.plugin.settings.locale || DEFAULT_SETTINGS.locale)
					.onChange(async (value) => {
						this.plugin.settings.locale = value;
						this.plugin.setLocale(value);
						await this.plugin.saveSettings();
						for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE))
							await leaf.view?.render?.();
						this.display();
					}),
			);

		const storageSection = createSection(
			this.plugin.t("settings.storage.section"),
			this.plugin.t("settings.storage.description"),
		);
		const storage = this.plugin.taskStorage();
		new Setting(storageSection).setName(this.plugin.t("settings.storage.inbox")).addText((text) =>
			text.setValue(storage.inboxPath).onChange(async (value) => {
				this.plugin.settings.inboxPath = value.trim();
				await this.plugin.saveSettings();
			}),
		);
		new Setting(storageSection).setName(this.plugin.t("settings.storage.trash")).addText((text) =>
			text.setValue(storage.trashPath).onChange(async (value) => {
				this.plugin.settings.trashPath = value.trim();
				await this.plugin.saveSettings();
			}),
		);
		new Setting(storageSection)
			.setName(this.plugin.t("settings.storage.excluded"))
			.setDesc(this.plugin.t("settings.storage.excludedDescription"))
			.addText((text) =>
				text.setValue(storage.excludedTaskPathFragments.join(", ")).onChange(async (value) => {
					this.plugin.settings.excludedTaskPathFragments = [
						...new Set(
							value
								.split(",")
								.map((item) => item.trim())
								.filter(Boolean),
						),
					];
					await this.plugin.saveSettings();
				}),
			);
		new Setting(storageSection).setName(this.plugin.t("settings.storage.reviews")).addText((text) =>
			text.setValue(this.plugin.settings.reviewDirectory).onChange(async (value) => {
				this.plugin.settings.reviewDirectory = value.trim();
				await this.plugin.saveSettings();
			}),
		);
		new Setting(storageSection)
			.setName(this.plugin.t("settings.storage.data"))
			.setDesc(this.plugin.t("settings.storage.dataDescription"))
			.addText((text) =>
				text.setValue(this.plugin.settings.dataDirectory).onChange(async (value) => {
					this.plugin.settings.dataDirectory = value.trim();
					await this.plugin.saveSettings();
				}),
			);
		new Setting(storageSection)
			.setName(this.plugin.t("settings.storage.backups"))
			.setDesc(this.plugin.t("settings.storage.backupsDescription"))
			.addText((text) =>
				text.setValue(this.plugin.settings.settingsBackupDirectory).onChange(async (value) => {
					this.plugin.settings.settingsBackupDirectory = value.trim();
					await this.plugin.saveSettings();
				}),
			);
		new Setting(storageSection)
			.setName(this.plugin.t("settings.storage.dashboardNote"))
			.setDesc(this.plugin.t("settings.storage.dashboardNoteDescription"))
			.addText((text) =>
				text.setValue(this.plugin.settings.dashboardNotePath).onChange(async (value) => {
					this.plugin.settings.dashboardNotePath = value.trim();
					await this.plugin.saveSettings();
				}),
			);

		const displaySection = createSection(
			this.plugin.t("settings.display.section"),
			this.plugin.t("settings.display.description"),
		);
		new Setting(displaySection)
			.setName(this.plugin.t("settings.focusMode.name"))
			.setDesc(this.plugin.t("settings.focusMode.description"))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.collapseObsidianSidebars).onChange(async (value) => {
					this.plugin.settings.collapseObsidianSidebars = value;
					await this.plugin.saveSettings();
					this.plugin.syncWorkspaceFocus(this.app.workspace.activeLeaf);
				}),
			);

		const safetySection = createSection(
			this.plugin.t("settings.safety.section"),
			this.plugin.t("settings.safety.description"),
		);
		new Setting(safetySection)
			.setName(this.plugin.t("settings.safety.restore"))
			.setDesc(this.plugin.t("settings.safety.restoreDescription"))
			.addButton((button) =>
				button
					.setButtonText(this.plugin.t("settings.safety.restoreButton"))
					.setWarning()
					.onClick(async () => {
						button.setDisabled(true);
						try {
							await this.plugin.restoreSettingsBackupWithConfirmation();
						} finally {
							button.setDisabled(false);
						}
					}),
			);

		const defaultsSection = createSection(
			this.plugin.t("settings.defaults.section"),
			this.plugin.t("settings.defaults.description"),
		);
		const defaults = {
			...DEFAULT_SETTINGS.taskDefaults,
			...this.plugin.settings.taskDefaults,
		};
		const saveDefault = async (key, value) => {
			this.plugin.settings.taskDefaults = {
				...defaults,
				...this.plugin.settings.taskDefaults,
				[key]: value,
			};
			await this.plugin.saveSettings();
		};
		new Setting(defaultsSection)
			.setName(this.plugin.t("settings.defaults.due"))
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						none: this.plugin.t("settings.defaults.none"),
						today: this.plugin.t("nav.today"),
						tomorrow: this.plugin.t("nav.tomorrow"),
					})
					.setValue(defaults.dueMode)
					.onChange((value) => saveDefault("dueMode", value)),
			);
		new Setting(defaultsSection)
			.setName(this.plugin.t("settings.defaults.list"))
			.setDesc(this.plugin.t("settings.defaults.listDescription"))
			.addText((text) =>
				text
					.setPlaceholder("Inbox")
					.setValue(defaults.list)
					.onChange((value) => saveDefault("list", value.trim())),
			);
		new Setting(defaultsSection)
			.setName(this.plugin.t("settings.defaults.priority"))
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						3: this.plugin.t("taskEdit.priority.high"),
						2: this.plugin.t("taskEdit.priority.medium"),
						1: this.plugin.t("taskEdit.priority.normal"),
						0: this.plugin.t("taskEdit.priority.low"),
					})
					.setValue(String(defaults.priority))
					.onChange((value) => saveDefault("priority", Number(value))),
			);
		new Setting(defaultsSection)
			.setName(this.plugin.t("settings.defaults.reminderTime"))
			.setDesc(this.plugin.t("settings.defaults.reminderDescription"))
			.addText((text) => {
				text.inputEl.type = "time";
				text
					.setValue(defaults.reminderTime)
					.onChange((value) => saveDefault("reminderTime", value));
			});

		const statusSection = createSection(
			this.plugin.t("settings.status.section"),
			this.plugin.t("settings.status.description"),
		);
		this.plugin.statuses().forEach((status, index, statuses) => {
			new Setting(statusSection)
				.setName(
					index === 0
						? this.plugin.t("settings.status.default", { name: status.name })
						: status.name,
				)
				.setDesc(`ID: ${status.id}`)
				.addText((text) =>
					text.setValue(status.name).onChange(async (value) => {
						if (!value.trim()) return;
						await this.plugin.saveStatus({ ...status, name: value.trim() });
					}),
				)
				.addColorPicker((picker) =>
					picker.setValue(status.color).onChange(async (value) => {
						await this.plugin.saveStatus({ ...status, color: value });
					}),
				)
				.addButton((button) =>
					button
						.setButtonText("↑")
						.setTooltip(this.plugin.t("common.moveUp"))
						.setDisabled(index <= 1)
						.onClick(async () => {
							await this.plugin.moveStatus(status.id, -1);
							this.display();
						}),
				)
				.addButton((button) =>
					button
						.setButtonText("↓")
						.setTooltip(this.plugin.t("common.moveDown"))
						.setDisabled(index === 0 || index === statuses.length - 1)
						.onClick(async () => {
							await this.plugin.moveStatus(status.id, 1);
							this.display();
						}),
				)
				.addButton((button) =>
					button
						.setButtonText(this.plugin.t("common.delete"))
						.setWarning()
						.setDisabled(statuses.length <= 1)
						.onClick(async () => {
							if (
								!window.confirm(
									this.plugin.t("settings.status.deleteConfirm", { name: status.name }),
								)
							)
								return;
							await this.plugin.deleteStatus(status.id);
							this.display();
						}),
				);
		});
		new Setting(statusSection).setName(this.plugin.t("settings.status.add")).addButton((button) =>
			button
				.setButtonText(this.plugin.t("common.add"))
				.setCta()
				.onClick(() => {
					new NameModal(
						this.app,
						this.plugin.t("settings.status.add"),
						this.plugin.t("settings.status.placeholder"),
						async (name) => {
							const base =
								name
									.trim()
									.toLowerCase()
									.replace(/[^\p{L}\p{N}_-]+/gu, "-")
									.replace(/^-|-$/gu, "") || `status-${Date.now()}`;
							const existing = new Set(this.plugin.statuses().map((status) => status.id));
							let id = base;
							let suffix = 2;
							while (existing.has(id)) {
								id = `${base}-${suffix}`;
								suffix += 1;
							}
							await this.plugin.saveStatus({ id, name: name.trim(), color: "#8b929d" });
							this.display();
						},
					).open();
				}),
		);

		const templateSection = createSection(
			this.plugin.t("settings.templates.section"),
			this.plugin.t("settings.templates.description"),
		);
		if (!(this.plugin.settings.taskTemplates || []).length)
			templateSection.createEl("p", {
				text: this.plugin.t("settings.templates.empty"),
				cls: "my-3 text-[11px] text-[var(--text-muted)]",
			});
		const templateSearch = templateSection.createEl("input", {
			cls: "my-2 h-8 w-full text-[11px]",
			attr: {
				type: "search",
				placeholder: this.plugin.t("settings.templates.searchPlaceholder"),
				"aria-label": this.plugin.t("settings.templates.search"),
			},
		});
		const templateList = templateSection.createDiv();
		const renderTemplateSettings = () => {
			templateList.empty();
			const all = this.plugin.settings.taskTemplates || [];
			const visible = filterTaskTemplates(all, templateSearch.value);
			if (!visible.length && all.length)
				templateList.createEl("p", {
					text: this.plugin.t("settings.templates.noMatch"),
					cls: "setting-item-description",
				});
			for (const template of visible) {
				const index = all.findIndex((item) => item.id === template.id);
				const setting = new Setting(templateList)
					.setName(template.name)
					.setDesc(template.description)
					.addButton((button) =>
						button
							.setButtonText("↑")
							.setTooltip(this.plugin.t("common.moveUp"))
							.setDisabled(index === 0)
							.onClick(async () => {
								await this.plugin.moveTaskTemplate(template.id, -1);
								renderTemplateSettings();
							}),
					)
					.addButton((button) =>
						button
							.setButtonText("↓")
							.setTooltip(this.plugin.t("common.moveDown"))
							.setDisabled(index === all.length - 1)
							.onClick(async () => {
								await this.plugin.moveTaskTemplate(template.id, 1);
								renderTemplateSettings();
							}),
					)
					.addButton((button) =>
						button
							.setButtonText(this.plugin.t("common.delete"))
							.setWarning()
							.onClick(async () => {
								if (
									!window.confirm(
										this.plugin.t("settings.templates.deleteConfirm", { name: template.name }),
									)
								)
									return;
								await this.plugin.deleteTaskTemplate(template.id);
								renderTemplateSettings();
							}),
					);
				setting.settingEl.addClasses([
					"ttd-template-setting",
					"relative",
					"cursor-grab",
					"[&.is-dragging]:opacity-45",
					"[&.is-drop-before]:before:absolute",
					"[&.is-drop-before]:before:inset-x-0",
					"[&.is-drop-before]:before:-top-px",
					"[&.is-drop-before]:before:z-[2]",
					"[&.is-drop-before]:before:h-0.5",
					"[&.is-drop-before]:before:bg-[var(--interactive-accent)]",
					"[&.is-drop-before]:before:content-['']",
					"[&.is-drop-after]:after:absolute",
					"[&.is-drop-after]:after:inset-x-0",
					"[&.is-drop-after]:after:-bottom-px",
					"[&.is-drop-after]:after:z-[2]",
					"[&.is-drop-after]:after:h-0.5",
					"[&.is-drop-after]:after:bg-[var(--interactive-accent)]",
					"[&.is-drop-after]:after:content-['']",
				]);
				setting.settingEl.setAttr("draggable", "true");
				setting.settingEl.addEventListener("dragstart", (event) => {
					event.dataTransfer.effectAllowed = "move";
					event.dataTransfer.setData("application/x-ttd-template", template.id);
					setting.settingEl.addClass("is-dragging");
				});
				setting.settingEl.addEventListener("dragover", (event) => {
					if (!event.dataTransfer.types.includes("application/x-ttd-template")) return;
					event.preventDefault();
					const after =
						event.clientY >=
						setting.settingEl.getBoundingClientRect().top +
							setting.settingEl.getBoundingClientRect().height / 2;
					setting.settingEl.toggleClass("is-drop-before", !after);
					setting.settingEl.toggleClass("is-drop-after", after);
				});
				setting.settingEl.addEventListener("dragleave", () =>
					setting.settingEl.removeClasses(["is-drop-before", "is-drop-after"]),
				);
				setting.settingEl.addEventListener("drop", async (event) => {
					event.preventDefault();
					const sourceId = event.dataTransfer.getData("application/x-ttd-template");
					const after = setting.settingEl.hasClass("is-drop-after");
					await this.plugin.reorderTaskTemplate(sourceId, template.id, after);
					renderTemplateSettings();
				});
				setting.settingEl.addEventListener("dragend", () => renderTemplateSettings());
			}
		};
		templateSearch.addEventListener("input", renderTemplateSettings);
		renderTemplateSettings();

		const integrationsSection = createSection(
			this.plugin.t("settings.integrations.section"),
			this.plugin.t("settings.integrations.description"),
		);

		integrationsSection.createEl("h4", {
			text: this.plugin.t("settings.integrations.calendar"),
			cls: "mb-0 mt-3 text-xs font-semibold text-[var(--text-muted)]",
		});
		new Setting(integrationsSection)
			.setName(this.plugin.t("settings.integrations.google"))
			.setDesc(this.plugin.t("settings.integrations.googleDescription"))
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.googleCalendarEnabled).onChange(async (value) => {
					this.plugin.settings.googleCalendarEnabled = value;
					await this.plugin.saveSettings();
				}),
			);
		new Setting(integrationsSection)
			.setName(this.plugin.t("settings.integrations.calendarId"))
			.setDesc(this.plugin.t("settings.integrations.calendarIdDescription"))
			.addText((text) =>
				text.setValue(this.plugin.settings.googleCalendarId).onChange(async (value) => {
					this.plugin.settings.googleCalendarId = value.trim() || "primary";
					await this.plugin.saveSettings();
				}),
			);
		new Setting(integrationsSection)
			.setName(this.plugin.t("settings.integrations.subscriptions"))
			.setDesc(this.plugin.t("settings.integrations.subscriptionsDescription"))
			.addButton((button) =>
				button
					.setButtonText(
						this.plugin.t("settings.integrations.manage", {
							count: (this.plugin.settings.calendarSubscriptions || []).length,
						}),
					)
					.onClick(() => {
						new CalendarSubscriptionsModal(
							this.app,
							this.plugin.settings.calendarSubscriptions || [],
							async (values) => {
								this.plugin.settings.calendarSubscriptions = values;
								await this.plugin.saveSettings();
								this.display();
							},
						).open();
					}),
			);
		integrationsSection.createEl("h4", {
			text: this.plugin.t("settings.integrations.issuesBookmarks"),
			cls: "mb-0 mt-4 text-xs font-semibold text-[var(--text-muted)]",
		});
		new Setting(integrationsSection)
			.setName(this.plugin.t("settings.integrations.linearKey"))
			.setDesc(this.plugin.t("settings.integrations.localSecret"))
			.addComponent((element) =>
				new SecretComponent(this.app, element)
					.setValue(this.plugin.settings.linearSecretId)
					.onChange(async (value) => {
						this.plugin.settings.linearSecretId = value || DEFAULT_SETTINGS.linearSecretId;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(integrationsSection)
			.setName(this.plugin.t("settings.integrations.jiraUrl"))
			.setDesc(this.plugin.t("settings.integrations.jiraUrlDescription"))
			.addText((text) =>
				text.setValue(this.plugin.settings.jiraBaseUrl).onChange(async (value) => {
					this.plugin.settings.jiraBaseUrl = value.trim();
					await this.plugin.saveSettings();
				}),
			);
		new Setting(integrationsSection)
			.setName(this.plugin.t("settings.integrations.jiraEmail"))
			.addText((text) =>
				text.setValue(this.plugin.settings.jiraEmail).onChange(async (value) => {
					this.plugin.settings.jiraEmail = value.trim();
					await this.plugin.saveSettings();
				}),
			);
		new Setting(integrationsSection)
			.setName(this.plugin.t("settings.integrations.jiraToken"))
			.setDesc(this.plugin.t("settings.integrations.localSecret"))
			.addComponent((element) =>
				new SecretComponent(this.app, element)
					.setValue(this.plugin.settings.jiraSecretId)
					.onChange(async (value) => {
						this.plugin.settings.jiraSecretId = value || DEFAULT_SETTINGS.jiraSecretId;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(integrationsSection)
			.setName(this.plugin.t("settings.integrations.slackToken"))
			.setDesc(this.plugin.t("settings.integrations.slackTokenDescription"))
			.addComponent((element) =>
				new SecretComponent(this.app, element)
					.setValue(this.plugin.settings.slackSecretId)
					.onChange(async (value) => {
						this.plugin.settings.slackSecretId = value || DEFAULT_SETTINGS.slackSecretId;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(integrationsSection)
			.setName(this.plugin.t("settings.integrations.slackChannels"))
			.setDesc(this.plugin.t("settings.integrations.slackChannelsDescription"))
			.addText((text) =>
				text
					.setPlaceholder("C01234567, C07654321")
					.setValue((this.plugin.settings.slackBookmarkChannelIds || []).join(", "))
					.onChange(async (value) => {
						this.plugin.settings.slackBookmarkChannelIds = [
							...new Set(
								value
									.split(/[,、\s]+/u)
									.map((item) => item.trim())
									.filter(Boolean),
							),
						];
						await this.plugin.saveSettings();
					}),
			);
		new Setting(integrationsSection)
			.setName(this.plugin.t("settings.integrations.diagnostics"))
			.setDesc(this.plugin.t("settings.integrations.diagnosticsDescription"))
			.addButton((button) =>
				button
					.setButtonText(this.plugin.t("settings.integrations.check"))
					.setCta()
					.onClick(async () => {
						button.setDisabled(true).setButtonText(this.plugin.t("settings.integrations.checking"));
						try {
							await this.plugin.testIntegrations();
						} finally {
							button.setDisabled(false).setButtonText(this.plugin.t("settings.integrations.check"));
						}
					}),
			);

		const supportSection = createSection(
			this.plugin.t("settings.support.section"),
			this.plugin.t("settings.support.description"),
		);
		const addSupportLink = (name, description, label, href) => {
			const setting = new Setting(supportSection).setName(name).setDesc(description);
			setting.controlEl.createEl("a", {
				text: label,
				href,
				cls: "mod-cta",
				attr: { target: "_blank", rel: "noopener noreferrer" },
			});
		};
		addSupportLink(
			this.plugin.t("settings.support.donate"),
			this.plugin.t("settings.support.donateDescription"),
			this.plugin.t("settings.support.donate"),
			"https://github.com/sponsors/ryo-ebata",
		);
		addSupportLink(
			this.plugin.t("settings.support.issues"),
			this.plugin.t("settings.support.issuesDescription"),
			this.plugin.t("settings.support.issues"),
			"https://github.com/Chazutsu/taktune/issues",
		);
	}
}

// Pure helpers are exposed for the local regression test without affecting Obsidian's plugin entry point.
module.exports.__test = {
	TaktuneView,
	nextRepeatDate,
	isValidRepeat,
	expandRecurringTasks,
	habitLogMap,
	habitValue,
	isHabitScheduled,
	focusLogStats,
	focusElapsedSeconds,
	countdownNextDate,
	countdownStatus,
	countdownMatchesDate,
	parseIcsCalendar,
	weekStart,
	completedTaskCount,
	weeklyPlanReview,
	reviewPeriodSnapshot,
	reviewMetricComparison,
	reviewPlanComparison,
	weeklyReviewPrompt,
	weeklyReviewSnoozeUntil,
	previousReviewFocus,
	reviewFocusProgress,
	diagnosticsReport,
	copyTextToClipboard,
	isReminderDue,
	progressFor,
	cleanDescription,
	encodeBase64Utf8,
	externalReferenceTag,
	externalTaskMetadata,
	externalSourceLabel,
	externalItemStateForTasks,
	environmentDiagnostics,
	settledCalendarGroups,
	calendarPlanningState,
	planTrayVisibleTasks,
	sortPlanTrayTasks,
	resolveReviewFocusTaskKey,
	emptyReviewDraft,
	requiredReviewFocusItems,
	remindersOf,
	moveTimeBlockToDate,
	timelineMinutesFromOffset,
	calendarDropSchedule,
	batchScheduleSlots,
	taskLineWithTime,
	calendarCacheKey,
	googleCalendarCacheForRange,
	googleCalendarCacheAge,
	googleCalendarCacheCovers,
	calendarTaskColor,
	calendarSpan,
	calendarRange,
	calendarRequestParams,
	calendarItemDates,
	matchesCalendarQuery,
	calendarBlockLayout,
	calendarConflictLabel,
	calendarActivityItems,
	addMonths,
	monthGridDates,
	selectedCalendarIds,
	isValidTimeZone,
	calendarTimeZoneLabel,
	calendarTimeZones,
	rewriteSubtaskRaw,
	reorderSubtaskBlocks,
	attachmentMarkdown,
	attachmentsOf,
	removeAttachmentToken,
	taskBlockRange,
	normalizeTaskBlock,
	nestTaskBlock,
	moveTaskBlock,
	taskRecordFromLine,
	taskTemporalMetadata,
	taskTimeBucket,
	filterTaskTemplates,
	reorderItemsById,
	moveItemById,
	describeTaskChange,
	noteItemBlockRange,
	timeBlockOf,
	taskOccursOnDate,
	taskTimeSegment,
	shiftTimeBlockToDate,
	parseQuickTask,
	offsetReminder,
	quickTaskPreview,
	statusDefinitions,
	migrateSettings,
	markExternalItemState,
	pendingExternalItems,
	hasLegacySecrets,
	settingsBackup,
	settingsForPersistence,
	settingsFromBackup,
	SETTINGS_SCHEMA_VERSION,
	EXTERNAL_ITEM_STATE_LIMIT,
};
module.exports.__test.reviewMetricComparison = reviewMetricComparison;
module.exports.__test.reviewPlanComparison = reviewPlanComparison;
module.exports.__test.calendarTrayStartsCollapsed = calendarTrayStartsCollapsed;
module.exports.__test.resolveTaskLine = resolveTaskLine;
module.exports.__test.taskFocusIdentity = taskFocusIdentity;
