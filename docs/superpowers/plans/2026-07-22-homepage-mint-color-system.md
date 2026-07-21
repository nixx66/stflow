# Homepage Mint Color System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify every homepage marketing section around one mint-green palette without changing layout, copy, routes, or behavior.

**Architecture:** Treat the homepage components as one visual system and replace their unrelated white, yellow, neon-green, and gray-green surfaces with a fixed light/mid/deep mint scale. Add a source-level regression test that locks the approved palette and prevents the removed outlier colors from returning.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS 3, Node test runner.

## Global Constraints

- Keep homepage structure, content order, copy, interactions, and responsive behavior unchanged.
- Use green as the only accent hue.
- Page canvas: `#F7FBF4`; light surfaces: `#F1F8EC`, `#EAF6E3`, `#FBFFF8`; mid green: `#8FDE68`; accent green: `#0B8F58`; deep green: `#063F2C`.
- Main text remains `#07111F`; secondary text remains `#5F6F65`; borders use `#D8E8D3`.
- Do not deploy to Vercel in this task.

---

### Task 1: Lock the approved palette with a regression test

**Files:**
- Create: `tests/homepageColorSystem.test.ts`
- Test: `tests/homepageColorSystem.test.ts`

**Interfaces:**
- Consumes: homepage files under `app/page.tsx` and `components/home/*.tsx`.
- Produces: a Node test that rejects `#fff4a8` and `#9eef72`, and verifies the approved canvas, mid-green, and border colors are present.

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import test from "node:test";

test("homepage marketing sections use the unified mint palette", () => {
  const files = ["app/page.tsx", ...globSync("components/home/*.tsx")];
  const source = files.map((file) => readFileSync(file, "utf8")).join("\n").toLowerCase();

  assert.match(source, /#f7fbf4/);
  assert.match(source, /#8fde68/);
  assert.match(source, /#d8e8d3/);
  assert.doesNotMatch(source, /#fff4a8/);
  assert.doesNotMatch(source, /#9eef72/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/homepageColorSystem.test.ts`

Expected: FAIL because the current Product block contains `#9eef72`, the calculator contains `#fff4a8`, and the unified mid-green/border tokens are not yet used.

- [ ] **Step 3: Do not commit**

The workspace is not currently recognized as a Git repository, so preserve the test locally without attempting a commit.

### Task 2: Apply the mint scale to homepage sections

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/home/HeroSection.tsx`
- Modify: `components/home/ProductSurfaceGrid.tsx`
- Modify: `components/home/DashboardPreview.tsx`
- Modify: `components/home/WorkflowInfographic.tsx`
- Modify: `components/home/ReceiptAuditSection.tsx`
- Modify: `components/home/CTASection.tsx`
- Modify: `components/home/PaymentRequestCalculator.tsx`
- Test: `tests/homepageColorSystem.test.ts`

**Interfaces:**
- Consumes: the exact palette values in Global Constraints.
- Produces: the same homepage DOM and behavior with harmonized surfaces, borders, text neutrals, buttons, shadows, and optional calculator styling.

- [ ] **Step 1: Normalize outer section canvases**

Use `bg-[#f7fbf4]` on the homepage main, footer, and every outer homepage section currently using `bg-white`, `#fbfff7`, or nearby gray-green canvases.

- [ ] **Step 2: Normalize large content surfaces**

Use `#f1f8ec` and `#eaf6e3` for Dashboard, Workflow, and Receipt containers. Keep inner cards at `#fbfff8` or translucent white to preserve elevation.

- [ ] **Step 3: Calibrate the Product and CTA emphasis**

Replace Product `#9eef72` with `#8fde68`. Keep CTA and primary action surfaces at `#063f2c`; use `#8fde68` for CTA highlights instead of `#b9ff7a` when the brighter value reads as a second accent.

- [ ] **Step 4: Remove the yellow calculator accent**

Replace `#fff4a8` with `#eaf6e3`, and harmonize calculator borders and canvases to `#d8e8d3` and `#f1f8ec`.

- [ ] **Step 5: Run the focused test**

Run: `node --test tests/homepageColorSystem.test.ts`

Expected: PASS.

### Task 3: Verify behavior and visual continuity

**Files:**
- Modify: `design-qa.md`
- Create: `tmp/design-qa/homepage-color-unified-desktop.png`
- Create: `tmp/design-qa/homepage-color-unified-mobile.png`

**Interfaces:**
- Consumes: the completed homepage color implementation.
- Produces: passing automated verification and visual evidence at desktop and narrow widths.

- [ ] **Step 1: Run automated verification**

Run: `node --test tests/*.test.ts`

Expected: all tests pass.

Run: `node_modules\.bin\tsc.cmd --noEmit`

Expected: exit code 0 with no errors.

Run: `npm.cmd run build`

Expected: Next.js production build succeeds and all routes generate.

- [ ] **Step 2: Restart the local production preview**

Stop only the process listening on `127.0.0.1:3001`, then start `node stflow-server.js` with a hidden window. Verify `http://127.0.0.1:3001/` returns HTTP 200.

- [ ] **Step 3: Capture desktop and narrow-screen evidence**

Capture the full homepage at 1600px desktop width and 500px narrow width. Inspect both files and reject any capture that is blank, clipped, or still loading.

- [ ] **Step 4: Compare before and after**

Place `tmp/homepage-color-audit.png` and the final desktop screenshot into one comparison image. Confirm that yellow and isolated neon-green surfaces are gone, section transitions use the same canvas, text remains readable, and the dark CTA still provides a clear ending.

- [ ] **Step 5: Record QA**

Update `design-qa.md` with viewport sizes, screenshot paths, comparison history, P0-P3 findings, and `final result: passed` only when no P0, P1, or P2 issue remains.

- [ ] **Step 6: Do not commit or deploy**

Git metadata is currently unavailable and the approved scope excludes Vercel deployment.
