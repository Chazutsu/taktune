# Taktune Design System

This is an internal, product-specific design system. It follows the same decision order as the Blog product—tokens, components, then screens—but does not share Blog or Graphune visual language.

## Product character

- **Quiet planning:** help the user decide what to do and when; decoration must not compete with that decision.
- **Dense but legible:** increase desktop information density while preserving 44px mobile touch targets for primary actions.
- **Source-aware:** identify tasks, events, external issues, and records with text or iconography as well as color.
- **Progressive disclosure:** keep frequent actions visible; reveal settings and advanced taxonomy only when requested.

## Token layers

1. Obsidian semantic variables provide theme-compatible inputs.
2. `--ttd-color-*` and `--ttd-space-*` encode Taktune meaning.
3. Tailwind aliases such as `bg-ttd-canvas` and `text-ttd-muted` form the implementation API.

Do not add raw color, spacing, radius, control-height, shadow, or motion values without first explaining the missing semantic role. Obsidian variables are consumed only in `tokens.css`; screens choose meanings such as `canvas`, `surface`, `hover`, `selected`, `accent`, `danger`, and `priority-*`.

## Layout rules

- Keep the four primary routes visible in top navigation.
- Put supporting views and integrations in a menu or settings.
- Persist sidebar state; do not rely on light dismiss.
- Clamp long text to four lines in collections and show it in full in detail views.
- Include `safe-area-inset-bottom` in sticky actions.
- Preserve full width for comparative surfaces such as timeline and Kanban; constrain decision-oriented lists to reduce eye travel.

## Components

- `Button` variants are `default`, `primary`, `ghost`, and `danger`; screens do not redefine their colors.
- `compact` is for dense desktop controls. `touch`, or the mobile override, provides a 44px interaction area.
- Components mature inside Taktune. They are promoted only after Graphune or another product demonstrates the same non-visual problem and API.

## Ownership

- This document and `src/design-system/tokens.css` belong to Taktune.
- Taktune does not reference Graphune's `--hb-*` tokens.
- Shared candidates must satisfy the monorepo promotion criteria before entering `obsidian-plugin-kit`.
- Locale catalogs and product wording remain local even when locale resolution is shared.

## Adoption order

1. Application bar, screen headers, and primary navigation
2. Daily decision surfaces such as task lists and Unified Inbox
3. Modals and low-frequency settings
4. Calendar-specific visualization tokens; dynamic source colors remain data, not static design tokens

Contract tests reject direct Obsidian-variable use in primary decision surfaces. Adoption follows screen meaning and is not a mechanical global replacement.
