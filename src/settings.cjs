const SETTINGS_SCHEMA_VERSION = 13;
const { validateTaskMutationJournal } = require("./task-mutation-domain.cjs");
const EXTERNAL_ITEM_STATE_LIMIT = 1000;
const BUILTIN_STATUSES = [
	{ id: "todo", name: "", color: "#8b929d" },
	{ id: "doing", name: "", color: "#4772fa" },
	{ id: "waiting", name: "", color: "#d49735" },
];
const LEGACY_BUILTIN_STATUS_NAMES = {
	todo: new Set(["未着手", "Not started"]),
	doing: new Set(["進行中", "In progress"]),
	waiting: new Set(["待機", "Waiting"]),
};

const DEFAULT_SETTINGS = {
	settingsVersion: SETTINGS_SCHEMA_VERSION,
	locale: "en",
	inboxPath: "Taktune/Inbox.md",
	trashPath: "Taktune/Trash.md",
	reviewDirectory: "Taktune/Reviews",
	dataDirectory: "Taktune/.data",
	settingsBackupDirectory: "Taktune/.data",
	dashboardNotePath: "Taktune/TODO.md",
	excludedTaskPathFragments: ["/archive/"],
	googleCalendarEnabled: true,
	collapseObsidianSidebars: true,
	gwsExecutable: "",
	googleCalendarId: "primary",
	googleCalendarIds: [],
	googleCalendarMeta: {},
	calendarSubscriptions: [],
	linearApiKey: "",
	linearSecretId: "ticktick-dashboard-linear",
	jiraBaseUrl: "",
	jiraEmail: "",
	jiraApiToken: "",
	jiraSecretId: "ticktick-dashboard-jira",
	slackToken: "",
	slackSecretId: "ticktick-dashboard-slack",
	slackBookmarkChannelIds: [],
	externalItemState: { imported: {}, dismissed: {} },
	lists: [],
	tags: [],
	smartFilters: [],
	statuses: BUILTIN_STATUSES,
	focusState: {
		mode: "timer",
		duration: 1500,
		remaining: 1500,
		elapsed: 0,
		running: false,
		endAt: null,
		startedAt: null,
		taskKey: "",
	},
	focusLog: [],
	lastReview: null,
	reviewDraft: {
		wins: "",
		friction: "",
		lessons: "",
		next: "",
		carryoverReasons: {},
		focusTaskKeys: {},
	},
	reviewPromptSnoozedUntil: "",
	taskTemplates: [],
	habits: [],
	habitLog: {},
	countdowns: [],
	sections: {},
	sortMode: "smart",
	groupMode: "auto",
	sidebarSections: {
		statuses: false,
		planning: false,
		organize: false,
		history: false,
		filters: false,
		lists: false,
		tags: false,
	},
	taxonomyMeta: { list: {}, tag: {} },
	calendarListFilter: [],
	calendarColorMode: "list",
	calendarShowCompleted: false,
	calendarDensity: "comfortable",
	calendarShowDetails: true,
	calendarShowEvents: true,
	calendarShowHabits: true,
	calendarShowFocus: true,
	calendarShowFutureRepeats: true,
	calendarShowTasks: true,
	calendarTimeZones: [],
	reminderState: { lastCheck: null, snoozes: {}, dismissed: {} },
	taskDefaults: { dueMode: "none", list: "", priority: 1, reminderTime: "" },
	taskMutationJournal: null,
};

const LEGACY_SECRET_KEYS = ["linearApiKey", "jiraApiToken", "slackToken"];
const LEGACY_PATH_DEFAULTS = {
	inboxPath: "private/tasks/TODO Inbox.md",
	trashPath: "private/tasks/TickTick Trash.md",
	reviewDirectory: "private/reviews",
	dataDirectory: "private/.ticktick-dashboard",
	settingsBackupDirectory: "",
	dashboardNotePath: "private/TODO.md",
};

function isPlainObject(value) {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringArray(value) {
	return Array.isArray(value)
		? value.filter((item) => typeof item === "string" && item.length > 0)
		: [];
}

function vaultFilePath(value, fallback) {
	const path = String(value || "")
		.trim()
		.replace(/^\/+|\/+$/gu, "")
		.replace(/\/{2,}/gu, "/");
	return path && path.toLowerCase().endsWith(".md") ? path : fallback;
}

function vaultDirectoryPath(value, fallback) {
	const path = String(value || "")
		.trim()
		.replace(/^\/+|\/+$/gu, "")
		.replace(/\/{2,}/gu, "/");
	return path || fallback;
}

function taskStorageSettings(settings = {}, defaults = DEFAULT_SETTINGS) {
	return {
		inboxPath: vaultFilePath(settings.inboxPath, defaults.inboxPath),
		trashPath: vaultFilePath(settings.trashPath, defaults.trashPath),
		excludedTaskPathFragments: Array.isArray(settings.excludedTaskPathFragments)
			? [
					...new Set(
						settings.excludedTaskPathFragments.map((item) => String(item).trim()).filter(Boolean),
					),
				]
			: [...DEFAULT_SETTINGS.excludedTaskPathFragments],
	};
}

function isTaskPathExcluded(path, settings = {}) {
	return taskStorageSettings(settings).excludedTaskPathFragments.some((fragment) =>
		String(path).includes(fragment),
	);
}

function nestedRecord(value) {
	if (!isPlainObject(value)) return {};
	return Object.fromEntries(
		Object.entries(value)
			.filter(([, item]) => isPlainObject(item))
			.map(([key, item]) => [String(key), { ...item }]),
	);
}

function sectionsRecord(value) {
	if (!isPlainObject(value)) return {};
	return Object.fromEntries(
		Object.entries(value)
			.filter(([, items]) => Array.isArray(items))
			.map(([list, items]) => [String(list), stringArray(items)]),
	);
}

function settingsBackup(stored = {}, createdAt = new Date().toISOString()) {
	const settings = settingsForPersistence(stored);
	return {
		format: "ticktick-dashboard-settings-backup",
		createdAt,
		settingsVersion: Number(stored?.settingsVersion) || 0,
		settings,
	};
}

function hasLegacySecrets(settings = {}) {
	return LEGACY_SECRET_KEYS.some(
		(key) => typeof settings?.[key] === "string" && settings[key].length > 0,
	);
}

function settingsForPersistence(settings = {}) {
	const persisted = isPlainObject(settings) ? JSON.parse(JSON.stringify(settings)) : {};
	for (const key of LEGACY_SECRET_KEYS) delete persisted[key];
	delete persisted.taskMutationJournal;
	return persisted;
}

function settingsFromBackup(value) {
	if (
		!isPlainObject(value) ||
		value.format !== "ticktick-dashboard-settings-backup" ||
		!isPlainObject(value.settings)
	)
		throw new Error("The settings backup format is invalid");
	return value.settings;
}

function newestEntries(values, limit = EXTERNAL_ITEM_STATE_LIMIT) {
	return Object.fromEntries(
		Object.entries(isPlainObject(values) ? values : {})
			.toSorted(([, left], [, right]) => String(right || "").localeCompare(String(left || "")))
			.slice(0, limit),
	);
}

function statusDefinitions(settings = {}) {
	const values =
		Array.isArray(settings.statuses) && settings.statuses.length
			? settings.statuses
			: BUILTIN_STATUSES;
	return values.map((item, index) => {
		const id = String(item.id || `status-${index + 1}`)
			.replace(/[^\p{L}\p{N}_-]/gu, "-")
			.toLowerCase();
		const candidate = String(item.name || "").trim();
		return {
			id,
			name: LEGACY_BUILTIN_STATUS_NAMES[id]?.has(candidate) ? "" : candidate,
			color: item.color || "#8b929d",
		};
	});
}

function reviewDraft(value) {
	const source = isPlainObject(value) ? value : {};
	const reasons = isPlainObject(source.carryoverReasons) ? source.carryoverReasons : {};
	const focusTaskKeys = isPlainObject(source.focusTaskKeys) ? source.focusTaskKeys : {};
	return {
		wins: String(source.wins || ""),
		friction: String(source.friction || ""),
		lessons: String(source.lessons || ""),
		next: String(source.next || ""),
		carryoverReasons: Object.fromEntries(
			Object.entries(reasons)
				.map(([key, reason]) => [String(key), String(reason)])
				.filter(([key, reason]) => key && reason)
				.slice(0, 100),
		),
		focusTaskKeys: Object.fromEntries(
			Object.entries(focusTaskKeys)
				.map(([title, key]) => [String(title).trim(), String(key).trim()])
				.filter(([title, key]) => title && key && title.length <= 500 && key.length <= 2048)
				.slice(0, 100),
		),
	};
}

function safeCount(candidate) {
	return Math.max(0, Math.floor(Number(candidate) || 0));
}

function reviewMetrics(value) {
	const source = isPlainObject(value) ? value : {};
	return {
		completed: safeCount(source.completed),
		focusMinutes: safeCount(source.focusMinutes),
		planned: safeCount(source.planned),
		planCompleted: safeCount(source.planCompleted),
	};
}

function sidebarSections(value) {
	const source = isPlainObject(value) ? value : {};
	const legacyTools = source.tools === true;
	return Object.fromEntries(
		Object.keys(DEFAULT_SETTINGS.sidebarSections).map((key) => [
			key,
			(key === "organize" || key === "history") && !(key in source)
				? legacyTools
				: source[key] === true,
		]),
	);
}

function reviewFocusIds(value, items) {
	const source = isPlainObject(value) ? value : {};
	return Object.fromEntries(
		items
			.map((title) => [title, String(source[title] || "")])
			.filter(([, id]) => /^[a-z0-9-]{8,}$/u.test(id)),
	);
}

function migrateSettings(stored = {}) {
	const source = isPlainObject(stored) ? stored : {};
	const existingInstall = Object.keys(source).length > 0;
	const pathDefaults = existingInstall ? LEGACY_PATH_DEFAULTS : DEFAULT_SETTINGS;
	const locale = ["system", "en", "ja"].includes(source.locale)
		? source.locale
		: Object.keys(source).length > 0
			? "ja"
			: DEFAULT_SETTINGS.locale;
	return {
		...DEFAULT_SETTINGS,
		...source,
		settingsVersion: SETTINGS_SCHEMA_VERSION,
		locale,
		...taskStorageSettings(source, pathDefaults),
		reviewDirectory: vaultDirectoryPath(source.reviewDirectory, pathDefaults.reviewDirectory),
		dataDirectory: vaultDirectoryPath(source.dataDirectory, pathDefaults.dataDirectory),
		settingsBackupDirectory:
			source.settingsBackupDirectory === ""
				? ""
				: vaultDirectoryPath(source.settingsBackupDirectory, pathDefaults.settingsBackupDirectory),
		dashboardNotePath: vaultFilePath(source.dashboardNotePath, pathDefaults.dashboardNotePath),
		collapseObsidianSidebars: source.collapseObsidianSidebars !== false,
		gwsExecutable: typeof source.gwsExecutable === "string" ? source.gwsExecutable : "",
		googleCalendarIds: stringArray(source.googleCalendarIds),
		googleCalendarMeta: nestedRecord(source.googleCalendarMeta),
		calendarSubscriptions: Array.isArray(source.calendarSubscriptions)
			? source.calendarSubscriptions.map((item) => (isPlainObject(item) ? { ...item } : item))
			: [],
		slackBookmarkChannelIds: stringArray(source.slackBookmarkChannelIds),
		lists: stringArray(source.lists),
		tags: stringArray(source.tags),
		smartFilters: Array.isArray(source.smartFilters) ? source.smartFilters : [],
		focusLog: Array.isArray(source.focusLog) ? source.focusLog : [],
		lastReview: isPlainObject(source.lastReview)
			? (() => {
					const next = Array.isArray(source.lastReview.next)
						? source.lastReview.next.map(String).filter(Boolean).slice(0, 3)
						: [];
					const focusIds = reviewFocusIds(source.lastReview.focusIds, next);
					return {
						date: String(source.lastReview.date || ""),
						next,
						...(Object.keys(focusIds).length ? { focusIds } : {}),
						...(isPlainObject(source.lastReview.metrics)
							? { metrics: reviewMetrics(source.lastReview.metrics) }
							: {}),
					};
				})()
			: null,
		reviewDraft: reviewDraft(source.reviewDraft),
		reviewPromptSnoozedUntil:
			typeof source.reviewPromptSnoozedUntil === "string" ? source.reviewPromptSnoozedUntil : "",
		taskTemplates: Array.isArray(source.taskTemplates) ? source.taskTemplates : [],
		habits: Array.isArray(source.habits) ? source.habits : [],
		habitLog: nestedRecord(source.habitLog),
		countdowns: Array.isArray(source.countdowns) ? source.countdowns : [],
		sections: sectionsRecord(source.sections),
		statuses: statusDefinitions(source),
		sidebarSections: sidebarSections(source.sidebarSections),
		calendarListFilter: stringArray(source.calendarListFilter),
		calendarTimeZones: stringArray(source.calendarTimeZones),
		focusState: {
			...DEFAULT_SETTINGS.focusState,
			...(isPlainObject(source.focusState) ? source.focusState : {}),
		},
		taxonomyMeta: {
			list: { ...(isPlainObject(source.taxonomyMeta?.list) ? source.taxonomyMeta.list : {}) },
			tag: { ...(isPlainObject(source.taxonomyMeta?.tag) ? source.taxonomyMeta.tag : {}) },
		},
		reminderState: {
			...DEFAULT_SETTINGS.reminderState,
			...(isPlainObject(source.reminderState) ? source.reminderState : {}),
			snoozes: {
				...(isPlainObject(source.reminderState?.snoozes) ? source.reminderState.snoozes : {}),
			},
			dismissed: {
				...(isPlainObject(source.reminderState?.dismissed) ? source.reminderState.dismissed : {}),
			},
		},
		taskDefaults: {
			...DEFAULT_SETTINGS.taskDefaults,
			...(isPlainObject(source.taskDefaults) ? source.taskDefaults : {}),
		},
		taskMutationJournal: validateTaskMutationJournal(source.taskMutationJournal),
		externalItemState: {
			imported: newestEntries(source.externalItemState?.imported),
			dismissed: newestEntries(source.externalItemState?.dismissed),
		},
	};
}

function markExternalItemState(state, externalId, outcome, timestamp = new Date().toISOString()) {
	const imported = { ...(isPlainObject(state?.imported) ? state.imported : {}) };
	const dismissed = { ...(isPlainObject(state?.dismissed) ? state.dismissed : {}) };
	if (outcome === "imported") {
		imported[externalId] = timestamp;
		delete dismissed[externalId];
	} else {
		dismissed[externalId] = timestamp;
		delete imported[externalId];
	}
	return { imported: newestEntries(imported), dismissed: newestEntries(dismissed) };
}

function pendingExternalItems(external = {}, state = {}, limit = Infinity) {
	const items = [...(external.linear || []), ...(external.jira || []), ...(external.slack || [])];
	return items
		.filter(
			(item) =>
				item.externalId &&
				!state.imported?.[item.externalId] &&
				!state.dismissed?.[item.externalId],
		)
		.slice(0, limit);
}

module.exports = {
	BUILTIN_STATUSES,
	DEFAULT_SETTINGS,
	EXTERNAL_ITEM_STATE_LIMIT,
	SETTINGS_SCHEMA_VERSION,
	hasLegacySecrets,
	markExternalItemState,
	migrateSettings,
	pendingExternalItems,
	reviewDraft,
	settingsBackup,
	settingsForPersistence,
	settingsFromBackup,
	statusDefinitions,
	taskStorageSettings,
	isTaskPathExcluded,
};
