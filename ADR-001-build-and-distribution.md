# ADR-001: Split development sources and ship a single bundle

**Status:** Accepted

**Date:** 2026-10-09

**Deciders:** ebata / Codex

## Context

The original `main.js` was approximately 6,300 lines and combined settings migrations, Markdown operations, external integrations, views, and modals. Loading relative runtime modules on Obsidian Mobile would make startup depend on every supporting file being synchronized correctly. A release must remain complete with only `main.js`, `styles.css`, and `manifest.json`.

## Decision

Development sources are split gradually by responsibility and bundled into one CommonJS `main.js` for distribution. Distribution checks stage all artifacts before replacement, roll back on failure, verify hashes, and validate `versions.json` compatibility.

## Options considered

| Option | Complexity | Mobile reliability | Long-term maintainability |
|---|---:|---:|---:|
| Load split files with relative `require` | Low | Low | Medium |
| Split sources and produce one bundle | Medium | High | High |
| Keep one development file | Low | Medium | Low |

Direct relative loading would reduce source-file size quickly, but one missed supporting file would break startup. Keeping one file would avoid a build step, but changes would remain difficult to isolate, review, and test. Bundling is the only option that combines internal separation with a self-contained mobile release.

## Consequences

- Mobile receives only three self-contained release artifacts.
- Pure domain logic, settings, integrations, and UI can be tested separately.
- Check and deploy commands must verify that source and bundle remain consistent.
- Build infrastructure becomes part of the supported release process.

## Action items

1. [x] Check artifact versions, staging, rollback, and hashes.
2. [x] Pin the minimum Obsidian version in `versions.json`.
3. [x] Add Rolldown as a development dependency.
4. [x] Move settings migration into `src/settings.cjs`.
5. [ ] Continue separating integrations, vault operations, and UI responsibilities.
6. [x] Run equivalent regression coverage against source and bundle.
7. [x] Require type, UI, distribution, desktop/mobile bundle, and release-artifact checks on pull requests.
8. [ ] Merge the complete plugin and release workflow into the default branch and validate installation from a real BRAT release.
