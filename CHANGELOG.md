# Changelog

All notable changes to Taktune are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses Semantic Versioning with an initial `0.1.x` patch-only release policy. The version in `manifest.json` is the release source of truth.

## [Unreleased]

## [0.1.2] - 2026-10-13

### Changed

- Removed Node.js process-module imports from the distributed plugin so the mobile-compatible manifest matches the runtime bundle ([#3](https://github.com/Chazutsu/taktune/issues/3)).
- Made Google Calendar cache consumption platform-neutral and retained public ICS subscriptions as the live, Node-free calendar path.

### Security

- Added a release gate that rejects mobile artifacts containing `child_process` or `node:util` imports.

## [0.1.1] - 2026-10-13

### Added

- Added GitHub Sponsors and GitHub Issues links to settings, documentation, release-check output, and repository funding metadata ([#2](https://github.com/Chazutsu/taktune/issues/2)).

### Changed

- Kept a focused parent task's subtree intact instead of promoting its descendants, and summarized direct and incomplete subtasks on the Today focus card ([#1](https://github.com/Chazutsu/taktune/issues/1)).

## [0.1.0] - 2026-10-12

### Added

- English and Japanese locale catalogs, with System, English, and Japanese language preferences.
- English render smoke tests and recursive localization gates that reject untranslated Japanese UI literals.
- Settings schema v12 with configurable Inbox, trash, review, data, backup, and dashboard paths, plus excluded task path fragments.
- English and Japanese public documentation, an MIT license, contribution guidelines, a security policy, and release-oriented CI.
- React 19, TypeScript, Rolldown, and Tailwind CSS 4 application architecture.
- Markdown-native task collection, Inbox triage, lists, tags, subtasks, recurring tasks, custom statuses, and smart filters.
- Calendar time blocking, Eisenhower matrix drag and drop, focus sessions, habits, countdowns, statistics, and weekly reviews.
- Read-only Google Calendar, Linear, Jira, and Slack bookmark integrations.
- Desktop, mobile-bundle, migration, distribution, Obsidian-shell, and visual regression coverage.

### Changed

- Made English the default for new installations while preserving Japanese for existing installations without a stored locale.
- Renamed the public product to Taktune while retaining the `ticktick-dashboard` plugin ID, secret IDs, backup format, and legacy storage paths for backward compatibility.
- Moved new-installation data defaults from private vault paths to the `Taktune/` namespace without relocating existing user data.
- Localized application UI, settings, notices, errors, generated Markdown, custom status defaults, and external-integration surfaces.
- Reorganized the UI into denser, responsive task, planning, review, and settings surfaces for desktop and mobile.
- Reworked public documentation around installation, data ownership, compatibility, verified limitations, and development workflows.
- Replaced the original imperative dashboard UI with componentized React views and domain modules.
- Preserved Markdown checkboxes as the task source of truth so task data remains usable without the plugin.

### Security

- Kept Linear, Jira, and Slack credentials in Obsidian SecretStorage and excluded legacy plaintext credential fields from persisted settings and backups.
- Added release artifact checks for metadata consistency, required bundle files, user-specific absolute paths, and inline source maps.
- Migrated external integration credentials to Obsidian SecretStorage and removed plaintext secrets from settings persistence and backups.

[Unreleased]: https://github.com/Chazutsu/taktune/compare/0.1.2...HEAD
[0.1.2]: https://github.com/Chazutsu/taktune/compare/0.1.1...0.1.2
[0.1.1]: https://github.com/Chazutsu/taktune/compare/v0.1.0...0.1.1
[0.1.0]: https://github.com/Chazutsu/taktune/releases/tag/v0.1.0
