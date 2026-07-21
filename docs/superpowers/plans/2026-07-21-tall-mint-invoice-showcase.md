# Tall Mint Invoice Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the homepage invoice showcase as a tall, full-width, light-green financial scene with a floating frosted-glass invoice that faithfully matches the approved mock.

**Architecture:** Keep the existing `HeroSection` and its working navigation, but replace the dark video stage with one generated motion-ready financial background asset plus layered HTML invoice UI. Isolate layout and motion in named CSS classes so responsive and reduced-motion behavior can be verified without changing other homepage sections.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, CSS animations, Lucide React, built-in Image Gen, Node test runner

## Global Constraints

- The selected visual target is `D:/Codex/.codex/generated_images/019f7e0c-8fff-7402-887a-b5c37bdc6ce7/exec-c0f1ca2d-4c91-4847-b9f5-be7afc8c5738.png`.
- Modify only the homepage invoice showcase and its directly related styles/assets.
- Preserve navigation, CTA behavior, invoice data, homepage typography, and following sections.
- Align the showcase to the broad `max-w-[1760px]` grid used by the section below.
- Use a visible light mint/lime palette; do not use a dark green photographic background.
- Respect `prefers-reduced-motion: reduce`.
- Do not add dependencies or new routes.

---

### Task 1: Create and register the financial background asset

**Files:**
- Create: `public/stflow-invoice-flow-mint.webp`
- Test: `tests/heroInvoiceShowcase.test.ts`

**Interfaces:**
- Produces: `/stflow-invoice-flow-mint.webp`, a 16:9-or-taller light-green background without UI text.
- Consumes: approved mock and existing homepage screenshot as visual references.

- [ ] **Step 1: Write the failing asset and markup contract test**

```ts
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("homepage uses the tall mint invoice showcase", () => {
  const source = readFileSync("components/home/HeroSection.tsx", "utf8");
  assert.match(source, /sf-invoice-showcase/);
  assert.match(source, /stflow-invoice-flow-mint\.webp/);
  assert.match(source, /sf-invoice-glass/);
  assert.equal(existsSync("public/stflow-invoice-flow-mint.webp"), true);
});
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `node --test tests/heroInvoiceShowcase.test.ts`

Expected: FAIL because the new asset and class names do not exist.

- [ ] **Step 3: Generate the background asset**

Use built-in Image Gen with the selected mock and existing homepage screenshot attached. Generate only the background: deepened fresh mint/lime financial environment, translucent invoice sheets, ledger columns, settlement nodes, payment rails, and drifting light. Exclude readable text, foreground invoice UI, flowers, office footage, dark slabs, and watermarks.

- [ ] **Step 4: Save and inspect the asset**

Copy the generated result to `public/stflow-invoice-flow-mint.webp`, preserving the original generated file. Inspect it at full size and confirm the right-half focal area supports a glass invoice while the left side stays readable behind headline copy.

### Task 2: Rebuild the responsive showcase composition

**Files:**
- Modify: `components/home/HeroSection.tsx`
- Modify: `app/globals.css`
- Test: `tests/heroInvoiceShowcase.test.ts`

**Interfaces:**
- Consumes: `/stflow-invoice-flow-mint.webp`.
- Produces: `.sf-invoice-showcase`, `.sf-invoice-scene`, `.sf-invoice-glass`, `.sf-invoice-glass-layer`, and responsive/reduced-motion rules.

- [ ] **Step 1: Replace the dark video stage**

Remove the `stflow-hero-bg.mp4` element and dark overlays. Render a decorative background image using `next/image` or an accessible CSS background bound to `/stflow-invoice-flow-mint.webp`; keep it hidden from assistive technology.

- [ ] **Step 2: Align and enlarge the container**

Use the homepage outer grid width and set the desktop showcase to a responsive minimum height around `clamp(44rem, 62vw, 56rem)`. Preserve the 3.5rem desktop radius and reduce it appropriately on small screens.

- [ ] **Step 3: Implement the approved glass invoice**

Keep invoice content as semantic HTML. Add two offset decorative glass layers behind the primary invoice, then apply translucent white fill, backdrop blur, thin white rim, mint refraction, and restrained elevation through `.sf-invoice-glass` styles.

- [ ] **Step 4: Reposition state chips**

Reuse the existing Lucide icons and state data. Position Invoice, Link, Pay, and Receipt around the invoice at varied depths on desktop; place them in a non-overlapping compact grid on mobile.

- [ ] **Step 5: Add calm motion and reduced-motion fallback**

Animate the background with a slow scale/translate drift and the glass stack/chips with subtle independent floating motion. Under `prefers-reduced-motion: reduce`, disable these animations and transforms while retaining the final composition.

- [ ] **Step 6: Run the focused test**

Run: `node --test tests/heroInvoiceShowcase.test.ts`

Expected: PASS.

### Task 3: Verify behavior, fidelity, and production readiness

**Files:**
- Create: `design-qa.md`
- Modify if QA requires: `components/home/HeroSection.tsx`
- Modify if QA requires: `app/globals.css`

**Interfaces:**
- Consumes: approved mock and rendered homepage at the same viewport.
- Produces: `design-qa.md` with `final result: passed`.

- [ ] **Step 1: Run automated checks**

Run:

```powershell
node --test tests/*.test.ts
.\node_modules\.bin\tsc.cmd --noEmit
& 'C:\Users\yaoxt\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' '.\node_modules\next\dist\bin\next' build
```

Expected: all tests pass, TypeScript exits 0, and the production build completes.

- [ ] **Step 2: Start the production server**

Run `stflow-server.js` in a hidden background process on `127.0.0.1:3001`, restarting only the process confirmed to own that port when necessary.

- [ ] **Step 3: Capture the homepage at the reference viewport**

Use the Codex in-app browser selected by the Product Design workflow. Capture the implemented showcase at the same desktop viewport and state as the approved mock. Also inspect tablet and mobile widths for clipping and overlap.

- [ ] **Step 4: Run Product Design QA**

Open the approved mock and implementation capture together. Record alignment, height, palette, typography, glass material, spacing, responsive behavior, and motion findings in `design-qa.md`. Fix every P0/P1/P2 issue and repeat capture/comparison until the report contains `final result: passed`.

- [ ] **Step 5: Commit when Git metadata is available**

```powershell
git add public/stflow-invoice-flow-mint.webp components/home/HeroSection.tsx app/globals.css tests/heroInvoiceShowcase.test.ts design-qa.md docs/superpowers
git commit -m "feat: redesign homepage invoice showcase"
```

If the workspace remains unrecognized as a Git repository, keep the verified files in place and report that they are uncommitted.
