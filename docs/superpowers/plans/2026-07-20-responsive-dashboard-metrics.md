# Responsive Dashboard Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep long homepage metric values fully visible while preserving the four-card layout and rolling animation.

**Architecture:** Add a small pure classifier that maps display-string length to a standard or compact presentation mode. `RollingValue` exposes that mode as a CSS class, and the existing stylesheet applies responsive digit, punctuation, and gap sizes to the compact mode.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Node test runner

## Global Constraints

- Keep the current four-card layout and rolling-digit animation.
- Do not change dashboard data or other pages.
- Preserve the complete accessible value through `aria-label`.
- Long values must stay on one line without truncation or horizontal scrolling.

---

### Task 1: Classify and render compact metric values

**Files:**
- Create: `lib/metric-value-size.ts`
- Create: `tests/metric-value-size.test.ts`
- Modify: `components/home/DashboardPreview.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `getMetricValueSize(value: string): "standard" | "compact"`
- Consumes: The existing `RollingValue({ value }: { value: string })` component.

- [ ] **Step 1: Write the failing classifier test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getMetricValueSize } from "../lib/metric-value-size";

test("uses compact sizing for metric values with five or more display characters", () => {
  assert.equal(getMetricValueSize("4,450"), "compact");
  assert.equal(getMetricValueSize("98.4"), "standard");
  assert.equal(getMetricValueSize("12"), "standard");
});
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `pnpm test`

Expected: FAIL because `lib/metric-value-size.ts` does not exist.

- [ ] **Step 3: Implement the minimal classifier**

```ts
export function getMetricValueSize(value: string): "standard" | "compact" {
  return value.length >= 5 ? "compact" : "standard";
}
```

- [ ] **Step 4: Run tests and verify the classifier passes**

Run: `pnpm test`

Expected: all tests PASS.

- [ ] **Step 5: Apply the classifier in `RollingValue`**

Import `getMetricValueSize`, compute `size`, and render:

```tsx
<span className={`sf-roll-value sf-roll-value--${size}`} aria-label={value}>
```

- [ ] **Step 6: Add compact responsive CSS**

Add rules that reduce `.sf-roll-window`, `.sf-roll-mark`, and the parent gap only within `.sf-roll-value--compact`, using `clamp()` values and retaining `flex-wrap: nowrap`.

- [ ] **Step 7: Run automated verification**

Run: `pnpm test` and `pnpm typecheck`.

Expected: both commands exit with code 0.

- [ ] **Step 8: Verify the rendered homepage**

Open `http://127.0.0.1:3001/` at the reported viewport, confirm `4,450` is fully visible, and confirm all four cards remain aligned with short values retaining visual emphasis.

- [ ] **Step 9: Commit when Git metadata is available**

```bash
git add tests/metric-value-size.test.ts lib/metric-value-size.ts components/home/DashboardPreview.tsx app/globals.css docs/superpowers
git commit -m "fix: make dashboard metric values responsive"
```

If the workspace remains unrecognized as a Git repository, report that the changes are verified but uncommitted.
