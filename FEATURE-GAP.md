# Product gap and quality audit

Last audited: 2026-10-12

Status terms:

- **Implemented:** behavior and its principal regression path are verified.
- **Validating:** code exists, but a live service, physical device, release channel, or sustained-use loop is not fully verified.
- **Not implemented:** intentionally tracked work with no complete supported behavior.
- **Out of scope:** delegated to Obsidian or another synchronization/collaboration layer.

Code presence alone is not completion. Desktop and mobile paths, migration, failure recovery, and distribution must also be accounted for.

## Product-quality gates

| Area | Current evidence | Status | Exit condition |
|---|---|---|---|
| Desktop | A synthetic 10,000-task + 1,000-note collection completed in 24.7ms; a real vault collected 33 tasks in 17ms and rendered in 27ms. A live Electron/CDP smoke covers Today, Unified Inbox, Schedule, Review, and Statistics. | Implemented | Keep the shell smoke current with Obsidian and primary UI changes. |
| Mobile | Responsive UI, a self-contained bundle, and startup without `node:child_process` or `Buffer` are covered. Jira Basic auth can use the Web API fallback. Google events use a synchronized desktop cache. | Validating | Complete installation, update, and primary interactions on a physical iPhone. |
| Distribution | Local/iCloud deployment stages all three artifacts, verifies hashes, updates enablement atomically, and rolls back failures. CI and release workflows validate BRAT artifacts. | Validating | Merge the complete plugin and workflow to the default branch and install/update a real GitHub release through BRAT on iPhone. |
| Migration | Settings schema v11, normalization, sanitized pre-migration backup, restore, and pre-restore backup have source/bundle and copied-live-data coverage. | Implemented | Repeat copied-live-data tests for every schema change. |
| Security | Integration secrets migrate to Obsidian SecretStorage. Plaintext secret persistence is rejected when SecretStorage is unavailable. | Validating | Verify reauthentication and SecretStorage failure recovery on each supported device. |
| Diagnostics | The diagnostics modal reports vault, plugin version, schema, task paths, SecretStorage, runtime, notifications, cache, integrations, and performance without copying secrets. | Validating | Verify connection tests, copy fallback, and recovery advice in physical-iPhone failure cases. |
| Maintainability | React 19, TypeScript, Rolldown, and Tailwind CSS 4 are in place; `legacy.css` is removed. Pure domains have direct tests and primary decision surfaces have desktop/mobile visual regression. | Validating | Continue splitting the remaining orchestration and promote only proven non-visual duplication to the shared kit. |
| Localization | English is the source locale, Japanese is supported, and explicit/System locale selection falls back to English. | Validating | Enforce key parity and complete manual review of every principal English and Japanese flow. |

## Competitive capability matrix

This table uses TickTick's public feature documentation as a comparison point, not as a claim of API or product compatibility.

| Area | Taktune coverage | Status | Remaining gap |
|---|---|---|---|
| Task basics | Due dates, priorities, lists, tags, repeats, multiple reminders, natural-language add | Implemented | Continue regression coverage. |
| Task detail | Notes, checklist hierarchy, attachments, comments, history, task/note conversion | Implemented | Continue regression coverage. |
| Sort and group | Manual, due, priority, name, created, updated, source; due/priority/list/tag/section/date groups | Implemented | Continue regression coverage. |
| Bulk actions | Date, priority, list, tags, complete, Won't Do, merge, trash | Implemented | Sharing remains delegated to vault synchronization. |
| Templates | Save, search, apply, drag/reorder | Implemented | Continue regression coverage. |
| Smart lists | Built-ins plus saved AND filters | Implemented | OR and NOT conditions are not implemented. |
| Kanban | Status, list, or section columns with drag-and-drop and mobile move controls | Implemented | Continue physical-device regression. |
| Timeline | Unscheduled tray, multi-day blocks, drag/drop, duration changes, free-slot placement | Implemented | Horizontal Gantt planning is not implemented. |
| Calendar | Day, 3-day, week, 4-week, month, year, agenda, extra time zones, Google and ICS | Implemented | Continue live-source regression. |
| Calendar bulk planning | Sequential placement and postpone by day/week/date | Implemented | Continue regression coverage. |
| Eisenhower matrix | Four quadrants, drag/drop, and mobile move controls based on importance/urgency tags | Implemented | Arbitrary user-defined quadrant rules are not implemented. |
| Focus | 25/50-minute timers, stopwatch, recovery, 7-day chart, 30-day and per-task statistics | Implemented | Continue regression coverage. |
| Habits | Weekdays or N/week, numeric target, reminders, history, heatmap, streaks, archive | Implemented | Continue regression coverage. |
| Countdowns | Upcoming/elapsed calculation, notes, color, reminders, flexible monthly/yearly recurrence | Implemented | Continue regression coverage. |
| Custom statuses | User-defined names, colors, order, and Kanban linkage | Validating | Verify schema migration and mobile management on a physical device. |
| External issues | Linear, Jira, and Slack triage with labels and source metadata preserved through review | Validating | Complete a live import → schedule → complete → review journey for each configured service. |
| Weekly review | Evidence, carryover reasons, lessons, 1–3 priorities, prior-period comparison, Markdown output, recent history | Validating | Verify several consecutive weekly cycles with real use. |
| Widgets and sticky notes | Obsidian views only | Out of scope | Delegate to Obsidian windows and mobile facilities. |
| Collaboration | Local Markdown and shared-vault compatibility | Out of scope | Delegate assignment, sync, and concurrent editing to Obsidian Sync, Git, or shared vaults. |

## Data integrity and failure recovery

- Collection is linear in Markdown line count and shares file reads between task and note aggregation. Nested note checkboxes are excluded where required by the task model.
- Inbox, trash note, and excluded path fragments are settings. Defaults preserve existing vault behavior, but product logic does not assume the `private` hierarchy.
- The task parser and serializer preserve notes, comments, attachments, subtasks, history, and metadata as one block during reorder, move, duplicate, merge, trash, and restore.
- Multi-file schedule and postpone operations snapshot affected files and roll back prior writes when a later write fails.
- Concurrent import of the same external ID is deduplicated. If settings persistence fails after task creation, a retry reuses the existing source-tagged task.
- External imported/dismissed state is corrected against Markdown: a missing task returns to the candidate queue rather than remaining hidden because settings say it was imported.
- Review finalization keeps the draft and previous settings until the Markdown note and settings commit both succeed. A retry reuses the same review note instead of duplicating it.
- Reminder state recovers up to 24 hours of missed checks after restart and persists snoozes and dismissals.
- A failed render shows an in-product retry surface instead of leaving a blank view. Strict transitions preserve the previous screen and selection so the user can retry.
- Render and integration refresh operations use request generations so stale scans, calendar results, or failures cannot overwrite a newer date, filter, or screen.

## Calendar and integration integrity

- Google and ICS refresh is separate from Linear, Jira, and Slack triage refresh. Date navigation does not refetch unrelated issue services.
- Partial calendar failure preserves successful event sources and reports the failed calendar and reason. Total failure clears stale events for the target range rather than presenting another date's data.
- Planning from Inbox, external issues, or review refreshes the target date's external events before placement. If conflict visibility cannot be established, the strict transition rolls back.
- Calendar cache entries have stable keys, merge bounded date ranges, cap at 2,000 events, and expire for trust purposes after 48 hours.
- Mobile reads cached Google data only when the selected calendars and date range are covered; an uncovered range is not represented as an empty schedule.
- ICS parsing handles line folding, escape decoding, timed and all-day events, daily/weekly/monthly/yearly recurrence, exclusions, cancellation, multi-day events, and invalid-input rejection through Obsidian-independent domain tests.
- Linear, Jira, Slack, Google Calendar, and ICS remain read-only. Taktune does not write back to external services.

## Mobile and interaction quality

- Primary narrow-screen actions use 40–44px interaction areas, avoid hover-only controls, and wrap rather than widening the viewport.
- Mobile navigation closes explicitly and is not light-dismissed by tapping the task surface.
- Matrix and Kanban provide select-based move controls when HTML drag-and-drop is unavailable.
- The unscheduled tray keeps explicitly selected work visible and sorted first even when saved filters or a changed search query would normally hide it.
- A placement operation locks duplicate controls, keeps selection on failure, and reports the failure inline.
- Safe-area insets are included for sticky actions.
- Dense desktop list surfaces are width-constrained; comparative timeline and board surfaces keep the width needed to compare columns.

## Distribution and release integrity

- Direct deployment first verifies that a destination resolves to `plugins/<plugin-id>`. It stages and hashes all artifacts before replacement and restores the previous set in reverse order on failure.
- Destinations are compared by `realpath`, preventing duplicate writes when a repository vault is a symlink to the same iCloud vault.
- `community-plugins.json` is updated atomically without duplicate IDs and read back after the update. Invalid existing JSON causes a safe failure instead of being overwritten.
- Mobile preflight verifies that `.obsidian` and synchronized task data belong to the same iCloud vault, the plugin is enabled and mobile-compatible, artifacts match by size and SHA-256, no staging/rollback residue remains, File Provider upload has completed, and the calendar cache is fresh enough.
- The iCloud-installed `main.js` is loaded in a Node-API-free harness and runs the external candidate → schedule → complete → review bundle journey.
- File Provider diagnostics distinguish an active upload from a stalled queue. On 2026-10-12, an iCloud Drive rebuild restored all three artifacts from a stalled state to `isUploaded=1`; this remains operational evidence, not an automated guarantee for every device.
- Pull requests restore all workspaces from the root lockfile and use Turborepo to build, type-check, and test Graphune, Taktune, and `obsidian-plugin-kit` in dependency order. A shared-kit change cannot pass by validating only one product.
- Release validation checks plugin ID, mobile support, artifact versions, minimum Obsidian version, empty or undersized artifacts, user-specific absolute paths, inline source maps, sizes, and SHA-256 hashes.

## Verified live evidence and open validation

- A 2026-10-12 live Obsidian smoke fetched two Google Calendar events successfully.
- Linear, Jira, and Slack were unconfigured in that vault. This is not treated as a feature failure, but their end-to-end live journeys remain unverified.
- Live copied-settings migration completed against local and iCloud inputs while keeping the originals unchanged and excluding secret keys.
- iCloud preflight reached READY after unresolved enablement conflicts were backed up and regenerated, the synchronization daemon was restarted, required items uploaded, hashes matched, the mobile harness started, and calendar cache checks passed.
- Physical-iPhone installation, update, settings management, and all primary interactions remain required before declaring mobile complete.

## Out-of-scope boundaries

- OS widgets and desktop sticky notes are delegated to Obsidian's window and mobile capabilities.
- Assignment, collaboration, and synchronization are delegated to Obsidian Sync, iCloud, Git, or a shared vault.
- External integrations remain read-only by design.

## Comparison sources

- [TickTick Task Details](https://help.ticktick.com/articles/7055782408586526720)
- [TickTick Add Tasks](https://help.ticktick.com/articles/7055782422935240704)
- [TickTick FAQ](https://help.ticktick.com/articles/7055792921664028672)
- [TickTick Calendar View Options](https://help.ticktick.com/articles/7055782085826445312)
- [TickTick Timeline View](https://help.ticktick.com/articles/7055780375439605760)
- [TickTick Better Achieve Habits](https://help.ticktick.com/articles/7055781805944733696)
- [TickTick What's New](https://help.ticktick.com/articles/7082552170989486080)
- [TickTick Features](https://ticktick.com/features)
