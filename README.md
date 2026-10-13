# Taktune

Tune your time. Taktune is an Obsidian-native workspace for tasks, time blocking, habits, focus sessions, and weekly reviews. Markdown remains the source of truth, so your tasks stay readable and editable without the plugin.

The interface defaults to English and also includes Japanese. Select **System default**, **English**, or **Japanese** in Taktune settings. See [README.ja.md](README.ja.md) for Japanese documentation.

> Compatibility note: the Obsidian plugin ID remains `ticktick-dashboard`. Existing storage paths, CSS hooks, secret IDs, and Markdown syntax keep their legacy names where changing them would break an existing vault.

## Highlights

- Collect Markdown checkboxes from across the vault into Today, Inbox, smart lists, saved filters, lists, tags, and custom statuses.
- Add tasks with natural-language dates, priorities, lists, tags, repeats, and reminders; preview the parsed result before saving.
- Plan work on day, 3-day, week, 4-week, month, year, and agenda views. Drag unscheduled tasks onto a timeline, resize them in 15-minute increments, or schedule several tasks into available time in one operation.
- Distinguish local tasks, Google Calendar events, subscribed ICS events, habits, focus time, countdowns, and read-only future repeats by type and source—not by color alone.
- Organize work with subtasks, sections, Kanban boards, an Eisenhower matrix, templates, estimates, progress, notes, attachments, comments, and task history.
- Track Pomodoro or stopwatch sessions, flexible habits, important dates, completion trends, and weekly review outcomes.
- Triage read-only Linear, Jira, and Slack items into Markdown tasks while preserving their source, external ID, link, labels, and due date.
- Use the same self-contained, Node.js-process-free plugin bundle on desktop and mobile. Taktune can read a bounded, freshness-checked Google Calendar cache already synchronized through the Vault.

## Requirements

- Obsidian `1.11.4` or later
- An iCloud-, Obsidian Sync-, or Git-synchronized vault if the same Markdown data should be available on multiple devices

The plugin does not require Dataview or Metadata Menu.

## Installation

### BRAT

1. Install BRAT `1.1.0` or later.
2. Add this repository in BRAT.
3. Install the latest Taktune release.
4. Enable **Taktune** under Obsidian's community plugins.

### Manual

Copy these release artifacts into `.obsidian/plugins/ticktick-dashboard/`:

- `main.js`
- `styles.css`
- `manifest.json`

Then reload Obsidian and enable **Taktune**.

## Language

Taktune resolves its UI locale in this order:

1. The locale selected in Taktune settings
2. Obsidian's locale when **System default** is selected
3. English as the fallback

Product copy is owned by Taktune under `src/locales`. Locale resolution and interpolation may be shared through `obsidian-plugin-kit`; product wording and design remain product-specific.

## Markdown data model

Taktune enriches ordinary Markdown tasks with compact, optional markers:

| Capability | Syntax |
|---|---|
| Due date | `📅 YYYY-MM-DD` |
| Completion date | `✅ YYYY-MM-DD` |
| Priority | `⏫` high, `🔼` medium, `🔽` low |
| Scheduled block | `⏰ YYYY-MM-DD HH:mm-HH:mm` |
| Multi-day block | `⏰ START_DATE START_TIME→END_DATE END_TIME` |
| List | `📋 List name` |
| Section | `🗂 Section name` |
| Progress | `📊 65%` |
| Estimate | `🍅 3` or `⏳ 90m` |
| Reminder | `🔔 YYYY-MM-DD HH:mm` |
| Repeat | `🔁 every day`, `every weekday`, `every 2 weeks`, and supported monthly/yearly forms |
| Note | An indented `> 📝 ...` line under the task |
| Comment | An indented `> 💬 ISO_TIMESTAMP ...` line |
| History | An indented `> 🕘 ISO_TIMESTAMP ...` line |
| Subtask | A checkbox indented two spaces deeper than its parent |

Tags use standard Obsidian `#tags`. Nested list and tag names such as `Work/Development` appear as a hierarchy in the sidebar.

Task, note, comment, attachment, history, and subtask blocks move together when a task is reordered, moved, duplicated, trashed, or restored. Deleting a task moves the block to the configured trash note instead of deleting it permanently.

## Storage settings and migrations

Settings schema version `12` validates and migrates older settings at startup. Fresh installs use a self-contained `Taktune/` folder, while existing non-empty settings keep their legacy locations until changed:

- Inbox note: `Taktune/Inbox.md`
- Trash note: `Taktune/Trash.md`
- Reviews: `Taktune/Reviews`
- Generated data and settings backups: `Taktune/.data`
- Reusable dashboard note: `Taktune/TODO.md`
- Excluded task path fragments: defaults to `/archive/`

Existing installations without these path fields continue using `private/tasks/TODO Inbox.md`, `private/tasks/TickTick Trash.md`, `private/reviews`, `private/.ticktick-dashboard`, and `private/TODO.md`. Their settings backups remain beside the plugin unless a backup folder is configured.

Before migration, Taktune writes a sanitized `settings-backup.json`; restoring settings first writes `settings-before-restore.json`. Plaintext Linear, Jira, and Slack credentials are excluded from normal settings, migrations, backups, and restores. Legacy plaintext credentials are migrated to Obsidian SecretStorage. If SecretStorage is unavailable, Taktune refuses to persist the secret instead of falling back to plaintext.

Imported and dismissed external-item histories are bounded to the latest 1,000 entries. The Google Calendar cache is bounded to 2,000 events, roughly six months of coverage, and warns when it is older than 48 hours.

## Task planning

- Quick add understands date/time phrases, priorities, lists, tags, repeats, and relative reminders. Defaults for due date, list, priority, and reminder time apply consistently to inline and command-palette entry.
- Smart lists cover Today, Tomorrow, Next 7 Days, Overdue, Scheduled, Repeating, and Won't Do. Saved filters combine keyword, list, tag, priority, and due-date conditions with AND semantics.
- Sorting supports smart, manual, due date, priority, name, creation time, update time, and source note. Grouping supports due date, priority, list, tag, section, creation time, and update time.
- Multi-select can move lists, change due dates or priorities, add or remove tags, complete, mark as Won't Do, merge, or trash tasks. Cross-file writes use rollback to avoid leaving a partial operation.
- Custom statuses have user-defined names, colors, and order and can drive Kanban columns.

## Calendar and time blocking

- Day, 3-day, week, 4-week, month, year, and agenda views share task and event search, density controls, and source-aware rendering.
- Day-based timelines support up to four additional IANA time zones, a current-time line, synchronized scrolling, drag-and-drop placement, pointer resizing, and conflict warnings.
- Empty timeline space can create a timed task directly. Unscheduled tasks can be searched, sorted, selected, and placed sequentially at a chosen time or into verified free slots.
- Multi-select can postpone scheduled tasks by one day, one week, or to a specific date while preserving time and duration.
- Google Calendar selection, names, and colors can be read from an existing synchronized cache. The default selection is only the primary calendar.
- Public Outlook, iCloud, and generic `https://` or `webcal://` ICS subscriptions support independent visibility, labels, colors, timed/all-day events, common recurrence rules, and exclusion dates.
- A partial calendar-source failure does not discard events fetched successfully from other sources; the timeline identifies the failed source and reason.

All external calendar and issue integrations are read-only. Taktune does not create or update data in Google Calendar, Linear, Jira, or Slack.

## Network and external access

Taktune uses Obsidian's `requestUrl` API only when a configured feature needs remote data:

- ICS subscription URLs entered by the user are fetched to render calendar events.
- `https://api.linear.app/graphql` is contacted when Linear import is enabled.
- The Jira base URL entered by the user is contacted when Jira import is enabled.
- `https://slack.com/api/bookmarks.list` is contacted when Slack import is enabled.

Linear, Jira, and Slack credentials stay in Obsidian SecretStorage. Taktune does not include analytics, telemetry, advertising, or an author-operated backend. The distributed `main.js` does not import Node.js process APIs or launch external executables.

## Reviews, focus, habits, and milestones

- Weekly review combines the previous seven days of completions, planned-time execution, focus records, overdue work, carryover reasons, lessons, and one to three next-week priorities into Markdown.
- Saved priorities can be sent back to the schedule. Taktune reuses an existing incomplete task where possible and keeps the operation retryable if navigation or persistence fails.
- The eight most recent saved reviews remain available as collapsed history without overwhelming the active review flow.
- Focus mode provides 25- and 50-minute timers plus a stopwatch, restart recovery, a 7-day chart, and 30-day totals by mode and task.
- Habits support selected weekdays or a weekly frequency, numeric targets, multiple reminder times, a 7-day history, a 35-day heatmap, streaks, historical correction, and archive-with-history.
- Countdowns cover upcoming or elapsed important dates, day-zero/day-one calculation, notes, colors, advance reminders, and monthly/yearly recurrence including end-of-month and nth-weekday rules.

## Mobile behavior

The distributed plugin is a single CommonJS `main.js` plus `styles.css` and `manifest.json`; runtime source modules are not required on the device. Mobile UI avoids hover-only actions, uses explicit navigation dismissal, exposes non-DnD alternatives for board and matrix moves, and expands primary touch targets to 40–44px at narrow widths.

Taktune does not execute `gws` or another external command on any platform. It reads a pre-existing synchronized Google Calendar cache only when that cache covers the selected calendars and date range; otherwise it reports the missing range. For live refresh without a companion cache producer, add a public Google Calendar ICS URL as a subscription.

## Development

The source of truth is `src/plugin.cjs`, `src/settings.cjs`, and `src/ui/**/*.tsx`. The UI uses React 19, TypeScript, Rolldown, and Tailwind CSS 4. Release artifacts at the plugin root are self-contained.

From the repository root:

```bash
pnpm test
pnpm test:visual
pnpm test:obsidian-shell
pnpm check:release
```

The shell test connects to an Obsidian desktop instance started with a debugging port and performs read-only navigation checks.

The **Release Taktune** workflow checks version consistency, runs the regression suite, and attaches `main.js`, `styles.css`, and `manifest.json` to a GitHub release when given the version from `manifest.json`.

## Quality and current limitations

- Desktop behavior, large-vault collection, bundle behavior, schema migration, and the principal task-to-review journey have automated coverage.
- Mobile startup is covered in a Node-API-free harness, but installation, updates, and the complete interaction flow still require recurring validation on a physical iPhone.
- Google Calendar cache rendering has automated coverage. Cache production is external to the plugin; Linear, Jira, and Slack were not configured in the live test environment, so their full live import-to-review journey remains unverified.
- Horizontal Gantt planning, OR/NOT saved-filter logic, arbitrary Eisenhower rules, OS widgets, sticky notes, and built-in multi-user collaboration are not implemented.
- Collaboration and synchronization are delegated to Obsidian Sync, iCloud, Git, or a shared vault.

See [FEATURE-GAP.md](FEATURE-GAP.md) for the detailed product-quality audit and [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for product-specific design rules.

## Support

- [Sponsor continued development](https://github.com/sponsors/ryo-ebata)
- [Report a bug or request a feature](https://github.com/Chazutsu/taktune/issues)

## License

[MIT](LICENSE)
