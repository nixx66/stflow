# Responsive dashboard metric values

## Goal

Ensure every metric value in the homepage settlement console is fully visible without changing the four-card layout or removing the rolling-digit animation.

## Scope

- Update only the homepage metric cards rendered by `components/home/DashboardPreview.tsx` and their related rolling-number styles in `app/globals.css`.
- Keep the current card dimensions, typography character, colors, labels, units, and animation.
- Do not change dashboard data or other pages.

## Design

`RollingValue` will expose a length category derived from the displayed value. Long values such as `4,450` will receive a compact variant, while shorter values such as `98.4`, `12`, and `42` retain their current visual emphasis.

The CSS will use responsive `clamp()` sizing for the digit windows, punctuation, gap, and font size. The compact variant will reduce horizontal demand only as much as needed. The value remains on one line and is not truncated.

## Responsive behavior

- Standard values use the existing scale where space permits.
- Values with five or more displayed characters use the compact scale.
- At narrower card widths, CSS sizing contracts smoothly rather than jumping to a fixed small size.
- Punctuation remains visually aligned with rolling digits.

## Accessibility and motion

- Preserve the existing `aria-label` containing the complete value.
- Preserve the existing reduced-motion behavior.
- Do not hide digits or rely on horizontal scrolling.

## Verification

- Confirm `4,450` is fully visible at the current homepage viewport.
- Confirm all four metric cards remain aligned.
- Confirm short values do not become unnecessarily small.
- Run TypeScript checking and the relevant project tests/build checks.
