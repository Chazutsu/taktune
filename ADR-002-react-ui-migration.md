# ADR-002: Migrate the Taktune UI to React 19

**Status:** Accepted

**Date:** 2026-10-09

**Deciders:** ebata / Codex

## Context

The previous UI placed DOM construction, state management, and vault operations in one `plugin.cjs`. Every new screen expanded the redraw surface and side-effect graph. Graphune demonstrated that an Obsidian view can remain testable when a React root, TypeScript components, Rolldown, Tailwind CSS 4, and service boundaries are used deliberately.

## Decision

Taktune uses React 19, TypeScript, Rolldown, and Tailwind CSS 4. A React root owns the Obsidian view lifecycle. Feature areas were migrated incrementally while preserving Markdown and settings compatibility. The temporary `src/legacy.css` was removed after the migration; equivalent UI is not maintained through parallel DOM and React implementations.

Migration order and status:

1. [x] React root and distribution bundle
2. [x] Navigation and application shell
3. [x] Unified Inbox, quick add, external triage, and task list
4. [x] Time blocking, unscheduled tray, timeline, and calendar views
5. [x] Weekly review and statistics
6. [x] Remaining screens, common modals, and settings surfaces
7. [x] Remove `legacy.css`

## UI boundaries

- Desktop does not duplicate primary navigation while its sidebar is open. Mobile navigation uses an explicit close control rather than light dismiss.
- Quick add keeps natural-language entry primary and treats templates, due-date controls, and parse previews as supporting controls.
- Task rows keep completion and status changes prominent; editing, duplication, conversion, and deletion live under per-row secondary actions.
- Calendar navigation, range switching, and search remain visible. List filters, external calendars, display settings, and multi-select are grouped in one explicit menu.
- The time grid owns hourly and half-hour marks, time zones, the current-time line, drop guidance, empty-space creation, task/event source labels, overlap lanes, Markdown links, selection, 15-minute adjustment, pointer resize, and unscheduling.
- Month, 4-week, agenda, and year views are React-owned, including date navigation, task drag-and-drop, event/activity display, and annual density.
- Weekly review preserves the sequence of evidence, carryover decisions, lessons, next-week priorities, and Markdown persistence. It accepts one to three priorities and keeps failed transitions retryable.
- Focus, habits, countdowns, matrix, board, notes, external issues, and statistics are React/Tailwind surfaces with non-drag alternatives where mobile interaction requires them.
- Authentication and connection configuration stays in settings; the external-issue view focuses on counts, labels, processing state, and failures.
- Obsidian's `PluginSettingTab`, `Setting`, `SecretComponent`, and `Modal` remain the integration primitives where they provide theme and SecretStorage compatibility.

## Styling constraints

- Tailwind Preflight is disabled so Taktune does not leak a global reset into Obsidian.
- Product tokens and components remain Taktune-owned.
- Narrow layouts stack form rows, wrap action groups, avoid hover-only controls, and provide 40–44px primary touch targets.
- Long subscription URLs and explanatory copy wrap instead of widening the viewport.

## Consequences

- React lifecycle and component tests define the interaction contract for the main flows.
- The release remains a self-contained CommonJS bundle despite split TypeScript and React sources.
- Completion requires behavioral regression tests plus desktop and mobile visual regression; source migration alone is not sufficient.
- Markdown syntax, existing settings, source tracking, and retry semantics remain stable across the UI migration.
