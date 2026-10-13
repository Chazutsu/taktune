# Contributing to Taktune

Taktune is under active development. Before opening a large pull request, start a discussion or issue so the scope and compatibility constraints are explicit.

## Development

Run commands from the repository root:

```bash
pnpm install
pnpm check:release
pnpm test
pnpm test:visual
```

Run all three commands when a change affects behavior, distribution artifacts, and visual output together.

## Pull requests

- Keep Markdown tasks and existing settings backward compatible.
- Keep the legacy plugin ID `ticktick-dashboard`; changing it would create a second Obsidian installation and orphan existing data.
- Add or update tests for behavior changes.
- Add visual coverage when changing a primary desktop or mobile flow.
- Keep product-specific copy, visual tokens, and components inside Taktune. Promote only proven, non-visual duplication to `obsidian-plugin-kit`.
- Never commit real vault data, credentials, personal paths, or generated test artifacts.
- Update [CHANGELOG.md](CHANGELOG.md) for user-visible changes.

## Localization

English is the source locale. Add or update the English key first, then update Japanese in the same change. Do not construct user-facing sentences by concatenating translated fragments; use interpolation with named values instead.

Before submitting, verify that every locale has the same keys and that missing keys fall back to English.

## Commit scope

Prefer one coherent change per pull request. Refactors must preserve observable behavior unless the pull request explicitly documents and tests the behavior change.
