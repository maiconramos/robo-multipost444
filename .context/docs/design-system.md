# Design System Guide

## Source of Truth

The frontend design system is code-first and lives in this repository:

- Tokens: `src/app/globals.css`
- Semantic status mapping: `src/lib/design-system/status.ts`
- Shared status component: `src/components/shared/status-badge.tsx`
- Live catalog page: `src/app/dashboard/design-system/page.tsx`

If you need to update colors, radius, or semantic status tones, update tokens in `globals.css` first.

## Token Model

Core theme tokens use CSS variables in `:root` and `.dark`.

Semantic status tokens:

- `--status-info-bg|fg|border`
- `--status-success-bg|fg|border`
- `--status-warning-bg|fg|border`
- `--status-danger-bg|fg|border`
- `--status-neutral-bg|fg|border`

Tailwind v4 aliases are exposed via `@theme inline` as `--color-*` mappings, so components consume classes such as:

- `bg-status-info-bg`
- `text-status-success-fg`
- `border-status-warning-border`

## How to Add a New Semantic Variant

1. Add new CSS vars in `:root` and `.dark` in `src/app/globals.css`.
2. Expose aliases in the `@theme inline` block.
3. Extend `SemanticTone` and related maps in `src/lib/design-system/status.ts`.
4. Use the helper functions in components instead of hardcoding class strings.
5. Add or update examples on `/dashboard/design-system`.

## Governance Rules

`npm run lint` includes `npm run lint:design-system` (`scripts/check-design-system.mjs`), which blocks:

- Hardcoded Tailwind palette utilities (example: `bg-blue-500`, `text-green-600`)
- Hex literals in TS/TSX/CSS

Allowed exceptions:

- `src/lib/platforms/types.ts`
- `src/components/shared/platform-icon.tsx`
- `src/components/compose/post-preview.tsx`
- Hex in token declaration lines inside `src/app/globals.css`

## Exception Policy

Brand and platform colors are allowed only in explicitly approved files above.
Do not add new exceptions unless there is a strong product reason and the decision is documented here.
