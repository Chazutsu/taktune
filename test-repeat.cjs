const assert = require("node:assert/strict");
const Module = require("node:module");
if (process.env.TTD_SIMULATE_MOBILE === "1") globalThis.Buffer = undefined;
class StubTFile {
  constructor(path = "") { this.path = path; }
}
let requestUrlMock = async () => ({});

const originalLoad = Module._load;
Module._load = (request, parent, isMain) => {
  if (process.env.TTD_SIMULATE_MOBILE === "1" && request === "node:child_process") throw new Error("Node.js process APIs are unavailable on mobile");
  if (request !== "obsidian") return originalLoad(request, parent, isMain);
  class Empty {}
  return {
    ItemView: Empty,
    MarkdownRenderer: {},
    Modal: Empty,
    Notice: Empty,
    Platform: { isMobileApp: process.env.TTD_SIMULATE_MOBILE === "1" },
    Plugin: Empty,
    PluginSettingTab: Empty,
    SecretComponent: Empty,
    Setting: Empty,
    TFile: StubTFile,
    normalizePath: (value) => value,
    requestUrl: (...args) => requestUrlMock(...args),
    setIcon: () => {},
  };
};

const TaktunePlugin = require(process.argv[2] || "./main.js");
const { createTranslator } = require("./src/i18n.cjs");
TaktunePlugin.prototype.t = createTranslator("ja");
const { TaktuneView, nextRepeatDate, isValidRepeat, expandRecurringTasks, habitLogMap, habitValue, isHabitScheduled, focusLogStats, focusElapsedSeconds, countdownNextDate, countdownStatus, countdownMatchesDate, parseIcsCalendar, weekStart, completedTaskCount, weeklyPlanReview, reviewPeriodSnapshot, reviewMetricComparison, reviewPlanComparison, weeklyReviewPrompt, weeklyReviewSnoozeUntil, previousReviewFocus, reviewFocusProgress, diagnosticsReport, isReminderDue, progressFor, cleanDescription, encodeBase64Utf8, externalReferenceTag, externalTaskMetadata, externalSourceLabel, externalItemStateForTasks, environmentDiagnostics, gwsExecutableCandidates, settledCalendarGroups, calendarPlanningState, planTrayVisibleTasks, sortPlanTrayTasks, resolveReviewFocusTaskKey, emptyReviewDraft, requiredReviewFocusItems, remindersOf, moveTimeBlockToDate, timelineMinutesFromOffset, calendarDropSchedule, batchScheduleSlots, calendarCacheKey, mergeGoogleCalendarCache, googleCalendarCacheForRange, googleCalendarCacheAge, googleCalendarCacheCovers, calendarTaskColor, calendarSpan, calendarRange, calendarRequestParams, calendarItemDates, matchesCalendarQuery, calendarBlockLayout, calendarConflictLabel, calendarActivityItems, addMonths, monthGridDates, selectedCalendarIds, isValidTimeZone, calendarTimeZoneLabel, calendarTimeZones, rewriteSubtaskRaw, reorderSubtaskBlocks, attachmentMarkdown, attachmentsOf, removeAttachmentToken, taskBlockRange, normalizeTaskBlock, nestTaskBlock, moveTaskBlock, taskRecordFromLine, taskTemporalMetadata, taskTimeBucket, filterTaskTemplates, reorderItemsById, moveItemById, describeTaskChange, noteItemBlockRange, timeBlockOf, taskOccursOnDate, taskTimeSegment, shiftTimeBlockToDate, parseQuickTask, offsetReminder, quickTaskPreview, statusDefinitions, migrateSettings, markExternalItemState, pendingExternalItems, hasLegacySecrets, settingsBackup, settingsForPersistence, settingsFromBackup, SETTINGS_SCHEMA_VERSION, EXTERNAL_ITEM_STATE_LIMIT } = TaktunePlugin.__test;
assert.equal(TaktunePlugin.__test.calendarTrayStartsCollapsed(390), true);
assert.equal(TaktunePlugin.__test.calendarTrayStartsCollapsed(720), true);
assert.equal(TaktunePlugin.__test.calendarTrayStartsCollapsed(721), false);
assert.equal(encodeBase64Utf8("user@example.com:token"), "dXNlckBleGFtcGxlLmNvbTp0b2tlbg==");
assert.equal(encodeBase64Utf8("江端:秘密"), "5rGf56uvOuenmOWvhg==");
assert.equal(externalReferenceTag("linear:PPR-123"), "external/linear/PPR-123");
assert.deepEqual(externalTaskMetadata({
  externalId: "linear:PPR-123",
  labels: ["source:linear", "status:In Progress"],
  url: "https://linear.app/example/PPR-123",
  meta: "進行中 · 期限 2026-10-12",
}), {
  list: "External",
  tags: ["source-linear", "status-In-Progress", "external/linear/PPR-123"],
  note: "[Open in source](https://linear.app/example/PPR-123)\n進行中 · 期限 2026-10-12",
});
assert.equal(externalSourceLabel({ tags: ["status-In-Progress", "external/linear/PPR-123"] }), "Linear");
const mobileDiagnostics = environmentDiagnostics({
  inboxPresent: false,
  isMobile: true,
  nodeSupport: false,
  notificationPermission: "denied",
  secretStorage: false,
  settingsVersion: SETTINGS_SCHEMA_VERSION,
  statusCount: 0,
  performanceSnapshot: { taskCount: 20, noteCount: 3, scanMs: 120, totalMs: 1_200 },
});
assert.equal(mobileDiagnostics.find((item) => item.id === "settings").level, "ok");
assert.match(mobileDiagnostics.find((item) => item.id === "inbox").repair, /first task/u);
assert.match(mobileDiagnostics.find((item) => item.id === "node").repair, /ICS/u);
assert.equal(mobileDiagnostics.find((item) => item.id === "secrets").level, "error");
assert.match(mobileDiagnostics.find((item) => item.id === "notifications").repair, /device settings/u);
assert.equal(mobileDiagnostics.find((item) => item.id === "performance").level, "error");
assert.match(mobileDiagnostics.find((item) => item.id === "performance").detail, /render 1200ms/u);
const mobileDiagnosticsWithFreshCalendar = environmentDiagnostics({
  googleCalendarEnabled: true,
  googleCalendarCache: { version: 1, updatedAt: new Date().toISOString(), items: [{ eventId: "event-1" }] },
  inboxPresent: true,
  isMobile: true,
  nodeSupport: false,
  notificationPermission: "granted",
  secretStorage: true,
  settingsVersion: SETTINGS_SCHEMA_VERSION,
  statusCount: 1,
});
assert.equal(mobileDiagnosticsWithFreshCalendar.find((item) => item.id === "node").repair, "");
assert.equal(mobileDiagnosticsWithFreshCalendar.find((item) => item.id === "calendar-cache").level, "ok");
assert.match(mobileDiagnosticsWithFreshCalendar.find((item) => item.id === "calendar-cache").detail, /1 events/u);
const mobileDiagnosticsWithoutCalendarCache = environmentDiagnostics({
  googleCalendarEnabled: true,
  googleCalendarCache: null,
  inboxPresent: true,
  isMobile: true,
  nodeSupport: false,
  notificationPermission: "granted",
  secretStorage: true,
  settingsVersion: SETTINGS_SCHEMA_VERSION,
  statusCount: 1,
});
assert.equal(mobileDiagnosticsWithoutCalendarCache.find((item) => item.id === "calendar-cache").level, "error");
assert.match(mobileDiagnosticsWithoutCalendarCache.find((item) => item.id === "calendar-cache").repair, /desktop/u);
const mobileReport = diagnosticsReport({ version: "0.1.0", platform: "Mobile", vault: "blog", integrations: ["Google configured"], items: mobileDiagnosticsWithFreshCalendar });
assert.match(mobileReport, /Vault: blog/u);
assert.match(mobileReport, /Mobile event cache: 1 events/u);
assert.doesNotMatch(mobileReport, /api[_ -]?key|token/iu);
assert.deepEqual(gwsExecutableCandidates("/custom/gws", "/Users/test", "/resolved/gws"), [
  "/resolved/gws",
  "/custom/gws",
  "/Users/test/.volta/bin/gws",
  "/Users/test/.local/bin/gws",
  "/opt/homebrew/bin/gws",
  "/usr/local/bin/gws",
  "gws",
]);
assert.deepEqual(gwsExecutableCandidates("gws", "", ""), ["gws", "/opt/homebrew/bin/gws", "/usr/local/bin/gws"]);
assert.equal(weeklyReviewPrompt(null, "2026-10-08", ""), null);
assert.match(weeklyReviewPrompt(null, "2026-10-09", "").detail, /first review/u);
assert.equal(weeklyReviewPrompt({ date: "2026-10-03" }, "2026-10-09", ""), null);
assert.equal(weeklyReviewPrompt({ date: "2026-10-02" }, "2026-10-09", "").daysSince, 7);
assert.equal(weeklyReviewPrompt({ date: "2026-10-01" }, "2026-10-09", "2026-10-15"), null);
assert.equal(weeklyReviewSnoozeUntil("2026-10-09"), "2026-10-15");
assert.equal(weeklyReviewSnoozeUntil("2026-10-10"), "2026-10-15");
assert.equal(completedTaskCount([
  { done: true, doneDate: "2026-10-02" },
  { done: true, doneDate: "2026-10-03" },
  { done: true, doneDate: "2026-10-09" },
  { done: true, doneDate: "2026-10-10" },
  { done: false, doneDate: "2026-10-08" },
  { done: true, doneDate: "2026-10-08", parentKey: "parent" },
  { done: true, doneDate: "2026-10-08", wontDo: true },
  { done: true, doneDate: "2026-10-08", isVirtualOccurrence: true },
  {},
], "2026-10-03", "2026-10-09"), 2);
assert.deepEqual(previousReviewFocus({ date: "2026-10-02", next: [" 配布を安定させる ", "レビューを返す", "", "四件目"] }), { date: "2026-10-02", ids: {}, items: ["配布を安定させる", "レビューを返す", "四件目"] });
assert.equal(previousReviewFocus({ date: "2026-10-02", next: [] }), null);
assert.equal(reviewFocusProgress({ date: "2026-10-02", ids: { "配布する": "focus-original1" }, items: ["配布する"] }, [{ id: "focus-another22", title: "配布する", doneDate: "2026-10-08", scheduled: true }]).items[0].label, "Not created");
const planReview = weeklyPlanReview([
  { key: "done", done: true, timeBlock: { date: "2026-10-05", endDate: "2026-10-05" } },
  { key: "missed", done: false, timeBlock: { date: "2026-10-08", endDate: "2026-10-08" } },
  { key: "spanning", done: false, timeBlock: { date: "2026-10-01", endDate: "2026-10-04" } },
  { key: "outside", done: false, timeBlock: { date: "2026-09-30", endDate: "2026-09-30" } },
  { key: "child", done: false, parentKey: "parent", timeBlock: { date: "2026-10-06" } },
  { key: "wont", done: false, wontDo: true, timeBlock: { date: "2026-10-06" } },
], "2026-10-03", "2026-10-09");
assert.deepEqual(planReview.planned.map((task) => task.key), ["done", "missed", "spanning"]);
assert.deepEqual(planReview.completed.map((task) => task.key), ["done"]);
assert.deepEqual(planReview.missed.map((task) => task.key), ["missed", "spanning"]);
assert.equal(planReview.rate, 33);
assert.equal(weeklyPlanReview([], "2026-10-03", "2026-10-09").rate, null);
const lateCompletionReview = weeklyPlanReview([
  { key: "completed-later", done: true, doneDate: "2026-10-10", timeBlock: { date: "2026-10-05", endDate: "2026-10-05" } },
  { key: "completed-inside", done: true, doneDate: "2026-10-09", timeBlock: { date: "2026-10-06", endDate: "2026-10-06" } },
], "2026-10-03", "2026-10-09");
assert.deepEqual(lateCompletionReview.completed.map((task) => task.key), ["completed-inside"]);
assert.deepEqual(lateCompletionReview.missed.map((task) => task.key), ["completed-later"]);
assert.equal(lateCompletionReview.rate, 50);
const crowdedCarryovers = reviewPeriodSnapshot([
  ...Array.from({ length: 12 }, (_, index) => ({
    key: `scheduled-${String(index).padStart(2, "0")}`,
    done: false,
    due: "",
    priority: 1,
    timeBlock: { date: "2026-10-05", endDate: "2026-10-05" },
  })),
  { key: "overdue-high", done: false, due: "2026-10-02", priority: 3 },
  { key: "both-medium", done: false, due: "2026-10-01", priority: 2, timeBlock: { date: "2026-10-06", endDate: "2026-10-06" } },
], [], "2026-10-09");
assert.deepEqual(crowdedCarryovers.carryovers.slice(0, 2).map((task) => task.key), ["both-medium", "overdue-high"]);
assert.equal(crowdedCarryovers.carryovers.length, 12);
assert.equal(crowdedCarryovers.carryoverOverflowCount, 2);
assert.deepEqual(crowdedCarryovers.carryoverOverflow.map((task) => task.key), ["scheduled-10", "scheduled-11"]);
assert.equal(crowdedCarryovers.carryoverContexts["both-medium"], "Scheduled and overdue");
assert.equal(crowdedCarryovers.carryoverContexts["overdue-high"], "Overdue");
const conflictTask = { kind: "task", startMinutes: 600, endMinutes: 660 };
const conflictEvent = { kind: "event", startMinutes: 630, endMinutes: 690 };
const conflictOtherTask = { kind: "task", startMinutes: 645, endMinutes: 675 };
assert.equal(calendarConflictLabel(conflictTask, [conflictTask, conflictEvent]), "Overlaps an event");
assert.equal(calendarConflictLabel(conflictTask, [conflictTask, conflictOtherTask]), "Overlaps another task");
assert.equal(calendarConflictLabel(conflictTask, [conflictTask, conflictEvent, conflictOtherTask]), "Overlaps an event and another task");
assert.equal(calendarConflictLabel(conflictTask, [conflictTask, { kind: "event", startMinutes: 660, endMinutes: 720 }]), "");
const sanitizedBackup = settingsBackup({ settingsVersion: 2, lists: ["仕事"], linearApiKey: "linear-secret", jiraApiToken: "jira-secret", slackToken: "slack-secret" }, "2026-10-09T00:00:00.000Z");
assert.equal(sanitizedBackup.createdAt, "2026-10-09T00:00:00.000Z");
assert.deepEqual(sanitizedBackup.settings.lists, ["仕事"]);
assert.equal(sanitizedBackup.settings.linearApiKey, undefined);
assert.equal(sanitizedBackup.settings.jiraApiToken, undefined);
assert.equal(sanitizedBackup.settings.slackToken, undefined);
assert.equal(hasLegacySecrets({ linearApiKey: "linear-secret" }), true);
assert.equal(hasLegacySecrets(settingsForPersistence({ linearApiKey: "linear-secret", jiraApiToken: "jira-secret", slackToken: "slack-secret", jiraEmail: "user@example.com" })), false);
assert.deepEqual(settingsForPersistence({ linearApiKey: "linear-secret", jiraApiToken: "jira-secret", slackToken: "slack-secret", jiraEmail: "user@example.com" }), { jiraEmail: "user@example.com" });
assert.deepEqual(settingsFromBackup(sanitizedBackup).lists, ["仕事"]);
assert.throws(() => settingsFromBackup({ settings: {} }), /format is invalid/u);
assert.deepEqual(settledCalendarGroups(
  [{ label: "仕事" }, { label: "共有ICS" }],
  [{ status: "fulfilled", value: [{ title: "朝会" }] }, { status: "rejected", reason: new Error("HTTP 403") }],
), { items: [{ title: "朝会" }], errors: ["共有ICS: HTTP 403"] });
const plannedTask = calendarPlanningState("private/tasks/TODO Inbox.md:3", "2026-10-12", "2026-10-09");
assert.equal(plannedTask.filter, "calendar");
assert.equal(plannedTask.mode, "day");
assert.equal(plannedTask.date, "2026-10-12");
assert.deepEqual([...plannedTask.selectedTaskKeys], ["private/tasks/TODO Inbox.md:3"]);
assert.equal(plannedTask.selectionMode, true);
const missingPlannedTask = calendarPlanningState(undefined, "", "2026-10-09");
assert.equal(missingPlannedTask.date, "2026-10-09");
assert.deepEqual([...missingPlannedTask.selectedTaskKeys], []);
assert.equal(missingPlannedTask.selectionMode, false);
const overduePlannedTask = calendarPlanningState("private/tasks/Inbox.md:4", "2026-10-01", "2026-10-09");
assert.equal(overduePlannedTask.date, "2026-10-09");
assert.deepEqual([...overduePlannedTask.selectedTaskKeys], ["private/tasks/Inbox.md:4"]);
assert.equal(calendarPlanningState("private/tasks/Inbox.md:5", "invalid", "2026-10-09").date, "2026-10-09");
assert.equal(calendarPlanningState("private/tasks/Inbox.md:6", "2026-99-99", "2026-10-09").date, "2026-10-09");
const scheduledTask = calendarPlanningState("private/tasks/Plan.md:8", "2026-10-11", "2026-10-09", true);
assert.equal(scheduledTask.date, "2026-10-11");
assert.deepEqual([...scheduledTask.selectedTaskKeys], []);
assert.equal(scheduledTask.selectionMode, false);
assert.equal(calendarPlanningState("private/tasks/Plan.md:9", "2026-10-01", "2026-10-09", true).date, "2026-10-01");
const filteredPlanningTasks = [
  { key: "explicit", raw: "請求書を確認する", list: "個人", tags: [], path: "private/tasks/personal.md" },
  { key: "matching", raw: "リリース計画", list: "仕事", tags: ["release"], path: "private/tasks/work.md" },
  { key: "hidden", raw: "買い物", list: "個人", tags: [], path: "private/tasks/personal.md" },
];
assert.deepEqual(
  planTrayVisibleTasks(filteredPlanningTasks, ["仕事"], "release", new Set(["explicit"])).map((task) => task.key),
  ["explicit", "matching"],
);
const sortedPlanningTasks = sortPlanTrayTasks([
  { key: "high", raw: "高優先度", priority: 3, due: "2026-10-12" },
  { key: "selected-late", raw: "選択した期限後のタスク", priority: 0, due: "2026-12-31" },
  { key: "medium", raw: "中優先度", priority: 2, due: "2026-10-11" },
], "priority", new Set(["selected-late"]));
assert.deepEqual(sortedPlanningTasks.map((task) => task.key), ["selected-late", "high", "medium"]);
const plannerView = Object.create(TaktuneView.prototype);
plannerView.calendarTrayCollapsed = true;
plannerView.openTaskInPlanner("private/tasks/TODO Inbox.md:3", "2026-10-12");
assert.equal(plannerView.filter, "calendar");
assert.equal(plannerView.calendarTrayCollapsed, false);
assert.deepEqual([...plannerView.calendarSelectedTaskKeys], ["private/tasks/TODO Inbox.md:3"]);
plannerView.calendarTrayCollapsed = true;
plannerView.openTaskInPlanner("private/tasks/Plan.md:8", "2026-10-11", true);
assert.equal(plannerView.calendarTrayCollapsed, true);
assert.deepEqual([...plannerView.calendarSelectedTaskKeys], []);
const serverRenderView = Object.create(TaktuneView.prototype);
serverRenderView.render = () => {};
serverRenderView.renderInProgress = false;
assert.doesNotThrow(() => serverRenderView.scheduleRender());
assert.notEqual(serverRenderView.renderTimer, undefined);
globalThis.clearTimeout(serverRenderView.renderTimer);
assert.equal(reviewMetricComparison(3, 2, "件"), "Previous 2件 · +1件");
assert.equal(reviewMetricComparison(90, 120, "分"), "Previous 120分 · -30分");
assert.equal(reviewMetricComparison(2, 2, "件"), "Previous 2件 · ±0件");
assert.equal(reviewPlanComparison(2, 3, 1, 4), "Previous 25% · +42pt");
assert.equal(reviewPlanComparison(0, 0, 1, 4), "Previous 25% · no plan this time");
assert.equal(reviewPlanComparison(1, 2, 0, 0), "No previous plan · current 50%");
assert.equal(reviewPlanComparison(0, 0, 0, 0), "No plan in either period");
const firstReviewDraft = emptyReviewDraft();
const secondReviewDraft = emptyReviewDraft();
firstReviewDraft.carryoverReasons.task = "blocked";
firstReviewDraft.focusTaskKeys["同名タスク"] = "path:1";
assert.deepEqual(secondReviewDraft, { wins: "", friction: "", lessons: "", next: "", carryoverReasons: {}, focusTaskKeys: {} });
assert.throws(() => requiredReviewFocusItems(" \n "), /at least one priority/u);
assert.deepEqual(requiredReviewFocusItems(" 配布を安定させる \nレビューを返す\n配布を安定させる"), ["配布を安定させる", "レビューを返す"]);

const migratedSettings = migrateSettings({
  settingsVersion: 1,
  lists: "broken",
  statuses: [{ id: "Review Ready", name: "レビュー待ち", color: "#123456" }],
  reminderState: { lastCheck: "2026-10-09", snoozes: { a: "later" } },
  taxonomyMeta: { list: { Work: { color: "red" } } },
  taskDefaults: { list: "Work" },
  lastReview: { date: "2026-10-02", next: ["一", "二", "三", "四", ""], focusIds: { "一": "focus-12345678", "二": "invalid", "四": "focus-ignored123" }, metrics: { completed: 3.8, focusMinutes: "90", planned: -2, planCompleted: "broken" } },
  sidebarSections: { tools: true, lists: "yes", unknown: true },
  reviewDraft: {
    wins: "前倒しできた",
    lessons: 42,
    next: "配布を安定させる",
    carryoverReasons: { "task-1": "blocked", "": "capacity", "task-2": "" },
    focusTaskKeys: { " 同名タスク ": " private/tasks/Plan.md:8 ", "": "empty-title", "空キー": "", "長すぎる": "x".repeat(2049) },
  },
  externalItemState: { imported: { "linear:1": "2026-10-09T01:00:00.000Z" } },
  futureSetting: "preserve-me",
});
assert.equal(migratedSettings.settingsVersion, SETTINGS_SCHEMA_VERSION);
assert.equal(migratedSettings.gwsExecutable, "");
assert.deepEqual(migratedSettings.lists, []);
assert.deepEqual(migratedSettings.statuses, [{ id: "review-ready", name: "レビュー待ち", color: "#123456" }]);
assert.deepEqual(migratedSettings.reminderState.snoozes, { a: "later" });
assert.deepEqual(migratedSettings.reminderState.dismissed, {});
assert.equal(migratedSettings.taskDefaults.list, "Work");
assert.equal(migratedSettings.taskDefaults.priority, 1);
assert.deepEqual(migratedSettings.lastReview, { date: "2026-10-02", next: ["一", "二", "三"], focusIds: { "一": "focus-12345678" }, metrics: { completed: 3, focusMinutes: 90, planned: 0, planCompleted: 0 } });
assert.deepEqual(migratedSettings.sidebarSections, { statuses: false, planning: false, organize: true, history: true, filters: false, lists: false, tags: false });
assert.equal(Object.hasOwn(migratedSettings.sidebarSections, "tools"), false);
assert.deepEqual(migratedSettings.reviewDraft, {
  wins: "前倒しできた",
  friction: "",
  lessons: "42",
  next: "配布を安定させる",
  carryoverReasons: { "task-1": "blocked" },
  focusTaskKeys: { "同名タスク": "private/tasks/Plan.md:8" },
});
assert.equal(migratedSettings.taxonomyMeta.list.Work.color, "red");
assert.equal(migratedSettings.futureSetting, "preserve-me");
const importedState = markExternalItemState({ dismissed: { "linear:1": "old" } }, "linear:1", "imported", "2026-10-09T02:00:00.000Z");
assert.deepEqual(importedState, { imported: { "linear:1": "2026-10-09T02:00:00.000Z" }, dismissed: {} });
const oversizedState = {};
for (let index = 0; index < EXTERNAL_ITEM_STATE_LIMIT + 5; index += 1) oversizedState[`item:${index}`] = new Date(index * 1000).toISOString();
const boundedState = markExternalItemState({ imported: oversizedState }, "latest", "imported", "2099-01-01T00:00:00.000Z");
assert.equal(Object.keys(boundedState.imported).length, EXTERNAL_ITEM_STATE_LIMIT);
assert.equal(boundedState.imported.latest, "2099-01-01T00:00:00.000Z");
const externalFixture = {
  linear: [{ externalId: "linear:1" }, { externalId: "linear:2" }],
  jira: [{ externalId: "jira:1" }],
  slack: [{ externalId: "slack:1" }, { title: "IDなし" }],
};
assert.deepEqual(pendingExternalItems(externalFixture, {
  imported: { "linear:1": "done" },
  dismissed: { "jira:1": "ignored" },
}).map((item) => item.externalId), ["linear:2", "slack:1"]);
assert.deepEqual(pendingExternalItems(externalFixture, {}, 2).map((item) => item.externalId), ["linear:1", "linear:2"]);

assert.equal(nextRepeatDate("2026-10-09", "every monday,wednesday,friday"), "2026-10-12");
assert.equal(nextRepeatDate("2026-10-12", "every monday,wednesday,friday"), "2026-10-14");
assert.equal(nextRepeatDate("2026-01-31", "every month on day 15"), "2026-02-15");
assert.equal(nextRepeatDate("2026-01-31", "every month on last day"), "2026-02-28");
assert.equal(nextRepeatDate("2026-01-01", "every month on first monday"), "2026-02-02");
assert.equal(nextRepeatDate("2026-01-01", "every month on last friday"), "2026-02-27");
assert.equal(nextRepeatDate("2026-01-31", "every 2 months on day 31"), "2026-03-31");
assert.equal(isValidRepeat("every month on day 31"), true);
assert.equal(isValidRepeat("every month on day 0"), false);
assert.equal(isValidRepeat("every monday,friday"), true);
assert.equal(isValidRepeat("every someday"), false);
assert.deepEqual(statusDefinitions({ statuses: [{ id: "review", name: "レビュー待ち", color: "#123456" }] }), [{ id: "review", name: "レビュー待ち", color: "#123456" }]);
const temporal = taskTemporalMetadata(
  { stat: { ctime: Date.parse("2026-09-01T00:00:00Z"), mtime: Date.parse("2026-09-02T00:00:00Z") } },
  [
    { timestamp: "2026-10-01T01:00:00Z", text: "タスクを作成" },
    { timestamp: "2026-10-03T01:00:00Z", text: "期限を変更" },
  ],
  [{ timestamp: "2026-10-02T01:00:00Z", text: "確認" }],
);
assert.equal(temporal.createdAt, Date.parse("2026-10-01T01:00:00Z"));
assert.equal(temporal.modifiedAt, Date.parse("2026-10-03T01:00:00Z"));
assert.equal(taskTimeBucket(Date.now()).label, "Today");
const templates = [
  { id: "a", name: "週次レビュー", description: "指標を確認", list: "仕事", tags: ["定例"] },
  { id: "b", name: "買い物", description: "食材を買う", list: "生活", tags: [] },
  { id: "c", name: "振り返り", description: "週報を書く", list: "仕事", tags: ["文章"] },
];
assert.deepEqual(filterTaskTemplates(templates, "定例").map((item) => item.id), ["a"]);
assert.deepEqual(filterTaskTemplates(templates, "仕事").map((item) => item.id), ["a", "c"]);
assert.deepEqual(reorderItemsById(templates, "a", "c", true).map((item) => item.id), ["b", "c", "a"]);
assert.deepEqual(moveItemById(templates, "c", -1).map((item) => item.id), ["a", "c", "b"]);
assert.equal(isHabitScheduled({ scheduleMode: "weekdays", weekdays: [new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`).getDay()], archived: false }, new Date().toISOString().slice(0, 10)), true);
assert.equal(isHabitScheduled({ scheduleMode: "weekly", weekdays: [], archived: false }, "2026-10-09"), true);
assert.equal(isHabitScheduled({ scheduleMode: "weekly", weekdays: [], archived: true }, "2026-10-09"), false);
const focusStats = focusLogStats([
  { date: "2026-10-08", minutes: 25, title: "設計", mode: "timer" },
  { date: "2026-10-09", minutes: 12, title: "実装", mode: "stopwatch" },
  { date: "2026-10-09", minutes: 8, title: "設計" },
  { date: "2026-09-01", minutes: 99, title: "対象外", mode: "timer" },
], "2026-10-01", "2026-10-09");
assert.equal(focusStats.totalMinutes, 45);
assert.equal(focusStats.sessions, 3);
assert.deepEqual(focusStats.byTask, [["設計", 33], ["実装", 12]]);
assert.deepEqual(focusStats.byMode, { timer: 33, stopwatch: 12 });
assert.equal(focusElapsedSeconds({ elapsed: 12, running: true, startedAt: 1_000 }, 6_900), 17);
assert.equal(focusElapsedSeconds({ elapsed: 12, running: false, startedAt: null }, 6_900), 12);
assert.equal(countdownNextDate({ date: "2024-02-29", repeat: "yearly-date" }, "2025-01-01"), "2025-02-28");
assert.equal(countdownNextDate({ date: "2026-01-31", repeat: "monthly-date" }, "2026-02-01"), "2026-02-28");
assert.equal(countdownNextDate({ date: "2026-10-30", repeat: "monthly-last" }, "2026-11-01"), "2026-11-30");
assert.equal(countdownNextDate({ date: "2026-10-09", repeat: "monthly-weekday", weekday: 5, occurrence: 2 }, "2026-11-01"), "2026-11-13");
assert.deepEqual(countdownStatus({ date: "2026-10-10", repeat: "none", dayMode: "standard" }, "2026-10-09"), { target: "2026-10-10", delta: 1, value: 1, label: "1 days left" });
assert.equal(countdownStatus({ date: "2026-10-09", repeat: "none", dayMode: "plus-one" }, "2026-10-09").label, "Day 1");
assert.equal(countdownMatchesDate({ date: "2020-10-09", repeat: "yearly-date" }, "2026-10-09"), true);
const recurring = expandRecurringTasks([{ key: "r1", raw: "朝会", due: "2026-10-09", repeat: "every weekday", done: false }], "2026-10-09", 7);
assert.deepEqual(recurring.map((task) => [task.due, Boolean(task.isVirtualOccurrence)]), [
  ["2026-10-09", false],
  ["2026-10-12", true],
  ["2026-10-13", true],
  ["2026-10-14", true],
  ["2026-10-15", true],
]);
const timedRecurring = expandRecurringTasks([{
  key: "r2", raw: "レビュー", due: "2026-10-09", repeat: "every week", done: false,
  timeBlock: { date: "2026-10-09", start: "10:00", end: "11:00", startMinutes: 600, endMinutes: 660 },
}], "2026-10-09", 15);
assert.equal(timedRecurring[1].timeBlock.date, "2026-10-16");
assert.equal(timedRecurring[1].timeBlock.startMinutes, 600);
assert.equal(expandRecurringTasks([{ key: "r3", due: "2026-10-09", repeat: "every day", done: false }], "2026-10-09", 5, false).length, 1);
assert.deepEqual(habitLogMap(["2026-10-08", "2026-10-09"]), { "2026-10-08": 1, "2026-10-09": 1 });
assert.deepEqual(habitLogMap({ "2026-10-09": 3 }), { "2026-10-09": 3 });
assert.equal(habitValue({ h1: ["2026-10-09"] }, "h1", "2026-10-09"), 1);
assert.equal(habitValue({ h1: { "2026-10-09": 3 } }, "h1", "2026-10-09"), 3);
assert.equal(weekStart("2026-10-09"), "2026-10-05");
assert.equal(isReminderDue("2026-10-09T09:30:00", Date.parse("2026-10-09T09:29:00"), Date.parse("2026-10-09T09:30:00")), true);
assert.equal(isReminderDue("2026-10-09T09:29:00", Date.parse("2026-10-09T09:29:00"), Date.parse("2026-10-09T09:30:00")), false);
assert.equal(isReminderDue("invalid", Date.now() - 60_000, Date.now()), false);
const parent = { key: "p", progress: 35, done: false };
assert.equal(progressFor(parent, [parent]), 35);
assert.equal(progressFor(parent, [parent, { parentKey: "p", done: true }, { parentKey: "p", done: false }]), 50);
assert.equal(progressFor({ key: "done", progress: 10, done: true }, []), 100);
assert.equal(cleanDescription("企画書を書く 📋 仕事 📊 65% 📅 2026-10-09"), "企画書を書く");
assert.deepEqual(remindersOf("会議 🔔 2026-10-09 09:45 🔔 2026-10-09 10:30"), [
  { date: "2026-10-09", time: "09:45" },
  { date: "2026-10-09", time: "10:30" },
]);
assert.equal(cleanDescription("会議 🔔 2026-10-09 09:45 🔔 2026-10-09 10:30"), "会議");
const parsedQuick = parseQuickTask("明日9時30分 定例 !高 ~仕事 #会議 毎週");
assert.equal(parsedQuick.description, "定例");
assert.equal(parsedQuick.due, new Date(Date.now() - new Date().getTimezoneOffset() * 60_000 + 86_400_000).toISOString().slice(0, 10));
assert.equal(parsedQuick.reminderTime, "09:30");
assert.equal(parsedQuick.priority, 3);
assert.equal(parsedQuick.list, "仕事");
assert.deepEqual(parsedQuick.tags, ["会議"]);
assert.equal(parsedQuick.repeat, "every week");
const relativeQuick = parseQuickTask("明日 00:05 締切確認 10分前");
assert.equal(relativeQuick.description, "締切確認");
assert.equal(relativeQuick.reminderOffsetMinutes, 10);
assert.deepEqual(offsetReminder("2026-10-10", "00:05", 10), { date: "2026-10-09", time: "23:55" });
assert.deepEqual(quickTaskPreview(relativeQuick).slice(1, 3), [`Due ${relativeQuick.due}`, "Reminder 00:05 · 10 min before"]);
assert.equal(cleanDescription("設計 🍅 3 ⏳ 90m 📅 2026-10-09"), "設計");
assert.equal(cleanDescription("保留した施策 🚫"), "保留した施策");
assert.equal(cleanDescription("重点を進める <!-- ttd:focus-12345678 -->"), "重点を進める");
assert.deepEqual(moveTimeBlockToDate({ date: "2026-10-09", startMinutes: 570, endMinutes: 660 }, "2026-10-16"), {
  date: "2026-10-16",
  startMinutes: 570,
  durationMinutes: 90,
});
const multiDayBlock = timeBlockOf("出張 ⏰ 2026-10-09 09:30→2026-10-11 17:15");
assert.deepEqual(multiDayBlock, { date: "2026-10-09", start: "09:30", endDate: "2026-10-11", end: "17:15", startMinutes: 570, endMinutes: 1035, multiDay: true });
assert.equal(taskOccursOnDate({ timeBlock: multiDayBlock }, "2026-10-10"), true);
assert.equal(taskOccursOnDate({ timeBlock: multiDayBlock }, "2026-10-12"), false);
assert.deepEqual(taskTimeSegment({ timeBlock: multiDayBlock }, "2026-10-10"), { startMinutes: 0, endMinutes: 1439, start: "00:00", end: "23:59" });
assert.equal(cleanDescription("出張 ⏰ 2026-10-09 09:30→2026-10-11 17:15"), "出張");
assert.equal(shiftTimeBlockToDate("出張 ⏰ 2026-10-09 09:30→2026-10-11 17:15", "2026-10-16"), "出張 ⏰ 2026-10-16 09:30→2026-10-18 17:15");
assert.equal(timelineMinutesFromOffset(0, 1152), 360);
assert.equal(timelineMinutesFromOffset(224, 1152), 570);
assert.equal(timelineMinutesFromOffset(1152, 1152), 1425);
assert.equal(timelineMinutesFromOffset(-100, 1152), 360);
assert.deepEqual(calendarDropSchedule({ startMinutes: 540, endMinutes: 630 }, "2026-10-10", 720), {
  date: "2026-10-10",
  startMinutes: 720,
  durationMinutes: 90,
});
assert.deepEqual(calendarDropSchedule({ startMinutes: 540, endMinutes: 660 }, "2026-10-10", 1395), {
  date: "2026-10-10",
  startMinutes: 1320,
  durationMinutes: 120,
});
assert.deepEqual(calendarDropSchedule(null, "2026-10-10", 600), {
  date: "2026-10-10",
  startMinutes: 600,
  durationMinutes: 60,
});
assert.deepEqual(batchScheduleSlots(3, "2026-10-09", 540, 60), [
  { date: "2026-10-09", startMinutes: 540, durationMinutes: 60 },
  { date: "2026-10-09", startMinutes: 600, durationMinutes: 60 },
  { date: "2026-10-09", startMinutes: 660, durationMinutes: 60 },
]);
assert.deepEqual(batchScheduleSlots(2, "2026-10-09", 1380, 90), [
  { date: "2026-10-10", startMinutes: 360, durationMinutes: 90 },
  { date: "2026-10-10", startMinutes: 450, durationMinutes: 90 },
]);
const taxonomyColor = (kind, value) => `${kind}:${value}`;
assert.equal(calendarTaskColor({ priority: 3, list: "仕事", tags: ["確認"] }, "priority", taxonomyColor), "#e25555");
assert.equal(calendarTaskColor({ priority: 1, list: "仕事", tags: ["確認"] }, "list", taxonomyColor), "list:仕事");
assert.equal(calendarTaskColor({ priority: 1, list: "", tags: ["確認"] }, "tag", taxonomyColor), "tag:確認");
assert.equal(calendarTaskColor({ priority: 1, list: "", tags: [] }, "tag", taxonomyColor), "#8a94a6");
assert.equal(calendarSpan("day"), 1);
assert.equal(calendarSpan("three"), 3);
assert.equal(calendarSpan("week"), 7);
assert.equal(calendarSpan("multiweek"), 28);
assert.equal(calendarSpan("month"), 42);
assert.equal(calendarSpan("agenda"), 30);
assert.equal(calendarSpan("year"), 366);
assert.equal(calendarSpan("unknown"), 1);
assert.deepEqual(calendarRange("multiweek", "2026-10-09"), { start: "2026-10-05", days: 28 });
assert.deepEqual(calendarRange("year", "2026-10-09"), { start: "2026-01-01", days: 365 });
assert.deepEqual(calendarRange("year", "2028-03-09"), { start: "2028-01-01", days: 366 });
assert.deepEqual(calendarRequestParams("primary", "start", "end"), {
  calendarId: "primary",
  timeMin: "start",
  timeMax: "end",
  singleEvents: true,
  orderBy: "startTime",
  maxResults: 2500,
});
assert.equal(calendarRequestParams("primary", "start", "end", "next").pageToken, "next");
assert.deepEqual(selectedCalendarIds({ googleCalendarIds: [], googleCalendarId: "primary" }), ["primary"]);
assert.deepEqual(selectedCalendarIds({ googleCalendarIds: ["primary", " team ", "primary"] }), ["primary", "team"]);
const cachedEvent = { eventId: "event-1", calendarId: "primary", calendarName: "仕事", title: "定例", url: "https://calendar.example/e1", date: "2026-10-09", dates: [], startMinutes: 600, endMinutes: 660 };
const calendarCache = mergeGoogleCalendarCache(null, [cachedEvent], "2026-10-09T00:00:00.000Z", "2026-10-09", { start: "2026-10-09", end: "2026-10-10" });
assert.equal(calendarCache.version, 1);
assert.equal(calendarCacheKey(cachedEvent), calendarCacheKey({ ...cachedEvent }));
assert.equal(calendarCacheKey(cachedEvent), calendarCacheKey({ ...cachedEvent, title: "変更後", startMinutes: 720 }));
assert.equal(googleCalendarCacheCovers(calendarCache, "2026-10-09", "2026-10-10"), true);
assert.equal(googleCalendarCacheCovers(calendarCache, "2026-10-10", "2026-10-11"), false);
assert.deepEqual(googleCalendarCacheForRange(calendarCache, ["primary"], "2026-10-09", "2026-10-10"), [cachedEvent]);
assert.deepEqual(googleCalendarCacheForRange(calendarCache, ["team"], "2026-10-09", "2026-10-10"), []);
assert.deepEqual(googleCalendarCacheAge(calendarCache, Date.parse("2026-10-09T01:00:00.000Z")), { available: true, stale: false, hours: 1 });
assert.equal(googleCalendarCacheAge(calendarCache, Date.parse("2026-10-11T01:00:00.000Z")).stale, true);
const legacyCachedEvent = { ...cachedEvent };
delete legacyCachedEvent.eventId;
const migratedCalendarCache = mergeGoogleCalendarCache({ ...calendarCache, items: [legacyCachedEvent] }, [cachedEvent], "2026-10-09T01:00:00.000Z", "2026-10-09", { start: "2026-10-09", end: "2026-10-10" });
assert.equal(migratedCalendarCache.items.length, 1);
assert.equal(migratedCalendarCache.items[0].eventId, "event-1");
assert.equal(isValidTimeZone("America/New_York"), true);
assert.equal(isValidTimeZone("Mars/Olympus"), false);
assert.deepEqual(calendarTimeZones(["UTC", " UTC ", "Europe/London", "Mars/Olympus"]), ["UTC", "Europe/London"]);
assert.match(calendarTimeZoneLabel("2026-10-09", 9, "UTC"), /^00:00$/u);
assert.equal(
  rewriteSubtaskRaw("資料を確認 #レビュー 📅 2026-10-10 🔔 2026-10-09 09:00", "設計書を確認", ["2026-10-09T08:30", "2026-10-09T09:00"]),
  "設計書を確認 #レビュー 📅 2026-10-10 🔔 2026-10-09 08:30 🔔 2026-10-09 09:00",
);
assert.equal(rewriteSubtaskRaw("完了項目 🔔 2026-10-09 09:00 ✅ 2026-10-08", "完了済み", []), "完了済み ✅ 2026-10-08");
assert.deepEqual(reorderSubtaskBlocks([
  "- [ ] 親",
  "  > 📝 親メモ",
  "  - [ ] A #tag",
  "    > 📝 Aメモ",
  "    - [ ] Aの子",
  "  - [x] B ✅ 2026-10-08",
  "- [ ] 次の親",
], { line: 0, indent: 0 }, [
  { line: 5, description: "B更新", reminders: ["2026-10-10T09:00"] },
  { line: 2, description: "A更新", reminders: [] },
]), [
  "- [ ] 親",
  "  > 📝 親メモ",
  "  - [x] B更新 🔔 2026-10-10 09:00 ✅ 2026-10-08",
  "  - [ ] A更新 #tag",
  "    > 📝 Aメモ",
  "    - [ ] Aの子",
  "- [ ] 次の親",
]);
assert.equal(attachmentMarkdown("private/media/design.png", "image/png"), "![[private/media/design.png]]");
assert.equal(attachmentMarkdown("private/media/spec.pdf", "application/pdf"), "[[private/media/spec.pdf]]");
assert.equal(attachmentMarkdown("private/media/photo.WEBP"), "![[private/media/photo.WEBP]]");
assert.deepEqual(attachmentsOf("参照 [[設計ノート]]\n![[private/media/ui.png]]\n[[private/media/spec.pdf|仕様書]]"), [
  { token: "![[private/media/ui.png]]", path: "private/media/ui.png", embedded: true },
  { token: "[[private/media/spec.pdf|仕様書]]", path: "private/media/spec.pdf", embedded: false },
]);
assert.equal(removeAttachmentToken("説明\n![[private/media/ui.png]]\n\n補足", "![[private/media/ui.png]]"), "説明\n\n補足");
const trashFixture = ["# Note", "- [ ] 親", "  > 📝 メモ", "  - [ ] 子", "    - [ ] 孫", "- [ ] 次"];
assert.deepEqual(taskBlockRange(trashFixture, 1, 0), { start: 1, end: 5 });
assert.deepEqual(noteItemBlockRange(["- 🗒️ 設計", "  > 📝 メモ", "  - [ ] 確認", "- [ ] 次"], 0, 0), { start: 0, end: 3 });
assert.deepEqual(normalizeTaskBlock(trashFixture.slice(2, 5), 2), ["> 📝 メモ", "- [ ] 子", "  - [ ] 孫"]);
assert.deepEqual(nestTaskBlock(["- [ ] 統合元", "  > 📝 メモ", "  - [ ] 子"], 0), ["  - [ ] 統合元", "    > 📝 メモ", "    - [ ] 子"]);
assert.deepEqual(taskRecordFromLine("  > 💬 2026-10-09T01:23:45.000Z 1行目\\n2行目", 0), {
  type: "comment", timestamp: "2026-10-09T01:23:45.000Z", text: "1行目\n2行目",
});
assert.deepEqual(taskRecordFromLine("  > 🕘 2026-10-09T01:23:45.000Z 期限を変更", 0), {
  type: "activity", timestamp: "2026-10-09T01:23:45.000Z", text: "期限を変更",
});
assert.equal(taskRecordFromLine("  > 💬 2026-10-09T01:23:45.000Z 親コメント", 2), null);
assert.equal(describeTaskChange("- [ ] 設計 📅 2026-10-09", "- [x] 設計 📅 2026-10-09"), "Marked complete");
assert.equal(describeTaskChange("- [ ] 設計 📅 2026-10-09", "- [ ] 実装 📅 2026-10-09"), "Title changed");
assert.equal(describeTaskChange("- [ ] 設計 📅 2026-10-09", "- [ ] 設計 📅 2026-10-10"), "Due: 2026-10-09 → 2026-10-10");
assert.equal(describeTaskChange("- [ ] 設計", "- [ ] 設計 🚫"), "Marked won't do");
assert.equal(describeTaskChange("- [ ] 設計 🚫", "- [ ] 設計"), "Restored");
assert.deepEqual(calendarItemDates({ date: "2026-10-09", dates: [] }), ["2026-10-09"]);
assert.deepEqual(calendarItemDates({ date: "2026-10-09", dates: ["2026-10-09", "2026-10-10"] }), ["2026-10-09", "2026-10-10"]);
assert.equal(matchesCalendarQuery("Orion 開発定例", "orion"), true);
assert.equal(matchesCalendarQuery("Orion 開発定例", "営業"), false);
const overlapping = calendarBlockLayout([
  { id: "a", startMinutes: 540, endMinutes: 600 },
  { id: "b", startMinutes: 570, endMinutes: 630 },
  { id: "c", startMinutes: 630, endMinutes: 660 },
]);
assert.deepEqual(overlapping.map(({ item, lane, lanes }) => [item.id, lane, lanes]), [
  ["a", 0, 2],
  ["b", 1, 2],
  ["c", 0, 1],
]);
const activities = calendarActivityItems({
  calendarShowHabits: true,
  calendarShowFocus: true,
  countdowns: [{ id: "c1", title: "記念日", date: "2020-10-09", repeat: "yearly-date", note: "6周年" }],
  habits: [{ id: "h1", name: "運動", weekdays: [5], scheduleMode: "weekdays", target: 2, unit: "回" }],
  habitLog: { h1: { "2026-10-09": 2 } },
  focusLog: [
    { date: "2026-10-09", minutes: 25, title: "設計" },
    { date: "2026-10-09", minutes: 50, title: "実装" },
  ],
}, "2026-10-09");
assert.deepEqual(activities.map(({ activityType, title, meta }) => [activityType, title, meta]), [
  ["countdown", "記念日", "6周年"],
  ["habit", "✓ 運動", "2/2 回"],
  ["focus", "Focus 75 min", "設計 · 実装"],
]);
assert.equal(calendarActivityItems({ calendarShowHabits: false, calendarShowFocus: false }, "2026-10-09").length, 0);
const icsItems = parseIcsCalendar(`BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:once\r\nDTSTART;VALUE=DATE:20261010\r\nDTEND;VALUE=DATE:20261011\r\nSUMMARY:記念\\,日\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:weekly\r\nDTSTART:20261005T090000\r\nDTEND:20261005T100000\r\nRRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261031T000000Z\r\nEXDATE:20261012T090000\r\nSUMMARY:定例\r\nEND:VEVENT\r\nEND:VCALENDAR`, { id: "ics-1", name: "外部", color: "#123456" }, "2026-10-09", "2026-10-16");
assert.deepEqual(icsItems.map((item) => [item.title, item.date, item.allDay]), [
  ["記念,日", "2026-10-10", true],
  ["定例", "2026-10-14", false],
]);
assert.equal(icsItems[0].calendarName, "外部");
assert.equal(addMonths("2026-01-31", 1), "2026-02-01");
assert.equal(addMonths("2026-01-15", -1), "2025-12-01");
const octoberGrid = monthGridDates("2026-10-09");
assert.equal(octoberGrid.length, 42);
assert.equal(octoberGrid[0], "2026-09-28");
assert.equal(octoberGrid[41], "2026-11-08");

async function testTrashRoundTrip() {
  const sourcePath = "private/tasks/QA.md";
  const files = new Map();
  const source = new StubTFile(sourcePath);
  files.set(sourcePath, { file: source, content: "# QA\n- [ ] 親 #tag\n  > 📝 メモ\n  > 💬 2026-10-09T01:00:00.000Z 確認待ち\n  > 🕘 2026-10-09T01:01:00.000Z タスクを更新\n  - [ ] 子\n- [ ] 次\n" });
  const vault = {
    getAbstractFileByPath: (path) => files.get(path)?.file || null,
    getMarkdownFiles: () => [...files.values()].map((value) => value.file),
    cachedRead: async (file) => files.get(file.path).content,
    createFolder: async () => {},
    create: async (path, content) => {
      const file = new StubTFile(path);
      files.set(path, { file, content });
      return file;
    },
    append: async (file, value) => { files.get(file.path).content += value; },
    process: async (file, update) => { files.get(file.path).content = update(files.get(file.path).content); },
  };
  const plugin = new TaktunePlugin();
  plugin.settings = migrateSettings({ inboxPath: "private/tasks/TODO Inbox.md", trashPath: "private/tasks/TickTick Trash.md" });
  plugin.app = { vault };
  await plugin.deleteTask({ path: sourcePath, line: 0, indent: 0, raw: "親 #tag", taskId: "" });
  assert.equal(files.get(sourcePath).content.includes("親 #tag"), false);
  assert.equal(files.get("private/tasks/TickTick Trash.md").content.includes("  - [ ] 子"), true);
  const trashed = await plugin.collectTrashTasks();
  assert.equal(trashed.filter((task) => !task.parentKey).length, 1);
  assert.equal(trashed[0].trashMeta.source, sourcePath);
  assert.equal(trashed[0].comments[0].text, "確認待ち");
  assert.equal(trashed[0].activities[0].text, "タスクを更新");
  await plugin.restoreTask(trashed[0]);
  assert.equal(files.get(sourcePath).content.includes("- [ ] 親 #tag\n  > 📝 メモ\n  > 💬 2026-10-09T01:00:00.000Z 確認待ち\n  > 🕘 2026-10-09T01:01:00.000Z タスクを更新\n  - [ ] 子"), true);
  assert.equal(files.get("private/tasks/TickTick Trash.md").content.includes("親 #tag"), false);
}

async function testWontDoRoundTrip() {
  const sourcePath = "private/tasks/WontDo.md";
  const source = new StubTFile(sourcePath);
  const files = new Map([[sourcePath, { file: source, content: "- [ ] 見送る施策\n" }]]);
  const vault = {
    getAbstractFileByPath: (path) => files.get(path)?.file || null,
    getMarkdownFiles: () => [...files.values()].map((value) => value.file),
    cachedRead: async (file) => files.get(file.path).content,
    process: async (file, update) => { files.get(file.path).content = update(files.get(file.path).content); },
  };
  const plugin = new TaktunePlugin();
  plugin.app = { vault };
  const task = { path: sourcePath, line: 0, indent: 0, raw: "見送る施策", done: false };
  await plugin.setTaskWontDo(task, true);
  assert.match(files.get(sourcePath).content, /^- \[ \] 見送る施策 🚫$/mu);
  assert.match(files.get(sourcePath).content, /Marked won't do/u);
  let collected = await plugin.collectTasks();
  assert.equal(collected[0].wontDo, true);
  await plugin.setTaskWontDo({ ...collected[0] }, false);
  assert.match(files.get(sourcePath).content, /^- \[ \] 見送る施策$/mu);
  collected = await plugin.collectTasks();
  assert.equal(collected[0].wontDo, false);
}

async function testTaskNoteRoundTrip() {
  const sourcePath = "private/tasks/Convertible.md";
  const source = new StubTFile(sourcePath);
  const files = new Map([[sourcePath, { file: source, content: "# 先頭へ外部挿入\n- [ ] 設計メモ #検討\n  > 📝 本文\n  > 💬 2026-10-09T01:00:00.000Z コメント\n  - [ ] 確認項目\n- [ ] 別タスク\n" }]]);
  const vault = {
    getAbstractFileByPath: (path) => files.get(path)?.file || null,
    getMarkdownFiles: () => [...files.values()].map((value) => value.file),
    cachedRead: async (file) => files.get(file.path).content,
    process: async (file, update) => { files.get(file.path).content = update(files.get(file.path).content); },
  };
  const plugin = new TaktunePlugin();
  plugin.app = { vault };
  await plugin.convertTaskToNote({ path: sourcePath, line: 0, indent: 0, raw: "設計メモ #検討", taskId: "" });
  assert.match(files.get(sourcePath).content, /^- 🗒️ 設計メモ #検討$/mu);
  let tasks = await plugin.collectTasks();
  assert.deepEqual(tasks.map((task) => task.raw), ["別タスク"]);
  const notes = await plugin.collectNotes();
  assert.equal(notes.length, 1);
  assert.equal(notes[0].note, "本文");
  assert.equal(notes[0].comments[0].text, "コメント");
  await plugin.convertNoteToTask(notes[0]);
  tasks = await plugin.collectTasks();
  assert.deepEqual(tasks.map((task) => task.raw), ["設計メモ #検討", "確認項目", "別タスク"]);
  assert.match(files.get(sourcePath).content, /タスクへ変換/u);
}

async function testTaskDefaults() {
  const inboxPath = "private/tasks/TODO Inbox.md";
  const inbox = new StubTFile(inboxPath);
  const files = new Map([[inboxPath, { file: inbox, content: "# Inbox\n" }]]);
  const vault = {
    getAbstractFileByPath: (path) => files.get(path)?.file || null,
    cachedRead: async (file) => files.get(file.path).content,
    append: async (file, value) => { files.get(file.path).content += value; },
  };
  const plugin = new TaktunePlugin();
  plugin.app = { vault };
  plugin.settings = migrateSettings({ inboxPath, taskDefaults: { dueMode: "today", list: "仕事", priority: 3, reminderTime: "09:00" } });
  const firstKey = await plugin.addTask("既定値テスト", "", {});
  const secondKey = await plugin.addTask("相対通知テスト", "2026-10-10", { reminderTime: "00:05", reminderOffsetMinutes: 10, priority: 1, list: "Inbox" });
  const content = files.get(inboxPath).content;
  assert.match(content, /既定値テスト 📋 仕事 ⏫ 📅 \d{4}-\d{2}-\d{2} 🔔 \d{4}-\d{2}-\d{2} 09:00/u);
  assert.match(content, /相対通知テスト 📋 Inbox 📅 2026-10-10 🔔 2026-10-09 23:55/u);
  assert.equal((content.match(/タスクを作成/gu) || []).length, 2);
  assert.equal(firstKey, `${inboxPath}:1`);
  assert.equal(secondKey, `${inboxPath}:3`);
}

async function testManualTaskOrdering() {
  const lines = [
    "# Tasks",
    "- [ ] 親A",
    "  > 📝 メモA",
    "  - [ ] 子A",
    "- [ ] 親B",
    "  > 💬 2026-10-09T01:00:00.000Z コメントB",
    "- [ ] 親C",
  ];
  assert.deepEqual(moveTaskBlock(lines, { line: 1, indent: 0 }, { line: 6, indent: 0 }, true), [
    "# Tasks",
    "- [ ] 親B",
    "  > 💬 2026-10-09T01:00:00.000Z コメントB",
    "- [ ] 親C",
    "- [ ] 親A",
    "  > 📝 メモA",
    "  - [ ] 子A",
  ]);

  const sourcePath = "private/tasks/Source.md";
  const targetPath = "private/tasks/Target.md";
  const files = new Map([
    [sourcePath, { file: new StubTFile(sourcePath), content: "# Source\n- [ ] 移動する親\n  > 📝 本文\n  - [ ] 子\n- [ ] 残す\n" }],
    [targetPath, { file: new StubTFile(targetPath), content: "# Target\n- [ ] 移動先\n  > 📝 移動先本文\n" }],
  ]);
  const vault = {
    getAbstractFileByPath: (path) => files.get(path)?.file || null,
    cachedRead: async (file) => files.get(file.path).content,
    process: async (file, update) => { files.get(file.path).content = update(files.get(file.path).content); },
  };
  const plugin = new TaktunePlugin();
  plugin.app = { vault };
  await plugin.moveTaskRelative(
    { path: sourcePath, line: 1, indent: 0, raw: "移動する親", taskId: "" },
    { path: targetPath, line: 1, indent: 0, raw: "移動先", taskId: "" },
    true,
  );
  assert.equal(files.get(sourcePath).content.includes("移動する親"), false);
  assert.match(files.get(targetPath).content, /移動先本文\n+- \[ \] 移動する親\n  > 📝 本文\n  - \[ \] 子/u);

  const { taskFocusIdentity } = TaktunePlugin.__test;
  const firstDuplicate = { path: sourcePath, line: 0, raw: "同じ", taskId: "" };
  const secondDuplicate = { path: sourcePath, line: 1, raw: "同じ", taskId: "" };
  const firstFocusKey = taskFocusIdentity(firstDuplicate);
  assert.equal(taskFocusIdentity(firstDuplicate), firstFocusKey, "a pending focus identity must remain stable");
  assert.notEqual(taskFocusIdentity(secondDuplicate), firstFocusKey, "identical untagged tasks need distinct focus identities");
  assert.equal(taskFocusIdentity({ taskId: "stable-id" }), "stable-id");

  const focusPath = "private/tasks/Focus.md";
  files.set(focusPath, { file: new StubTFile(focusPath), content: "- [ ] 同じ\n- [ ] 同じ\n" });
  const focusTarget = { path: focusPath, line: 0, indent: 0, raw: "同じ", taskId: "" };
  const focusSource = { path: focusPath, line: 1, indent: 0, raw: "同じ", taskId: "" };
  const persistedFocusKey = taskFocusIdentity(focusSource);
	await assert.rejects(
		plugin.ensureTaskIdentity(focusSource, persistedFocusKey),
		/位置|moved/u,
		"duplicate untagged tasks must fail closed instead of tagging by stale position",
	);
	files.get(focusPath).content = "- [ ] 同じ <!-- ttd:first-stable -->\n- [ ] 同じ <!-- ttd:second-stable -->\n";
	focusTarget.raw = "同じ <!-- ttd:first-stable -->";
	focusTarget.taskId = "first-stable";
	focusSource.raw = "同じ <!-- ttd:second-stable -->";
	focusSource.taskId = "second-stable";
	await plugin.moveTaskRelative(focusSource, focusTarget, false);
  assert.match(
    files.get(focusPath).content.split("\n")[0],
		/ttd:second-stable/u,
    "keyboard reordering must carry the focused task identity to its new row",
  );
}

async function testBatchPriorityAndTags() {
  const path = "private/tasks/Batch.md";
  const files = new Map([[path, { file: new StubTFile(path), content: "- [ ] 一件目 #既存\n- [ ] 二件目 🔽\n" }]]);
  const vault = {
    getAbstractFileByPath: (value) => files.get(value)?.file || null,
    process: async (file, update) => { files.get(file.path).content = update(files.get(file.path).content); },
  };
  const plugin = new TaktunePlugin();
  plugin.app = { vault };
  const tasks = [
    { path, line: 0, indent: 0, raw: "一件目 #既存", done: false },
    { path, line: 1, indent: 0, raw: "二件目 🔽", done: false },
  ];
  await plugin.batchUpdateTasks(tasks, "priority", "3");
  let collected = files.get(path).content;
  assert.match(collected, /^- \[ \] 一件目 #既存 ⏫$/mu);
  assert.match(collected, /^- \[ \] 二件目 ⏫$/mu);
  const refreshed = collected.split("\n").map((line, lineNumber) => ({ line, lineNumber })).filter(({ line }) => /^- \[ \]/u.test(line)).map(({ line, lineNumber }) => ({ path, line: lineNumber, indent: 0, raw: line.replace(/^- \[ \] /u, ""), done: false }));
  await plugin.batchUpdateTasks(refreshed, "tag-add", "#一括 タグ");
  collected = files.get(path).content;
  assert.equal((collected.match(/#一括-タグ/gu) || []).length, 2);
  const tagged = collected.split("\n").map((line, lineNumber) => ({ line, lineNumber })).filter(({ line }) => /^- \[ \]/u.test(line)).map(({ line, lineNumber }) => ({ path, line: lineNumber, indent: 0, raw: line.replace(/^- \[ \] /u, ""), done: false }));
  await plugin.batchUpdateTasks(tagged, "tag-remove", "一括 タグ");
  assert.equal(files.get(path).content.includes("#一括-タグ"), false);
  assert.equal(files.get(path).content.includes("#既存"), true);
}

async function testHabitArchiveAndCompletion() {
  const plugin = new TaktunePlugin();
  plugin.settings = {
    habits: [{ id: "habit-1", name: "水を飲む", target: 3, reminders: ["09:00", "15:00"], archived: false }],
    habitLog: {},
  };
  plugin.saveSettings = async () => {};
  await plugin.completeHabit("habit-1", "2026-10-09", 3);
  assert.equal(plugin.settings.habitLog["habit-1"]["2026-10-09"], 3);
  await plugin.archiveHabit("habit-1", true);
  assert.equal(plugin.settings.habits[0].archived, true);
  assert.deepEqual(plugin.settings.habits[0].reminders, ["09:00", "15:00"]);
  assert.equal(plugin.settings.habitLog["habit-1"]["2026-10-09"], 3);
}

async function testMergeTasksPreservesBlocks() {
  const plugin = new TaktunePlugin();
  const file = new StubTFile("tasks.md");
  let content = [
    "# 先頭へ外部挿入",
    "- [ ] 親 📅 2026-10-10",
    "  > 📝 親メモ",
    "- [ ] 統合元 #tag",
    "  > 📝 元メモ",
    "  - [ ] 元の子",
    "- [ ] 残す別タスク",
  ].join("\n");
  plugin.app = { vault: {
    getAbstractFileByPath: (path) => path === file.path ? file : null,
    getMarkdownFiles: () => [file],
    cachedRead: async () => content,
    process: async (target, transform) => { assert.equal(target, file); content = transform(content); },
  } };
  plugin.settings = migrateSettings({});
  const target = { key: "tasks.md:0", path: "tasks.md", line: 0, indent: 0, raw: "親 📅 2026-10-10", parentKey: "" };
  const source = { key: "tasks.md:2", path: "tasks.md", line: 2, indent: 0, raw: "統合元 #tag", parentKey: "" };
  await plugin.mergeTasks(target, [source]);
  assert.match(content, /- \[ \] 親 📅 2026-10-10\n  > 📝 親メモ\n  - \[ \] 統合元 #tag\n    > 📝 元メモ\n    - \[ \] 元の子\n  > 🕘 .* 2件のタスクを統合\n- \[ \] 残す別タスク/u);

  content = [
    "# 先頭へ外部挿入",
    "- [ ] 複製対象 <!-- ttd:parent-id -->",
    "  - [ ] 子 <!-- ttd:child-id -->",
    "- [ ] 残す",
  ].join("\n");
  await plugin.duplicateTask({ path: file.path, line: 0, indent: 0, raw: "複製対象 <!-- ttd:parent-id -->", taskId: "parent-id" });
  const ids = [...content.matchAll(/<!--\s*ttd:([a-z0-9-]+)\s*-->/gu)].map((match) => match[1]);
  assert.equal(ids.length, 4, "the parent and child copy must each receive an identity");
  assert.equal(new Set(ids).size, ids.length, "duplicating a block must not duplicate any task identity");
  assert.equal(ids.filter((id) => id === "parent-id").length, 1);
  assert.equal(ids.filter((id) => id === "child-id").length, 1);

  const duplicatedTasks = await plugin.collectTasks();
  const original = duplicatedTasks.find((task) => task.taskId === "parent-id");
  const copy = duplicatedTasks.find((task) => task.taskId.startsWith("copy-") && !task.parentKey);
  assert.ok(original && copy);
  await plugin.moveTaskRelative(copy, original, false);
  assert.ok(content.indexOf(`ttd:${copy.taskId}`) < content.indexOf("ttd:parent-id"), "the copied identity must support later line-movement operations");
}

async function testStatusRoundTrip() {
  const path = "private/tasks/Status.md";
  const file = new StubTFile(path);
  let content = "- [ ] レビューする 📅 2026-10-10\n";
  const plugin = new TaktunePlugin();
  plugin.settings = migrateSettings({ reviewDirectory: "private/reviews" });
  plugin.t = createTranslator("en");
  plugin.app = { vault: {
    getAbstractFileByPath: (value) => value === path ? file : null,
    process: async (target, transform) => { assert.equal(target, file); content = transform(content); },
  } };
  const task = { path, line: 0, indent: 0, raw: "レビューする 📅 2026-10-10", done: false };
  await plugin.setTaskStatus(task, "doing");
  assert.match(content, /^- \[ \] レビューする 📅 2026-10-10 🚦 doing$/mu);
  assert.equal(cleanDescription("レビューする 📅 2026-10-10 🚦 doing"), "レビューする");
  await plugin.setTaskStatus(task, "waiting");
  assert.match(content, /^- \[ \] レビューする 📅 2026-10-10 🚦 waiting$/mu);
}

async function testSecretMigration() {
  const secrets = new Map();
  const plugin = new TaktunePlugin();
  plugin.app = { secretStorage: {
    getSecret: (id) => secrets.get(id) || null,
    setSecret: (id, value) => secrets.set(id, value),
  } };
  plugin.settings = migrateSettings({
    linearApiKey: "lin-legacy",
    jiraApiToken: "jira-legacy",
    slackToken: "slack-legacy",
  });
  assert.equal(plugin.migrateLegacySecrets(), true);
  assert.equal(plugin.settings.linearApiKey, "");
  assert.equal(plugin.settings.jiraApiToken, "");
  assert.equal(plugin.settings.slackToken, "");
  assert.equal(plugin.integrationSecret("linear"), "lin-legacy");
  assert.equal(plugin.integrationSecret("jira"), "jira-legacy");
  assert.equal(plugin.integrationSecret("slack"), "slack-legacy");
  assert.equal(plugin.migrateLegacySecrets(), false);
}

async function testExternalItemImport() {
  const plugin = new TaktunePlugin();
  let added = null;
  let addCount = 0;
  const importedTasks = [];
  plugin.settings = migrateSettings({ externalItemState: { dismissed: { "linear:PPR-1": "old" } } });
  plugin.collectTasks = async () => importedTasks;
  plugin.addTask = async (...args) => {
    added = args;
    addCount += 1;
    const key = `private/tasks/TODO Inbox.md:${addCount}`;
    importedTasks.push({ key, tags: args[2].tags });
    return key;
  };
  plugin.saveSettings = async () => {};
  const importedKey = await plugin.importExternalItem({
    externalId: "linear:PPR-1",
    title: "仕様を確認",
    due: "2026-10-12",
    labels: ["source:linear", "team alpha"],
    url: "https://linear.example/PPR-1",
  });
  assert.deepEqual(added, ["仕様を確認", "2026-10-12", {
    list: "External",
    tags: ["source-linear", "team-alpha", "external/linear/PPR-1"],
    note: "[Open in source](https://linear.example/PPR-1)",
  }]);
  assert.equal(importedKey, "private/tasks/TODO Inbox.md:1");
  assert.equal(Boolean(plugin.settings.externalItemState.imported["linear:PPR-1"]), true);
  assert.equal(plugin.settings.externalItemState.dismissed["linear:PPR-1"], undefined);
  added = null;
  assert.equal(await plugin.importExternalItem({ externalId: "linear:PPR-1", title: "重複" }), importedKey);
  assert.equal(added, null);

  importedTasks.length = 0;
  const recreatedKey = await plugin.importExternalItem({ externalId: "linear:PPR-1", title: "削除後に復元" });
  assert.equal(addCount, 2);
  assert.equal(recreatedKey, "private/tasks/TODO Inbox.md:2");
  assert.equal(externalItemStateForTasks(plugin.settings.externalItemState, []).imported["linear:PPR-1"], undefined);
  assert.equal(Boolean(externalItemStateForTasks(plugin.settings.externalItemState, importedTasks).imported["linear:PPR-1"]), true);

  const concurrent = { externalId: "linear:PPR-2", title: "同時取り込み", labels: ["source:linear"] };
  const beforeConcurrent = addCount;
  const concurrentKeys = await Promise.all([plugin.importExternalItem(concurrent), plugin.importExternalItem(concurrent)]);
  assert.equal(addCount, beforeConcurrent + 1);
  assert.equal(concurrentKeys[0], concurrentKeys[1]);

  const retryItem = { externalId: "linear:PPR-3", title: "保存再試行", labels: ["source:linear"] };
  let failSave = true;
  plugin.saveSettings = async () => {
    if (failSave) {
      failSave = false;
      throw new Error("settings unavailable");
    }
  };
  const beforeRetry = addCount;
  await assert.rejects(plugin.importExternalItem(retryItem), /settings unavailable/u);
  assert.equal(Boolean(plugin.settings.externalItemState.imported[retryItem.externalId]), false);
  const retryKey = await plugin.importExternalItem(retryItem);
  assert.equal(addCount, beforeRetry + 1);
  assert.equal(retryKey, importedTasks.find((task) => task.tags.includes("external/linear/PPR-3")).key);

  const dismissItem = { externalId: "slack:C1:100", title: "後で読む" };
  plugin.saveSettings = async () => { throw new Error("dismiss unavailable"); };
  await assert.rejects(plugin.dismissExternalItem(dismissItem), /dismiss unavailable/u);
  assert.equal(Boolean(plugin.settings.externalItemState.dismissed[dismissItem.externalId]), false);
  plugin.saveSettings = async () => {};
  await plugin.dismissExternalItem(dismissItem);
  assert.equal(Boolean(plugin.settings.externalItemState.dismissed[dismissItem.externalId]), true);
}

async function testDashboardLeafReuse() {
  const makeLeaf = (type, file = "") => {
    const leaf = {
      type,
      detached: false,
      getViewState: () => ({ type: leaf.type, state: file ? { file } : {} }),
      view: { getViewType: () => leaf.type, file: file ? { path: file } : null },
      setViewState: async (state) => { leaf.type = state.type; },
      detach: () => { leaf.detached = true; },
    };
    return leaf;
  };
  const first = makeLeaf("ticktick-dashboard-view");
  const second = makeLeaf("ticktick-dashboard-view");
  const plugin = new TaktunePlugin();
  plugin.settings = migrateSettings({ dashboardNotePath: "private/TODO.md" });
  plugin.app = { workspace: {
    activeLeaf: second,
    iterateAllLeaves: (visit) => [first, second].filter((leaf) => !leaf.detached).forEach(visit),
  } };
  assert.equal(plugin.dedupeDashboardLeaves(), second);
  assert.equal(first.detached, true);
  assert.equal(second.detached, false);

  let revealCount = 0;
  plugin.app.workspace.getLeaf = () => { throw new Error("既存タブがあるため新規タブを作ってはいけない"); };
  plugin.app.workspace.revealLeaf = async (leaf) => { assert.equal(leaf, second); revealCount += 1; };
  await Promise.all([plugin.activateView(), plugin.activateView(), plugin.activateView()]);
  assert.equal(revealCount, 1);

  const todoLeaf = makeLeaf("markdown", "private/TODO.md");
  const fromTodo = new TaktunePlugin();
  fromTodo.settings = migrateSettings({ dashboardNotePath: "private/TODO.md" });
  let todoRevealCount = 0;
  fromTodo.app = { workspace: {
    activeLeaf: todoLeaf,
    iterateAllLeaves: (visit) => visit(todoLeaf),
    getLeaf: () => { throw new Error("TODOタブを再利用するため新規タブを作ってはいけない"); },
    revealLeaf: async (leaf) => { assert.equal(leaf, todoLeaf); todoRevealCount += 1; },
  } };
  await fromTodo.activateView();
  assert.equal(todoLeaf.type, "ticktick-dashboard-view");
  assert.equal(todoRevealCount, 1);
}

async function testExternalIssuePlanningModel() {
  const view = Object.create(TaktuneView.prototype);
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const tomorrow = new Date(new Date(`${today}T12:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10);
  const dayAfterTomorrow = new Date(new Date(`${today}T12:00:00Z`).getTime() + 2 * 86_400_000).toISOString().slice(0, 10);
  const pending = { externalId: "linear:PPR-10", title: "未処理Issue", due: today, labels: ["backend"] };
  const imported = { externalId: "jira:OPS-20", title: "配置済みIssue", due: tomorrow, labels: ["ops"] };
  const importedTask = {
    key: "private/tasks/External.md:8",
    due: tomorrow,
    tags: [externalReferenceTag(imported.externalId)],
    timeBlock: { date: dayAfterTomorrow, startMinutes: 600, endMinutes: 660 },
  };
  view.plugin = {
    settings: { externalItemState: { imported: { [imported.externalId]: "2026-10-12T00:00:00.000Z" }, dismissed: {} } },
    importExternalItem: async (item) => item.externalId === pending.externalId ? "private/tasks/External.md:9" : importedTask.key,
    dismissExternalItem: async () => {},
  };
  view.external = { errors: {}, linear: [pending], jira: [imported], slack: [] };
  view.issueLabelFilter = "";
  view.issueShowHandled = true;
  view.query = "";
  const refreshedDates = [];
  view.refreshCalendar = async (options = {}) => {
    assert.equal(options.throwOnFailure, true);
    refreshedDates.push(view.calendarDate);
    view.external = { errors: {}, calendar: [{ date: view.calendarDate }], linear: [], jira: [], slack: [] };
  };
  view.render = async () => {};
  view.renderExternal({ createDiv: () => {} }, [importedTask]);

  const pendingModel = view.externalIssuesModel.items.find((item) => item.externalId === pending.externalId);
  await pendingModel.onImportAndPlan();
  assert.equal(view.filter, "calendar");
  assert.equal(view.calendarDate, today);
  assert.deepEqual([...view.calendarSelectedTaskKeys], ["private/tasks/External.md:9"]);
  assert.equal(view.calendarSelectionMode, true);

  const importedModel = view.externalIssuesModel.items.find((item) => item.externalId === imported.externalId);
  assert.equal(importedModel.state, "imported");
  await importedModel.onPlan();
  assert.equal(view.calendarDate, dayAfterTomorrow);
  assert.deepEqual([...view.calendarSelectedTaskKeys], []);
  assert.equal(view.calendarSelectionMode, false);
  assert.deepEqual(refreshedDates, [today, dayAfterTomorrow]);
  assert.equal(view.external.calendar[0].date, dayAfterTomorrow);
}

async function testInboxPlanningRestoresViewAfterRenderFailure() {
  const view = Object.create(TaktuneView.prototype);
  const item = { externalId: "linear:PPR-11", title: "描画失敗を再試行", due: "2026-10-15", labels: ["backend"] };
  view.plugin = {
    settings: { externalItemState: { imported: {}, dismissed: {} } },
    importExternalItem: async () => "private/tasks/External.md:11",
  };
  view.external = { errors: {}, linear: [item], jira: [], slack: [] };
  view.filter = "inbox";
  view.calendarMode = "week";
  view.calendarDate = "2026-10-09";
  view.calendarSelectedTaskKeys = new Set(["private/tasks/Before.md:1"]);
  view.calendarSelectionMode = false;
  view.calendarTrayCollapsed = true;
  const originalExternal = view.external;
  const refreshedDates = [];
  view.refreshCalendar = async (options = {}) => {
    assert.equal(options.throwOnFailure, true);
    refreshedDates.push(view.calendarDate);
    view.external = { errors: {}, calendar: [{ date: view.calendarDate }], linear: [], jira: [], slack: [] };
  };
  let failRender = true;
  view.render = async () => {
    if (failRender) {
      failRender = false;
      throw new Error("React描画失敗");
    }
  };
  const inbox = view.renderInboxModel([]);
  await assert.rejects(inbox.onImportAndPlan(inbox.items[0]), /React描画失敗/u);
  assert.equal(view.filter, "inbox");
  assert.equal(view.calendarMode, "week");
  assert.equal(view.calendarDate, "2026-10-09");
  assert.deepEqual([...view.calendarSelectedTaskKeys], ["private/tasks/Before.md:1"]);
  assert.equal(view.calendarSelectionMode, false);
  assert.equal(view.calendarTrayCollapsed, true);
  assert.equal(view.external, originalExternal);
  await inbox.onImportAndPlan(inbox.items[0]);
  assert.equal(view.filter, "calendar");
  assert.equal(view.calendarMode, "day");
  assert.equal(view.calendarDate, "2026-10-15");
  assert.deepEqual([...view.calendarSelectedTaskKeys], ["private/tasks/External.md:11"]);
  assert.equal(view.calendarSelectionMode, true);
  assert.equal(view.calendarTrayCollapsed, false);
  assert.deepEqual(refreshedDates, ["2026-10-15", "2026-10-15"]);
  assert.equal(view.external.calendar[0].date, "2026-10-15");
}

async function testCalendarRefreshKeepsInboxSources() {
  const view = Object.create(TaktuneView.prototype);
  const linear = [{ externalId: "linear:PPR-12", title: "候補を保持" }];
  const calls = [];
  let partial = true;
  view.plugin = {
    loadCalendar: async (date, days) => {
      calls.push({ date, days });
      return { items: [{ id: `calendar:${date}`, date }], errors: partial ? ["購読A: HTTP 503"] : [] };
    },
  };
  view.calendarMode = "day";
  view.calendarDate = "2026-10-16";
  view.external = { calendar: [{ id: "old" }], linear, jira: [], slack: [], errors: { linear: "認証待ち", calendar: "古いエラー" } };

  await view.refreshCalendar();
  assert.deepEqual(calls, [{ date: "2026-10-16", days: 1 }]);
  assert.equal(view.external.linear, linear);
  assert.equal(view.external.calendar[0].date, "2026-10-16");
  assert.equal(view.external.errors.linear, "認証待ち");
  assert.match(view.external.errors.calendar, /購読A/u);

  partial = false;
  await view.refreshCalendar();
  assert.equal(view.external.errors.calendar, undefined);
  assert.equal(view.external.errors.linear, "認証待ち");

  const beforeStrictFailure = view.external;
  view.plugin.loadCalendar = async () => { throw new Error("Google timeout"); };
  await view.refreshCalendar();
  assert.deepEqual(view.external.calendar, []);
  assert.match(view.external.errors.calendar, /Google timeout/u);
  assert.equal(view.external.linear, linear);
  const afterGracefulFailure = view.external;
  await assert.rejects(view.refreshCalendar({ throwOnFailure: true }), /Google timeout/u);
  assert.equal(view.external, afterGracefulFailure);
  assert.notEqual(view.external, beforeStrictFailure);

  let resolveOldCalendar;
  let resolveNewCalendar;
  view.plugin.loadCalendar = (date) => new Promise((resolve) => {
    if (date === "2026-10-17") resolveOldCalendar = resolve;
    else resolveNewCalendar = resolve;
  });
  view.calendarDate = "2026-10-17";
  const oldRequest = view.refreshCalendar();
  view.calendarDate = "2026-10-18";
  const newRequest = view.refreshCalendar();
  resolveNewCalendar({ items: [{ id: "new", date: "2026-10-18" }], errors: [] });
  await newRequest;
  resolveOldCalendar({ items: [{ id: "old", date: "2026-10-17" }], errors: [] });
  await oldRequest;
  assert.equal(view.external.calendar[0].id, "new");

  let resolveFullRefresh;
  view.plugin.loadExternalItems = () => new Promise((resolve) => { resolveFullRefresh = resolve; });
  view.plugin.loadCalendar = async () => ({ items: [{ id: "latest-calendar", date: "2026-10-19" }], errors: [] });
  const fullRequest = view.refreshExternal();
  view.calendarDate = "2026-10-19";
  await view.refreshCalendar();
  resolveFullRefresh({ calendar: [{ id: "stale-calendar" }], linear: [{ externalId: "linear:new" }], jira: [], slack: [], errors: {} });
  await fullRequest;
  assert.equal(view.external.calendar[0].id, "latest-calendar");
  assert.equal(view.external.linear[0].externalId, "linear:new");

  const fullRequests = [];
  view.plugin.loadExternalItems = () => new Promise((resolve, reject) => fullRequests.push({ reject, resolve }));
  const staleFullFailure = view.refreshExternal();
  const latestFullSuccess = view.refreshExternal();
  fullRequests[1].resolve({ calendar: [{ id: "latest-full" }], linear: [], jira: [], slack: [], errors: {} });
  assert.equal(await latestFullSuccess, true);
  fullRequests[0].reject(new Error("古い全外部同期の失敗"));
  assert.equal(await staleFullFailure, false);
  assert.equal(view.external.calendar[0].id, "latest-full");
}

async function testRenderStrictModePropagatesFailure() {
  const view = Object.create(TaktuneView.prototype);
  const failure = new Error("Vault scan failed");
  let renderedFailure = null;
  view.containerEl = { children: [{}, { addClasses: () => {}, toggleClass: () => {}, style: {} }] };
  view.plugin = {
    collectTasks: async () => { throw failure; },
    collectTrashTasks: async () => [],
    collectNotes: async () => [],
  };
  view.renderFailure = (error) => { renderedFailure = error; };

  await view.render();
  assert.equal(renderedFailure, failure);
  renderedFailure = null;
  await assert.rejects(view.render({ throwOnFailure: true }), /Vault scan failed/u);
  assert.equal(renderedFailure, null);
}

async function testStaleRenderCannotReplaceLatestView() {
  const view = Object.create(TaktuneView.prototype);
  const requests = [];
  let renderedFailure = null;
  view.containerEl = { children: [{}, { addClasses: () => {}, toggleClass: () => {}, style: {} }] };
  view.plugin = {
    collectTasks: () => new Promise((_resolve, reject) => requests.push({ reject })),
    collectTrashTasks: async () => [],
    collectNotes: async () => [],
  };
  view.renderFailure = (error) => { renderedFailure = error; };

  const stale = view.render({ throwOnFailure: true });
  view.renderSequence += 1;
  requests[0].reject(new Error("古い画面の失敗"));
  assert.equal(await stale, false);
  assert.equal(renderedFailure, null);
  const latest = view.render();
  requests[1].reject(new Error("最新画面の失敗"));
  assert.equal(await latest, false);
  assert.match(renderedFailure.message, /最新画面/u);
}

async function testStatsIncludesPlanExecution() {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const view = Object.create(TaktuneView.prototype);
  view.plugin = { settings: { focusLog: [], habits: [], habitLog: {} } };
  view.renderStats({ createDiv: () => {} }, [{
    key: "planned-done",
    done: true,
    doneDate: today,
    wontDo: false,
    parentKey: "",
    priority: 1,
    list: "仕事",
    due: today,
    timeBlock: { date: today, endDate: today },
  }]);
  const metric = view.statsModel.summary.find((item) => item.label === "Plan execution in the last 7 days");
  assert.equal(metric.value, "1/1");
}

async function testStatsReviewNavigationRestoresFilter() {
  const view = Object.create(TaktuneView.prototype);
  view.plugin = { settings: migrateSettings({ focusLog: [], habits: [], habitLog: {} }) };
  view.filter = "stats";
  let failRender = true;
  view.render = async () => {
    if (failRender) {
      failRender = false;
      throw new Error("review render unavailable");
    }
  };
  view.renderStats({ createDiv: () => {} }, []);
  await assert.rejects(view.statsModel.onOpenReview(), /review render unavailable/u);
  assert.equal(view.filter, "stats");
  await view.statsModel.onOpenReview();
  assert.equal(view.filter, "review");
}

async function testReviewOverflowNavigationRestoresView() {
  const plugin = {
    settings: migrateSettings({ focusLog: [] }),
    statuses: () => [{ id: "todo" }],
  };
  const view = new TaktuneView(null, plugin);
  view.filter = "review";
  view.query = "入力中";
  view.reviewOverflowTaskKeys = new Set(["previous-overflow"]);
  let failRender = true;
  view.render = async () => {
    if (failRender) {
      failRender = false;
      throw new Error("task list unavailable");
    }
  };
  view.renderReview({ createDiv: () => {} }, []);
  await assert.rejects(view.reviewModel.onOpenRemainingCarryovers(), /task list unavailable/u);
  assert.equal(view.filter, "review");
  assert.equal(view.query, "入力中");
  assert.deepEqual([...view.reviewOverflowTaskKeys], ["previous-overflow"]);
  await view.reviewModel.onOpenRemainingCarryovers();
  assert.equal(view.filter, "review-overflow");
  assert.equal(view.query, "");

  view.reviewOverflowTaskKeys = new Set(["remaining-task"]);
  const shell = view.renderMainShell([], []);
  assert.match(shell.screen.contextAction.description, /まだ判断していない持ち越し/u);
  shell.screen.contextAction.onAction();
  assert.equal(view.filter, "review");
  assert.equal(view.reviewOverflowTaskKeys.size, 0);

  view.filter = "review-overflow";
  view.reviewOverflowTaskKeys = new Set(["stale-task"]);
  view.renderMainShell([], []).onSelect("today");
  assert.equal(view.filter, "today");
  assert.equal(view.reviewOverflowTaskKeys.size, 0);
}

async function testWorkspaceFocusRestoresSidebars() {
  const split = (collapsed) => ({
    collapsed,
    collapse() { this.collapsed = true; },
    expand() { this.collapsed = false; },
  });
  const dashboardLeaf = { getViewState: () => ({ type: "ticktick-dashboard-view" }) };
  const markdownLeaf = { getViewState: () => ({ type: "markdown" }) };
  const plugin = new TaktunePlugin();
  const leftSplit = split(false);
  const rightSplit = split(true);
  plugin.settings = migrateSettings({ collapseObsidianSidebars: true });
  plugin.app = { workspace: { leftSplit, rightSplit } };
  plugin.syncWorkspaceFocus(dashboardLeaf);
  assert.equal(leftSplit.collapsed, true);
  assert.equal(rightSplit.collapsed, true);
  plugin.syncWorkspaceFocus(markdownLeaf);
  assert.equal(leftSplit.collapsed, false);
  assert.equal(rightSplit.collapsed, true);

  plugin.settings.collapseObsidianSidebars = false;
  plugin.syncWorkspaceFocus(dashboardLeaf);
  assert.equal(leftSplit.collapsed, false);
  assert.equal(rightSplit.collapsed, true);
}

async function testLargeVaultCollectionPerformance() {
  const taskCount = 10_000;
  const lines = ["# Performance fixture"];
  for (let index = 0; index < taskCount; index += 1) {
    lines.push(`- [ ] 性能タスク ${index} 📋 Load #benchmark`);
    if (index % 10 === 0) {
      lines.push(`- 🗒️ ノート ${index}`);
      lines.push("  - [ ] ノート内のチェック項目");
      lines.push("  > 📝 集計対象外");
    }
  }
  const file = new StubTFile("private/tasks/Performance.md");
  const content = `${lines.join("\n")}\n`;
  file.stat = { ctime: 1, mtime: 1, size: content.length };
  const plugin = new TaktunePlugin();
  plugin.settings = migrateSettings({});
  let readCount = 0;
  let markdownEnumerationCount = 0;
  plugin.app = { vault: {
    getMarkdownFiles: () => { markdownEnumerationCount += 1; return [file]; },
    cachedRead: async () => { readCount += 1; return content; },
  } };
  const started = process.hrtime.bigint();
  const readCache = new Map();
  const [tasks, notes] = await Promise.all([plugin.collectTasks("active", readCache), plugin.collectNotes(readCache)]);
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
  assert.equal(tasks.length, taskCount);
  assert.equal(notes.length, taskCount / 10);
  assert.equal(readCount, 1);
  await Promise.all([plugin.collectTasks(), plugin.collectTrashTasks(), plugin.collectNotes()]);
  assert.equal(markdownEnumerationCount, 1, "dashboard collections must reuse one Vault file index");
  assert.equal(readCount, 1, "an unchanged 10,000-task file must not be reparsed");
  assert.equal(tasks.some((task) => task.raw === "ノート内のチェック項目"), false);
  assert.ok(elapsedMs < 2_000, `10,000タスクの走査が遅すぎる: ${elapsedMs.toFixed(1)}ms`);
  if (process.env.TTD_REPORT_PERF === "1") console.log(`10,000 tasks collected in ${elapsedMs.toFixed(1)}ms`);
}

async function testCollectionIndexTracksVaultEventsWithoutReenumeration() {
  const first = new StubTFile("private/tasks/First.md");
  first.stat = { ctime: 1, mtime: 1, size: 12 };
  first.content = "- [ ] first\n";
  const second = new StubTFile("private/tasks/Second.md");
  second.stat = { ctime: 2, mtime: 2, size: 13 };
  second.content = "- [ ] second\n";
  let enumerationCount = 0;
  const plugin = new TaktunePlugin();
  plugin.settings = migrateSettings({});
  plugin.app = { vault: {
    getMarkdownFiles: () => { enumerationCount += 1; return [first]; },
    getAbstractFileByPath: (path) => [first, second].find((file) => file.path === path) || null,
    cachedRead: async (file) => file.content,
    process: async (file, transform) => { file.content = transform(file.content); },
  } };

  assert.deepEqual((await plugin.collectTasks()).map((task) => task.raw), ["first"]);
  plugin.updateCollectionIndex("create", second);
  assert.deepEqual((await plugin.collectTasks()).map((task) => task.raw), ["first", "second"]);
  const previousSecondPath = second.path;
  second.path = "private/tasks/Renamed.md";
  plugin.updateCollectionIndex("rename", second, previousSecondPath);
  assert.deepEqual((await plugin.collectTasks()).map((task) => task.path), [first.path, second.path]);

  const oldFolder = "private/tasks";
  first.path = "archive/tasks/First.md";
  second.path = "archive/tasks/Renamed.md";
  plugin.updateCollectionIndex("rename", { path: "archive/tasks" }, oldFolder);
  const renamedTasks = await plugin.collectTasks();
  assert.deepEqual(renamedTasks.map((task) => task.path), [first.path, second.path]);
  assert.deepEqual(renamedTasks.map((task) => task.key), [`${first.path}:0`, `${second.path}:0`]);
  await plugin.mutateTask(renamedTasks[0], (line) => line.replace("first", "updated"), false);
  assert.equal(first.content, "- [ ] updated\n", "a task reparsed after folder rename must mutate through its new path");

  plugin.updateCollectionIndex("delete", { path: "archive/tasks" });
  assert.deepEqual(await plugin.collectTasks(), [], "a parent-only folder delete must evict indexed children");
  assert.equal(enumerationCount, 1);
}

async function testReminderTickSkipsUnchangedSettingsSave() {
  const plugin = new TaktunePlugin();
  plugin.settings = migrateSettings({});
  plugin.firedReminders = new Set();
  plugin.reminderQueue = [];
  plugin.activeReminder = null;
  plugin.collectTasks = async () => [];
  plugin.enqueueReminder = () => {};
  let saveCount = 0;
  plugin.saveSettings = async () => { saveCount += 1; };

  await plugin.checkReminders();
  assert.equal(saveCount, 0, "a reminder tick with no notification or pruning must not write settings");

  plugin.settings.reminderState.dismissed.expired = "2000-01-01T00:00:00.000Z";
  await plugin.checkReminders();
  assert.equal(saveCount, 1, "pruning durable reminder state must still be persisted");

  const now = new Date();
  const date = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  plugin.settings.reminderState.lastCheck = new Date(now.getTime() - 61_000).toISOString();
  plugin.collectTasks = async () => [{ key: "due", raw: "due", done: false, wontDo: false, reminders: [{ date, time }] }];
  await plugin.checkReminders();
  assert.equal(saveCount, 2, "a fired reminder must persist its checkpoint");
}

async function testDeepTaskCollectionStaysLinear() {
  const taskCount = 400;
  const lines = ["# Deep hierarchy"];
  for (let index = 0; index < taskCount; index += 1) {
    const indent = " ".repeat(index * 2);
    lines.push(`${indent}- [ ] 深いタスク ${index}`);
    lines.push(`${indent}  > 💬 2026-10-09T01:00:00.000Z コメント ${index}`);
  }
  const file = new StubTFile("private/tasks/Deep.md");
  file.stat = { ctime: 1, mtime: 1 };
  const content = `${lines.join("\n")}\n`;
  const plugin = new TaktunePlugin();
  plugin.settings = migrateSettings({});
  plugin.app = { vault: {
    getMarkdownFiles: () => [file],
    cachedRead: async () => content,
  } };
  const started = process.hrtime.bigint();
  const tasks = await plugin.collectTasks();
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
  assert.equal(tasks.length, taskCount);
  assert.equal(tasks.at(-1).depth, taskCount - 1);
  assert.equal(tasks.every((task) => task.comments.length === 1), true);
  assert.ok(elapsedMs < 1_000, `深い400タスクの走査が遅すぎる: ${elapsedMs.toFixed(1)}ms`);
  if (process.env.TTD_REPORT_PERF === "1") console.log(`400 deeply nested tasks collected in ${elapsedMs.toFixed(1)}ms`);
}

async function testNestedTaskRecordsKeepTheirIndentOwner() {
  const file = new StubTFile("private/tasks/Nested-records.md");
  file.stat = { ctime: 1, mtime: 1 };
  const content = [
    "- [ ] 親",
    "  - [ ] 子",
    "    > 💬 2026-10-09T01:00:00.000Z 子コメント",
    "  > 💬 2026-10-09T01:01:00.000Z 親コメント",
    "",
  ].join("\n");
  const plugin = new TaktunePlugin();
  plugin.settings = migrateSettings({});
  plugin.app = { vault: {
    getMarkdownFiles: () => [file],
    cachedRead: async () => content,
  } };
  const tasks = await plugin.collectTasks();
  assert.deepEqual(tasks.map((task) => task.comments.map((comment) => comment.text)), [["親コメント"], ["子コメント"]]);
}

async function testCollectionCacheOnlyReadsChangedFiles() {
  const first = new StubTFile("private/tasks/First.md");
  const second = new StubTFile("private/tasks/Second.md");
  first.stat = { ctime: 1, mtime: 1, size: 11 };
  second.stat = { ctime: 1, mtime: 1, size: 12 };
  const contents = new Map([
    [first.path, "- [ ] first\n"],
    [second.path, "- [ ] second\n"],
  ]);
  const reads = new Map();
  const plugin = new TaktunePlugin();
  plugin.settings = migrateSettings({});
  plugin.app = { vault: {
    getMarkdownFiles: () => [first, second],
    cachedRead: async (file) => {
      reads.set(file.path, (reads.get(file.path) || 0) + 1);
      return contents.get(file.path);
    },
  } };

  await plugin.collectTasks();
  await plugin.collectTasks();
  assert.deepEqual(Object.fromEntries(reads), { [first.path]: 1, [second.path]: 1 });

  contents.set(second.path, "- [ ] second updated\n");
  second.stat = { ...second.stat, mtime: 2, size: 20 };
  const tasks = await plugin.collectTasks();
  assert.deepEqual(Object.fromEntries(reads), { [first.path]: 1, [second.path]: 2 });
  assert.deepEqual(tasks.map((task) => task.raw), ["first", "second updated"]);
}

async function testCollectionCacheInvalidatesForVaultEvents() {
  const originalPath = "private/tasks/Original.md";
  const renamedPath = "private/tasks/Renamed.md";
  const file = new StubTFile(originalPath);
  file.stat = { ctime: 1, mtime: 1, size: 12 };
  const contents = new Map([[originalPath, "- [ ] first\n"]]);
  const plugin = new TaktunePlugin();
  plugin.settings = migrateSettings({});
  plugin.app = { vault: {
    getMarkdownFiles: () => [file],
    cachedRead: async (current) => contents.get(current.path),
  } };

  assert.deepEqual((await plugin.collectTasks()).map((task) => task.raw), ["first"]);
  contents.set(originalPath, "- [ ] fresh\n");
  plugin.invalidateCollectionCache(originalPath);
  assert.deepEqual((await plugin.collectTasks()).map((task) => task.raw), ["fresh"], "modify/create must invalidate an unchanged mtime/size signature");

  plugin.invalidateCollectionCache(originalPath);
  contents.set(originalPath, "- [ ] recreated\n");
  assert.deepEqual((await plugin.collectTasks()).map((task) => task.raw), ["recreated"], "delete then recreate at the same path must not reuse deleted content");

  const collision = new StubTFile(renamedPath);
  collision.stat = { ctime: 1, mtime: 1, size: 12 };
  contents.set(renamedPath, "- [ ] collision\n");
  await plugin.collectFileItems(collision);
  contents.delete(originalPath);
  file.path = renamedPath;
  contents.set(renamedPath, "- [ ] renamed\n");
  plugin.invalidateCollectionCache(renamedPath, originalPath);
  assert.equal(plugin.collectionCache.has(originalPath), false, "rename must remove the old path entry");
  assert.deepEqual((await plugin.collectTasks()).map((task) => task.raw), ["renamed"], "rename must evict an existing destination cache entry");

  const { resolveTaskLine } = TaktunePlugin.__test;
  const identified = { line: 0, indent: 0, raw: "対象 <!-- ttd:stable-id -->", taskId: "stable-id" };
  assert.equal(resolveTaskLine([
    "- [ ] unrelated",
    "- [ ] renamed externally <!-- ttd:stable-id -->",
  ], identified).index, 1, "a stable task ID must survive both line movement and external text edits");
  const untagged = { line: 0, indent: 0, raw: "対象", taskId: "" };
  assert.equal(resolveTaskLine(["heading", "- [ ] 対象"], untagged).index, 1, "an untagged task may be relocated by its exact raw identity");
  assert.equal(resolveTaskLine(["heading", "- [ ] 対象", "- [ ] 対象"], untagged), null, "an ambiguous relocation must abort");
  const duplicateIdentity = { line: 0, indent: 0, raw: "original <!-- ttd:duplicate-id -->", taskId: "duplicate-id" };
  assert.equal(resolveTaskLine([
    "- [ ] replacement <!-- ttd:duplicate-id -->",
    "- [ ] original <!-- ttd:duplicate-id -->",
  ], duplicateIdentity), null, "a duplicate stable ID must abort even when the stale line still matches another task");

  const mutationPath = "private/tasks/Concurrent.md";
  const mutationFile = new StubTFile(mutationPath);
  const mutationFiles = new Map([[mutationPath, { file: mutationFile, content: "- [ ] unrelated\n- [ ] target <!-- ttd:stable-id -->\n" }]]);
  const mutationPlugin = new TaktunePlugin();
  mutationPlugin.settings = migrateSettings({});
  mutationPlugin.app = { vault: {
    getAbstractFileByPath: (path) => mutationFiles.get(path)?.file || null,
    process: async (current, update) => { mutationFiles.get(current.path).content = update(mutationFiles.get(current.path).content); },
  } };
  const staleTask = { path: mutationPath, line: 0, indent: 0, raw: "target <!-- ttd:stable-id -->", taskId: "stable-id", done: false };
  await mutationPlugin.mutateTask(staleTask, (line) => line.replace("target", "updated"), false);
  assert.equal(mutationFiles.get(mutationPath).content, "- [ ] unrelated\n- [ ] updated <!-- ttd:stable-id -->\n");
  assert.equal(staleTask.line, 1);
  assert.equal(staleTask.raw, "updated <!-- ttd:stable-id -->");

  mutationFiles.get(mutationPath).content = "- [ ] unrelated\n- [ ] duplicate\n- [ ] duplicate\n";
  const ambiguousTask = { path: mutationPath, line: 0, indent: 0, raw: "duplicate", taskId: "", done: false };
  await assert.rejects(mutationPlugin.mutateTask(ambiguousTask, (line) => line.replace("duplicate", "wrong"), false), /moved|更新できない/u);
  assert.equal(mutationFiles.get(mutationPath).content, "- [ ] unrelated\n- [ ] duplicate\n- [ ] duplicate\n", "an ambiguous stale task must not mutate any task");
}

async function testCollectionIgnoresMarkdownMetadataAndFences() {
  const file = new StubTFile("private/tasks/Examples.md");
  file.stat = { mtime: 1, size: 200 };
  const content = [
    "---",
    'sample: "- [ ] frontmatter"',
    "---",
    "# Real tasks",
    "- [ ] collected",
    "````markdown",
    "- [ ] backtick sample",
    "```",
    "- [ ] still fenced",
    "````",
    "~~~text",
    "- [ ] tilde sample",
    "~~~",
	"- list container",
	"    ````markdown",
	"    - [ ] nested fence sample",
	"    ````",
	"root paragraph",
	"    - [ ] root indented sample",
  ].join("\n");
  const plugin = new TaktunePlugin();
  plugin.settings = migrateSettings({});
  plugin.app = { vault: { cachedRead: async () => content } };

  const items = await plugin.collectFileItems(file);
  assert.deepEqual(items.tasks.map((task) => task.raw), ["collected"]);
}

async function testReviewNoteOutput() {
  const plugin = new TaktunePlugin();
  plugin.settings = migrateSettings({ reviewDirectory: "private/reviews" });
  plugin.t = createTranslator("ja");
  const created = [];
  const folders = new Set();
  plugin.app = { vault: {
    adapter: { exists: async (path) => folders.has(path), mkdir: async (path) => folders.add(path) },
    getAbstractFileByPath: (path) => folders.has(path) || created.find((item) => item.path === path),
    getMarkdownFiles: () => created,
    cachedRead: async (file) => file.content,
    createFolder: async (path) => folders.add(path),
    create: async (path, content) => created.push({ path, content }),
    modify: async (file, content) => { file.content = content; },
  } };
  const review = {
    start: "2026-10-03",
    end: "2026-10-09",
    completed: [{ raw: "リリースする #external/linear/PPR-1 📅 2026-10-09", tags: ["external/linear/PPR-1"], doneDate: "2026-10-09" }],
    focusMinutes: 95,
    carryovers: [{ key: "task-1", raw: "設計を終える #external/jira/PPR-2 📅 2026-10-08", tags: ["external/jira/PPR-2"] }],
    carryoverContexts: { "task-1": "時間割・期限超過" },
    reflection: {
      carryoverReasons: { "task-1": "scope" },
      wins: "障害を解消",
      friction: "割り込み",
      lessons: "先に分割する",
      next: "設計を小さくする\nレビューを前倒し",
    },
  };
  const firstPath = await plugin.createReviewNote(review);
  const retryPath = await plugin.createReviewNote(review);
  assert.equal(firstPath, "private/reviews/2026-10-09.md");
  assert.equal(retryPath, firstPath);
  assert.equal(created.length, 1);
  assert.equal(created[0].path, "private/reviews/2026-10-09.md");
  assert.match(created[0].content, /- \[x\] リリースする（Linear） ✅ 2026-10-09/u);
  assert.match(created[0].content, /設計を終える（Jira） — 時間割・期限超過 \/ 大きすぎた/u);
  assert.match(created[0].content, /## 次の7日間で重視すること\n\n- \[ \] 設計を小さくする\n- \[ \] レビューを前倒し/u);
  review.reflection.lessons = "再試行で学びを更新する";
  const updatedPath = await plugin.createReviewNote(review);
  assert.equal(updatedPath, firstPath);
  assert.equal(created.length, 1);
  assert.match(created[0].content, /再試行で学びを更新する/u);
}

async function testSettingsBackupRestore() {
  const files = new Map();
  const plugin = new TaktunePlugin();
  plugin.manifest = { id: "ticktick-dashboard", dir: ".obsidian/plugins/ticktick-dashboard" };
  plugin.app = { vault: {
    configDir: ".obsidian",
    adapter: {
      exists: async (path) => files.has(path),
      mkdir: async () => {},
      read: async (path) => files.get(path),
      write: async (path, content) => files.set(path, content),
    },
  } };
  plugin.settings = migrateSettings({ lists: ["現在"] });
  await plugin.writeSettingsBackup({ settingsVersion: 2, lists: ["移行前"], linearApiKey: "secret" });
  const raw = files.get(".obsidian/plugins/ticktick-dashboard/settings-backup.json");
  assert.equal(raw.includes("secret"), false);
  let saved = null;
  plugin.saveData = async (settings) => { saved = structuredClone(settings); };
  const previousWindow = globalThis.window;
  globalThis.window = { confirm: () => true };
  try {
    assert.equal(await plugin.restoreSettingsBackupWithConfirmation(), true);
  } finally {
    globalThis.window = previousWindow;
  }
  assert.deepEqual(saved.lists, ["移行前"]);
  assert.deepEqual(plugin.settings.lists, ["移行前"]);
  const beforeRestore = JSON.parse(files.get(".obsidian/plugins/ticktick-dashboard/settings-before-restore.json"));
  assert.deepEqual(beforeRestore.settings.lists, ["現在"]);
}

async function testSettingsSavesAreSerializedAndCoalesced() {
  const plugin = new TaktunePlugin();
  plugin.settings = migrateSettings({ reviewDraft: { wins: "first" } });
  const writes = [];
  const releases = [];
  plugin.saveData = async (settings) => {
    writes.push(structuredClone(settings));
    await new Promise((resolve) => releases.push(resolve));
  };

  const firstSave = plugin.saveSettings();
  await Promise.resolve();
  assert.equal(writes.length, 1);

  plugin.settings.reviewDraft.wins = "second";
  const secondSave = plugin.saveSettings();
  plugin.settings.reviewDraft.friction = "latest";
  const latestSave = plugin.saveSettings();
  await Promise.resolve();
  assert.equal(writes.length, 1, "a settings write must not overtake an in-flight write");

  releases.shift()();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(writes.length, 2, "pending settings saves should coalesce into one write");
  assert.equal(writes[1].reviewDraft.wins, "second");
  assert.equal(writes[1].reviewDraft.friction, "latest");

  releases.shift()();
  await Promise.all([firstSave, secondSave, latestSave]);
  assert.equal(writes.length, 2);
}

async function testSettingsSaveQueueRecoversAfterFailure() {
  const plugin = new TaktunePlugin();
  plugin.settings = migrateSettings({ reviewDraft: { wins: "failed" } });
  const writes = [];
  let failNext = true;
  plugin.saveData = async (settings) => {
    if (failNext) {
      failNext = false;
      throw new Error("disk unavailable");
    }
    writes.push(structuredClone(settings));
  };

  const failedSave = plugin.saveSettings();
  plugin.settings.reviewDraft.friction = "saved after failure";
  const pendingSave = plugin.saveSettings();
  await assert.rejects(failedSave, /disk unavailable/u);
  await pendingSave;
  assert.equal(writes.length, 1);
  assert.equal(writes[0].reviewDraft.wins, "failed");
  assert.equal(writes[0].reviewDraft.friction, "saved after failure");
}

async function testIntegrationDiagnostics() {
  const plugin = new TaktunePlugin();
  plugin.settings = migrateSettings({
    googleCalendarEnabled: true,
    linearSecretId: "linear-secret",
    jiraBaseUrl: "https://jira.example",
    jiraEmail: "user@example.com",
    jiraSecretId: "jira-secret",
    slackSecretId: "slack-secret",
    slackBookmarkChannelIds: ["C1"],
  });
  plugin.app = { secretStorage: { getSecret: (id) => id.endsWith("secret") ? "token" : null } };
  plugin.loadCalendar = async () => ({ items: [{ id: "event" }], errors: [] });
  plugin.loadLinear = async () => [{ id: "issue-1" }, { id: "issue-2" }];
  plugin.loadJira = async () => { throw new Error("401 Unauthorized"); };
  plugin.loadSlackBookmarks = async () => [];
  assert.deepEqual(await plugin.testIntegrations(), [
    "Google Calendar: 接続成功（1件）",
    "Linear: 接続成功（2件）",
    "Jira: 失敗 — 401 Unauthorized",
    "Slack: 接続成功（0件）",
  ]);
}

async function testReviewFocusTaskRetryReuse() {
  const cached = new Map();
  let created = 0;
  const createTask = async () => {
    created += 1;
    return "private/tasks/TODO Inbox.md:10";
  };
  const first = await resolveReviewFocusTaskKey("配布を安定させる", "", cached, createTask);
  const retry = await resolveReviewFocusTaskKey("配布を安定させる", "", cached, createTask);
  assert.equal(first, "private/tasks/TODO Inbox.md:10");
  assert.equal(retry, first);
  assert.equal(created, 1);
  const existing = await resolveReviewFocusTaskKey("既存重点", "private/tasks/TODO Inbox.md:3", cached, createTask);
  assert.equal(existing, "private/tasks/TODO Inbox.md:3");
  assert.equal(created, 1);
}

async function testReviewDraftSurvivesViewRecreation() {
  let saves = 0;
  const plugin = {
    settings: migrateSettings({ reviewDraft: { wins: "前倒しできた", next: "配布を安定させる", carryoverReasons: { "task-1": "blocked" } } }),
    saveSettings: async () => { saves += 1; },
  };
  const first = new TaktuneView(null, plugin);
  assert.equal(first.reviewDraft.wins, "前倒しできた");
  assert.equal(first.reviewDraft.carryoverReasons["task-1"], "blocked");
  first.reviewDraft.lessons = "中断前に保存する";
  await first.persistReviewDraft();
  assert.equal(saves, 1);
  const reopened = new TaktuneView(null, plugin);
  assert.equal(reopened.reviewDraft.lessons, "中断前に保存する");
  assert.equal(reopened.reviewDraft.next, "配布を安定させる");
}

async function testReviewCarryoverFocusKeepsSelectedIdentity() {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const identified = [];
  const plugin = {
    settings: migrateSettings({ reviewDraft: {} }),
    statuses: () => [{ id: "todo" }, { id: "doing" }],
    ensureTaskIdentity: async (task) => { identified.push(task.key); return `focus-${task.key}`; },
    createReviewNote: async () => {},
    saveSettings: async () => {},
  };
  const tasks = [
    { key: "same:first", raw: "[同名](https://example.com/first)", done: false, due: today, timeBlock: { date: today }, status: "doing" },
    { key: "same:selected", raw: "[同名](https://example.com/second)", done: false, due: today, timeBlock: { date: today }, status: "doing" },
  ];
  const view = new TaktuneView(null, plugin);
  view.render = async () => {};
  view.renderReview({ createDiv: () => {} }, tasks);
  view.reviewModel.onFocusSourceChange("同名", "same:selected");
  view.reviewModel.onDraftChange("next", "同名");
  await view.reviewModel.onPersistDraft({ wins: "", friction: "", lessons: "", next: "同名" }, {});
  assert.deepEqual(plugin.settings.reviewDraft.focusTaskKeys, { 同名: "same:selected" });
  const reopened = new TaktuneView(null, plugin);
  reopened.render = async () => {};
  reopened.renderReview({ createDiv: () => {} }, tasks);
  await reopened.reviewModel.onSave();
  assert.deepEqual(identified, ["same:selected"]);
  assert.deepEqual(plugin.settings.lastReview.focusIds, { 同名: "focus-same:selected" });
}

async function testReviewMetricsCarryAcrossWeeks() {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  let notePayload = null;
  let openedReview = "";
  const savedSettings = [];
  const plugin = {
    app: {
      vault: { getMarkdownFiles: () => [
        ...Array.from({ length: 10 }, (_, index) => {
          const day = String(index + 1).padStart(2, "0");
          return { path: `private/reviews/2026-10-${day}.md`, basename: `2026-10-${day}` };
        }),
        { path: "private/reviews/README.md", basename: "README" },
        { path: "private/reviews/archive/2026-09-30.md", basename: "2026-09-30" },
        { path: "private/notes/not-a-review.md", basename: "not-a-review" },
      ] },
      workspace: { openLinkText: async (path) => { openedReview = path; } },
    },
    settings: migrateSettings({
      lastReview: { date: "2026-10-02", next: ["配布を安定させる"], metrics: { completed: 1, focusMinutes: 30, planned: 4, planCompleted: 1 } },
      focusLog: [{ date: today, minutes: 90, title: "実装" }],
      reviewDraft: { next: "次のIssueを選ぶ" },
    }),
    statuses: () => [{ id: "todo" }, { id: "doing" }],
    ensureTaskIdentity: async (task) => task.taskId || `focus-${task.key}-12345678`,
    createReviewNote: async (payload) => { notePayload = payload; },
    saveSettings: async function () { savedSettings.push(structuredClone(this.settings)); },
  };
  const view = new TaktuneView(null, plugin);
  view.render = async () => {};
  const tasks = [
    { key: "done", raw: "完了タスク", done: true, doneDate: today, timeBlock: { date: today, endDate: today }, status: "todo" },
    { key: "missed", raw: "持ち越し", done: false, doneDate: "", timeBlock: { date: today, endDate: today }, status: "doing" },
  ];
  view.renderReview({ createDiv: () => {} }, tasks);
  assert.deepEqual(view.reviewModel.history.map((item) => item.label), ["2026-10-10", "2026-10-09", "2026-10-08", "2026-10-07", "2026-10-06", "2026-10-05", "2026-10-04", "2026-10-03"]);
  await view.reviewModel.history[0].onOpen();
  assert.equal(openedReview, "private/reviews/2026-10-10.md");
  assert.equal(view.reviewModel.summary[0].comparison, "Previous 1 · ±0");
  assert.equal(view.reviewModel.summary[1].comparison, "Previous 25% · +25pt");
  assert.equal(view.reviewModel.summary[2].comparison, "Previous 30 min · +60 min");
  await view.reviewModel.onSave();
  assert.equal(notePayload.completed.length, 1);
  assert.deepEqual(plugin.settings.lastReview.metrics, { completed: 1, focusMinutes: 90, planned: 2, planCompleted: 1 });
  assert.deepEqual(plugin.settings.lastReview.next, ["次のIssueを選ぶ"]);
  assert.deepEqual(plugin.settings.lastReview.focusIds, {});
  assert.equal(savedSettings.length, 1);
  assert.deepEqual(savedSettings[0].reviewDraft, emptyReviewDraft());
  assert.deepEqual(view.reviewDraft, emptyReviewDraft());
}

function testReviewTwoPeriodCycle() {
  const tasks = [
    { key: "cycle-1-done", done: true, doneDate: "2026-10-07", timeBlock: { date: "2026-10-05", endDate: "2026-10-05" }, due: "2026-10-05", parentKey: null, wontDo: false },
    { key: "cycle-1-completed-late", done: true, doneDate: "2026-10-10", timeBlock: { date: "2026-10-06", endDate: "2026-10-06" }, due: "2026-10-06", parentKey: null, wontDo: false },
    { key: "cycle-2-done", done: true, doneDate: "2026-10-14", timeBlock: { date: "2026-10-10", endDate: "2026-10-10" }, due: "2026-10-10", parentKey: null, wontDo: false },
    { key: "cycle-2-missed", done: false, doneDate: "", timeBlock: { date: "2026-10-12", endDate: "2026-10-12" }, due: "2026-10-13", parentKey: null, wontDo: false },
  ];
  const focusLog = [
    { date: "2026-10-06", minutes: 30 },
    { date: "2026-10-11", minutes: 40 },
    { date: "2026-10-14", minutes: 20 },
    { date: "2026-10-15", minutes: 999 },
  ];

  const first = reviewPeriodSnapshot(tasks, focusLog, "2026-10-07");
  assert.equal(first.start, "2026-10-01");
  assert.deepEqual(first.completed.map((task) => task.key), ["cycle-1-done"]);
  assert.deepEqual(first.planReview.planned.map((task) => task.key), ["cycle-1-done", "cycle-1-completed-late"]);
  assert.deepEqual(first.planReview.completed.map((task) => task.key), ["cycle-1-done"]);
  assert.deepEqual(first.planReview.missed.map((task) => task.key), ["cycle-1-completed-late"]);
  assert.equal(first.planReview.rate, 50);
  assert.equal(first.focusMinutes, 30);

  const firstMetrics = {
    completed: first.completed.length,
    focusMinutes: first.focusMinutes,
    planned: first.planReview.planned.length,
    planCompleted: first.planReview.completed.length,
  };
  const second = reviewPeriodSnapshot(tasks, focusLog, "2026-10-14");
  assert.equal(second.start, "2026-10-08");
  assert.deepEqual(second.completed.map((task) => task.key), ["cycle-1-completed-late", "cycle-2-done"]);
  assert.deepEqual(second.planReview.planned.map((task) => task.key), ["cycle-2-done", "cycle-2-missed"]);
  assert.deepEqual(second.planReview.completed.map((task) => task.key), ["cycle-2-done"]);
  assert.equal(second.focusMinutes, 60);
  assert.deepEqual(second.carryovers.map((task) => task.key), ["cycle-2-missed"]);
  assert.equal(second.carryoverOverflowCount, 0);
  assert.equal(second.carryoverContexts["cycle-2-missed"], "Scheduled and overdue");
  assert.equal(reviewMetricComparison(second.completed.length, firstMetrics.completed, "件"), "Previous 1件 · +1件");
  assert.equal(reviewPlanComparison(second.planReview.completed.length, second.planReview.planned.length, firstMetrics.planCompleted, firstMetrics.planned), "Previous 50% · ±0pt");
  assert.equal(reviewMetricComparison(second.focusMinutes, firstMetrics.focusMinutes, "分"), "Previous 30分 · +30分");
}

async function testReviewSaveFailureRestoresDraftTransaction() {
  const plugin = {
    settings: migrateSettings({
      lastReview: { date: "2026-10-02", next: ["旧重点"], metrics: { completed: 2, focusMinutes: 45, planned: 2, planCompleted: 1 } },
      reviewPromptSnoozedUntil: "2026-10-16",
      reviewDraft: { wins: "維持する", lessons: "失敗しても残す", next: "次の重点" },
    }),
    statuses: () => [{ id: "todo" }],
    ensureTaskIdentity: async () => "",
    createReviewNote: async () => {},
    saveSettings: async () => { throw new Error("settings unavailable"); },
  };
  const previousLastReview = structuredClone(plugin.settings.lastReview);
  const previousDraft = structuredClone(plugin.settings.reviewDraft);
  const view = new TaktuneView(null, plugin);
  view.render = async () => {};
  view.renderReview({ createDiv: () => {} }, []);
  await assert.rejects(view.reviewModel.onSave(), /settings unavailable/u);
  assert.deepEqual(plugin.settings.lastReview, previousLastReview);
  assert.equal(plugin.settings.reviewPromptSnoozedUntil, "2026-10-16");
  assert.deepEqual(plugin.settings.reviewDraft, previousDraft);
  assert.equal(view.reviewDraft.lessons, "失敗しても残す");
  assert.equal(view.reviewDraft.next, "次の重点");
}

async function testReviewSaveReturnsToToday() {
  const plugin = {
    settings: migrateSettings({ reviewDraft: { wins: "完了した", lessons: "学んだ", next: "次週の重点" } }),
    statuses: () => [{ id: "todo" }],
    ensureTaskIdentity: async () => "",
    createReviewNote: async () => {},
    saveSettings: async () => {},
  };
  const view = new TaktuneView(null, plugin);
  view.filter = "review";
  let renders = 0;
  view.render = async () => { renders += 1; };
  view.renderReview({ createDiv: () => {} }, []);
  await view.reviewModel.onSave();
  assert.equal(view.filter, "today");
  assert.deepEqual(plugin.settings.lastReview.next, ["次週の重点"]);
  assert.deepEqual(view.reviewDraft, emptyReviewDraft());
  assert.equal(renders, 1);
  view.tasks = [];
  const reminder = view.renderReviewReminderModel();
  assert.equal(reminder.reviewDue, false);
  assert.equal(reminder.focus.items[0].title, "次週の重点");
  assert.equal(reminder.focus.items[0].label, "Not created");
  assert.equal(reminder.focus.items[0].action, "plan");
}

async function testReviewFocusCreationFailureKeepsCurrentView() {
  const plugin = {
    settings: migrateSettings({ lastReview: { date: "2026-10-09", next: ["保存できない重点"], focusIds: {} } }),
    addTask: async () => undefined,
    collectTasks: async () => [],
  };
  const view = new TaktuneView(null, plugin);
  view.filter = "today";
  view.calendarDate = "2026-10-12";
  view.calendarSelectedTaskKeys = new Set(["existing-task"]);
  view.tasks = [];
  await assert.rejects(view.planReviewFocusItem("保存できない重点"), /時間割へ移動しなかった/u);
  assert.equal(view.filter, "today");
  assert.equal(view.calendarDate, "2026-10-12");
  assert.deepEqual([...view.calendarSelectedTaskKeys], ["existing-task"]);
  assert.equal(view.reviewFocusTaskKeys.has("保存できない重点"), false);
}

async function testReviewDismissFailureRestoresSnooze() {
  const plugin = {
    settings: migrateSettings({
      lastReview: { date: "2000-01-01", next: [], focusIds: {} },
      reviewPromptSnoozedUntil: "",
    }),
    saveSettings: async () => { throw new Error("settings unavailable"); },
  };
  const view = new TaktuneView(null, plugin);
  view.tasks = [];
  view.render = async () => {};
  const reminder = view.renderReviewReminderModel();
  assert.equal(reminder.reviewDue, true);
  await assert.rejects(reminder.onDismiss(), /settings unavailable/u);
  assert.equal(plugin.settings.reviewPromptSnoozedUntil, "");
  assert.equal(view.renderReviewReminderModel().reviewDue, true);
}

async function testBatchScheduleIsAtomicAcrossFiles() {
  const plugin = new TaktunePlugin();
  const first = new StubTFile("private/tasks/first.md");
  const second = new StubTFile("private/tasks/second.md");
  first.content = "- [ ] 先のタスク\n- [ ] 後のタスク";
  second.content = "- [ ] 別ファイルのタスク";
  const originals = new Map([[first.path, first.content], [second.path, second.content]]);
  const files = new Map([[first.path, first], [second.path, second]]);
  let failSecond = false;
  let injectExternalEdit = false;
  plugin.app = { vault: {
    getAbstractFileByPath: (path) => files.get(path),
    cachedRead: async (file) => file.content,
    process: async (file, transform) => {
      if (failSecond && file.path === second.path) {
        if (injectExternalEdit) first.content += "\nexternal edit";
        throw new Error("simulated write failure");
      }
      file.content = transform(file.content);
    },
  } };
  const tasks = [
    { key: "first:0", path: first.path, line: 0, indent: 0, raw: "先のタスク" },
    { key: "first:1", path: first.path, line: 1, indent: 0, raw: "後のタスク" },
  ];
  await plugin.batchScheduleTasks(
    [{ ...tasks[1], line: 0 }],
    "2026-10-13",
    8 * 60,
    30,
  );
  assert.doesNotMatch(first.content.split("\n")[0], /⏰/u, "a stale line must not update the task now occupying it");
  assert.match(first.content, /後のタスク ⏰ 2026-10-13 08:00-08:30/u);
  first.content = originals.get(first.path);

  first.content = "- [ ] duplicate\n- [ ] duplicate";
  const secondBeforeAmbiguousAbort = second.content;
  await assert.rejects(
    plugin.batchScheduleTasks([
      { key: "duplicate", path: first.path, line: 9, indent: 0, raw: "duplicate", taskId: "" },
      { key: "second:0", path: second.path, line: 0, indent: 0, raw: "別ファイルのタスク", taskId: "" },
    ], "2026-10-13", 9 * 60, 30),
    /位置|moved/u,
  );
  assert.equal(first.content, "- [ ] duplicate\n- [ ] duplicate", "ambiguous identity must abort before any write");
  assert.equal(second.content, secondBeforeAmbiguousAbort, "preflight failure must leave every file untouched");
	first.content = "- [ ] first duplicate <!-- ttd:same-id -->\n- [ ] second duplicate <!-- ttd:same-id -->";
	await assert.rejects(
		plugin.batchScheduleTasks([
			{ key: "same-id", path: first.path, line: 0, indent: 0, raw: "first duplicate <!-- ttd:same-id -->", taskId: "same-id" },
		], "2026-10-13", 9 * 60, 30),
		/位置|moved/u,
	);
	assert.equal(first.content, "- [ ] first duplicate <!-- ttd:same-id -->\n- [ ] second duplicate <!-- ttd:same-id -->", "duplicate stable IDs must abort without a write");
	first.content = "- [ ] 後のタスク\n- [ ] 後のタスク";
	await assert.rejects(
		plugin.batchScheduleTasks([
			{ ...tasks[1], line: 0 },
		], "2026-10-13", 9 * 60, 30),
		/位置|moved/u,
	);
	assert.equal(first.content, "- [ ] 後のタスク\n- [ ] 後のタスク", "an inserted same-raw task at the stale line must make identity ambiguous");

	first.content = [
		"- [ ] same title",
		"  - [ ] child A",
		"  > 📝 note A",
		"- [ ] same title",
		"  - [ ] child B",
		"  > 📝 note B",
	].join("\n");
	await assert.rejects(
		plugin.batchScheduleTasks([
			{ key: "same-title", path: first.path, line: 0, indent: 0, raw: "same title", taskId: "" },
		], "2026-10-13", 9 * 60, 30),
		/位置|moved/u,
	);
	assert.doesNotMatch(first.content, /⏰/u, "subtask or note differences must not disambiguate identical task lines");
  first.content = originals.get(first.path);

  await plugin.batchScheduleTasks(tasks, "2026-10-13", 9 * 60, 30);
  assert.match(first.content, /先のタスク ⏰ 2026-10-13 09:00-09:30/u);
  assert.match(first.content, /後のタスク ⏰ 2026-10-13 09:30-10:00/u);
  first.content = originals.get(first.path);
  await plugin.batchMoveTaskTimes([
    { ...tasks[0], timeBlock: { date: "2026-10-13", startMinutes: 9 * 60, endMinutes: 9 * 60 + 30 } },
    { ...tasks[1], timeBlock: { date: "2026-10-13", startMinutes: 10 * 60, endMinutes: 11 * 60 } },
  ], () => "2026-10-14");
  assert.match(first.content, /先のタスク ⏰ 2026-10-14 09:00-09:30/u);
  assert.match(first.content, /後のタスク ⏰ 2026-10-14 10:00-11:00/u);
  first.content = originals.get(first.path);
  failSecond = true;
  await assert.rejects(plugin.batchScheduleTasks([...tasks.slice(0, 1), { key: "second:0", path: second.path, line: 0, indent: 0, raw: "別ファイルのタスク" }], "2026-10-13", 9 * 60, 30), /simulated write failure/u);
  assert.equal(first.content, originals.get(first.path));
  assert.equal(second.content, originals.get(second.path));

  first.content = originals.get(first.path);
  failSecond = true;
  injectExternalEdit = true;
  let failure;
  try {
    await plugin.batchScheduleTasks([...tasks.slice(0, 1), { key: "second:0", path: second.path, line: 0, indent: 0, raw: "別ファイルのタスク" }], "2026-10-13", 9 * 60, 30);
  } catch (error) {
    failure = error;
  }
  assert.ok(failure, "the injected second-file failure must be reported");
  assert.match(first.content, /external edit/u, "rollback must preserve an edit made after its own write");
  assert.match(first.content, /⏰ 2026-10-13/u, "CAS rollback must not partially overwrite the externally edited content");
  assert.deepEqual(failure.recovery.preservedExternalEditPaths, [first.path]);
  assert.deepEqual(failure.recovery.recoveredPaths, []);
}

async function testExternalPlanningReviewLoop() {
  const plugin = new TaktunePlugin();
  const files = new Map();
  const folders = new Set();
  const makeFile = (path, content = "") => {
    const file = new StubTFile(path);
    file.stat = { ctime: Date.now(), mtime: Date.now() };
    file.content = content;
    files.set(path, file);
    return file;
  };
  plugin.settings = migrateSettings({ reviewDirectory: "private/reviews" });
  plugin.saveSettings = async () => {};
  plugin.app = { vault: {
    adapter: { exists: async (path) => folders.has(path), mkdir: async (path) => folders.add(path) },
    getAbstractFileByPath: (path) => files.get(path) || (folders.has(path) ? { path } : null),
    getMarkdownFiles: () => [...files.values()],
    createFolder: async (path) => { folders.add(path); },
    create: async (path, content) => makeFile(path, content),
    cachedRead: async (file) => file.content,
    append: async (file, content) => { file.content += content; file.stat.mtime = Date.now(); },
    process: async (file, transform) => { file.content = transform(file.content); file.stat.mtime = Date.now(); },
  } };
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const importedKey = await plugin.importExternalItem({
    externalId: "linear:PPR-9000",
    title: "移行計画を確定する",
    due: today,
    labels: ["source:linear", "status:In Progress"],
    url: "https://linear.example/PPR-9000",
  });
  let tasks = await plugin.collectTasks();
  let task = tasks.find((item) => item.key === importedKey);
  assert.ok(task);
  assert.equal(externalSourceLabel(task), "Linear");
  assert.equal(task.timeBlock, null);

  await plugin.setTaskTime(task, today, 9 * 60, 60);
  tasks = await plugin.collectTasks();
  task = tasks.find((item) => item.key === importedKey);
  assert.equal(task.timeBlock.date, today);
  assert.equal(task.timeBlock.startMinutes, 9 * 60);
  assert.equal(externalSourceLabel(task), "Linear");

  await plugin.toggleTask(task);
  tasks = await plugin.collectTasks();
  task = tasks.find((item) => item.key === importedKey);
  assert.equal(task.done, true);
  assert.equal(task.doneDate, today);
  const review = weeklyPlanReview(tasks, today, today);
  assert.deepEqual(review.planned.map((item) => item.key), [importedKey]);
  assert.deepEqual(review.completed.map((item) => item.key), [importedKey]);

  await plugin.createReviewNote({
    start: today,
    end: today,
    completed: review.completed,
    focusMinutes: 60,
    reflection: { wins: "計画どおり完了", lessons: "時間枠を先に決める", next: "次のIssueを選ぶ" },
  });
  const reviewFile = [...files.values()].find((file) => file.path.startsWith("private/reviews/"));
  assert.ok(reviewFile);
  assert.match(reviewFile.content, /移行計画を確定する（Linear）/u);
  assert.match(reviewFile.content, /## 集中\n\n- 60分/u);
  assert.match(reviewFile.content, /次のIssueを選ぶ/u);

  plugin.settings.lastReview = { date: today, next: ["次のIssueを選ぶ"] };
  const nextFocus = previousReviewFocus(plugin.settings.lastReview);
  const focusState = (items) => reviewFocusProgress(nextFocus, items.map((item) => ({
    id: item.taskId,
    title: cleanDescription(item.raw),
    doneDate: item.done ? item.doneDate : "",
    scheduled: Boolean(item.timeBlock),
  })));
  assert.equal(focusState(tasks).items[0].label, "Not created");

  const nextKey = await plugin.addTask("次のIssueを選ぶ", today);
  tasks = await plugin.collectTasks();
  let nextTask = tasks.find((item) => item.key === nextKey);
  assert.equal(focusState(tasks).items[0].label, "Unscheduled");
  const nextTaskId = await plugin.ensureTaskIdentity(nextTask);
  nextFocus.ids["次のIssueを選ぶ"] = nextTaskId;
  await plugin.mutateTask(nextTask, (line) => line.replace("次のIssueを選ぶ", "次のIssueを選定する"), false);
  tasks = await plugin.collectTasks();
  nextTask = tasks.find((item) => item.taskId === nextTaskId);
  assert.ok(nextTask);
  assert.equal(cleanDescription(nextTask.raw), "次のIssueを選定する");
  assert.equal(focusState(tasks).items[0].label, "Unscheduled");

  await plugin.setTaskTime(nextTask, today, 14 * 60, 45);
  tasks = await plugin.collectTasks();
  nextTask = tasks.find((item) => item.key === nextKey);
  assert.equal(focusState(tasks).items[0].label, "Scheduled");

  await plugin.toggleTask(nextTask);
  tasks = await plugin.collectTasks();
  assert.equal(focusState(tasks).items[0].label, "Completed");
}

async function testMobilePluginLifecycle() {
  if (process.env.TTD_SIMULATE_MOBILE !== "1") return;
  const plugin = new TaktunePlugin();
  const commands = [];
  const mobileFiles = new Map();
  let registeredView = "";
  let detachedView = "";
  const previousWindow = globalThis.window;
  globalThis.window = { innerWidth: 390, setInterval: () => 1 };
  plugin.manifest = { id: "ticktick-dashboard", version: "0.1.0", dir: ".obsidian/plugins/ticktick-dashboard" };
  plugin.app = {
    secretStorage: {
      getSecret: (key) => ({
        "ticktick-dashboard-linear": "linear-token",
        "ticktick-dashboard-jira": "jira-token",
        "ticktick-dashboard-slack": "slack-token",
      })[key] || "",
    },
    vault: {
      configDir: ".obsidian",
      getAbstractFileByPath: () => null,
      on: () => () => {},
      adapter: {
        exists: async (path) => mobileFiles.has(path),
        read: async (path) => mobileFiles.get(path),
        write: async (path, value) => { mobileFiles.set(path, value); },
		rename: async (from, to) => {
			if (!mobileFiles.has(from)) throw new Error(`Missing mobile file: ${from}`);
			mobileFiles.set(to, mobileFiles.get(from));
			mobileFiles.delete(from);
		},
		remove: async (path) => { mobileFiles.delete(path); },
        mkdir: async () => {},
      },
    },
    workspace: {
      activeLeaf: null,
      leftSplit: { collapsed: true },
      rightSplit: { collapsed: true },
      on: () => () => {},
      onLayoutReady: (callback) => callback(),
      getLeavesOfType: () => [],
      iterateAllLeaves: () => {},
      detachLeavesOfType: (type) => { detachedView = type; },
    },
  };
  plugin.loadData = async () => ({ settingsVersion: SETTINGS_SCHEMA_VERSION, googleCalendarEnabled: false });
  plugin.saveData = async () => {};
  plugin.registerView = (type) => { registeredView = type; };
  plugin.addRibbonIcon = () => {};
  plugin.addCommand = (command) => { commands.push(command.id); };
  plugin.addSettingTab = () => {};
  plugin.registerEvent = () => {};
  plugin.registerInterval = () => {};
  plugin.checkReminders = async () => {};
  try {
    await plugin.onload();
    const mobileView = new TaktuneView(null, plugin);
    assert.equal(mobileView.calendarTrayCollapsed, true);
    assert.equal(registeredView, "ticktick-dashboard-view");
	assert.deepEqual(commands, ["open-dashboard", "quick-add-task", "enable-system-notifications", "test-reminder", "diagnostics", "restore-settings-backup", "recover-stale-task-mutation-claim"]);
    assert.equal(plugin.settings.settingsVersion, SETTINGS_SCHEMA_VERSION);
    assert.equal(plugin.firedReminders instanceof Set, true);
    const mobileDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    const mobileEnd = new Date(`${mobileDate}T12:00:00Z`);
    mobileEnd.setUTCDate(mobileEnd.getUTCDate() + 1);
    const mobileEndDate = mobileEnd.toISOString().slice(0, 10);
    mobileFiles.set("private/.ticktick-dashboard/google-calendar-cache.json", JSON.stringify({
      version: 1,
      updatedAt: new Date().toISOString(),
      ranges: [{ start: mobileDate, end: mobileEndDate }],
      items: [{ ...cachedEvent, date: mobileDate, calendarId: "primary" }],
    }));
    plugin.settings.googleCalendarEnabled = true;
    plugin.settings.googleCalendarIds = ["primary"];
    const mobileCalendar = await plugin.loadCalendar(mobileDate, 1);
    assert.equal(mobileCalendar.items.length, 1);
    assert.match(mobileCalendar.items[0].calendarName, /同期済み/u);
    plugin.settings.jiraBaseUrl = "https://jira.example";
    plugin.settings.jiraEmail = "mobile@example.com";
    plugin.settings.slackBookmarkChannelIds = ["C123"];
    requestUrlMock = async ({ url, headers }) => {
      if (url === "https://api.linear.app/graphql") {
        assert.equal(headers.Authorization, "linear-token");
        return { status: 200, json: { data: { viewer: { assignedIssues: { nodes: [{ identifier: "MOB-1", title: "Mobile Linear", url: "https://linear.example/MOB-1", dueDate: mobileDate, priority: 2, state: { name: "Started" } }] } } } } };
      }
      if (url.startsWith("https://jira.example/")) {
        assert.match(headers.Authorization, /^Basic /u);
        return { status: 200, json: { issues: [{ key: "MOB-2", fields: { summary: "Mobile Jira", status: { name: "進行中" }, duedate: mobileDate, priority: { name: "High" } } }] } };
      }
      if (url.startsWith("https://slack.com/api/bookmarks.list")) {
        assert.equal(headers.Authorization, "Bearer slack-token");
        return { status: 200, json: { ok: true, bookmarks: [{ id: "B1", channel_id: "C123", title: "Mobile Slack", link: "https://slack.example/B1" }] } };
      }
      throw new Error(`unexpected mobile request: ${url}`);
    };
    assert.equal((await plugin.loadLinear())[0].externalId, "linear:MOB-1");
    assert.equal((await plugin.loadJira())[0].externalId, "jira:MOB-2");
    assert.equal((await plugin.loadSlackBookmarks())[0].externalId, "slack:C123:B1");
    assert.deepEqual(await plugin.testIntegrations(false), [
      "Google Calendar: 接続成功（1件）",
      "Linear: 接続成功（1件）",
      "Jira: 接続成功（1件）",
      "Slack: 接続成功（1件）",
    ]);
    await assert.rejects(plugin.execGws(["calendar", "events", "list"]), /デスクトップ版のみ対応/u);
    await plugin.onunload();
    assert.equal(detachedView, "ticktick-dashboard-view");
  } finally {
    requestUrlMock = async () => ({});
    globalThis.window = previousWindow;
  }
}

Promise.all([testTrashRoundTrip(), testWontDoRoundTrip(), testTaskNoteRoundTrip(), testTaskDefaults(), testManualTaskOrdering(), testBatchPriorityAndTags(), testHabitArchiveAndCompletion(), testMergeTasksPreservesBlocks(), testStatusRoundTrip(), testSecretMigration(), testExternalItemImport(), testExternalIssuePlanningModel(), testInboxPlanningRestoresViewAfterRenderFailure(), testCalendarRefreshKeepsInboxSources(), testRenderStrictModePropagatesFailure(), testStaleRenderCannotReplaceLatestView(), testStatsIncludesPlanExecution(), testStatsReviewNavigationRestoresFilter(), testReviewOverflowNavigationRestoresView(), testDashboardLeafReuse(), testWorkspaceFocusRestoresSidebars(), testLargeVaultCollectionPerformance(), testCollectionIndexTracksVaultEventsWithoutReenumeration(), testReminderTickSkipsUnchangedSettingsSave(), testDeepTaskCollectionStaysLinear(), testNestedTaskRecordsKeepTheirIndentOwner(), testCollectionCacheOnlyReadsChangedFiles(), testCollectionCacheInvalidatesForVaultEvents(), testCollectionIgnoresMarkdownMetadataAndFences(), testReviewNoteOutput(), testSettingsBackupRestore(), testSettingsSavesAreSerializedAndCoalesced(), testSettingsSaveQueueRecoversAfterFailure(), testIntegrationDiagnostics(), testReviewFocusTaskRetryReuse(), testReviewDraftSurvivesViewRecreation(), testReviewCarryoverFocusKeepsSelectedIdentity(), testReviewMetricsCarryAcrossWeeks(), testReviewTwoPeriodCycle(), testReviewSaveFailureRestoresDraftTransaction(), testReviewSaveReturnsToToday(), testReviewFocusCreationFailureKeepsCurrentView(), testReviewDismissFailureRestoresSnooze(), testBatchScheduleIsAtomicAcrossFiles(), testExternalPlanningReviewLoop()]).then(() => testMobilePluginLifecycle()).then(() => console.log("repeat tests passed")).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
