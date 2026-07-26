# STFlow Industrial Code Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the complete STFlow codebase into concise, idiomatic production TypeScript without changing UI, routes, protocols, persistence, or runtime behavior.

**Architecture:** Work from stable domain code outward: domain and storage first, API and client transport second, hooks and payment orchestration third, business components fourth, and presentation pages last. Existing public exports remain stable; new modules are introduced only when they own a coherent business responsibility and reduce a large file or duplicated behavior.

**Tech Stack:** Next.js 15, React 19, TypeScript 5.7, Node test runner, wagmi, viem, Tailwind CSS 3.

## Global Constraints

- Preserve all visible copy, DOM order, class names, routes, request/response fields, status codes, storage keys, invoice states, wallet roles, payment modes, and receipt fields.
- Do not add runtime dependencies or change the framework, styling system, state model, or test runner.
- Remove comments that explain what code does. Keep only comments that explain browser, wallet, chain, storage-corruption, or compatibility constraints.
- Do not add generic utility modules, service classes, forwarding wrappers, or interfaces with one implementation.
- Every behavior change or new pure helper starts with a failing test. Existing characterization tests protect pure refactors.
- Run `node --test tests/*.test.ts` and `node_modules\.bin\tsc.cmd --noEmit` at the end of every task.
- Preserve the pre-refactor screenshots for `/`, `/dashboard`, `/invoice/new`, `/pay/af-1029`, and `/receipt/af-1001` at desktop and 500px widths.

---

### Task 1: Capture Behavior and Visual Baselines

**Files:**
- Create: `tests/sourceBoundaries.test.ts`
- Create: `tmp/refactor-baseline/home-desktop.png`
- Create: `tmp/refactor-baseline/home-mobile.png`
- Create: `tmp/refactor-baseline/dashboard-desktop.png`
- Create: `tmp/refactor-baseline/invoice-new-desktop.png`
- Create: `tmp/refactor-baseline/pay-desktop.png`
- Create: `tmp/refactor-baseline/receipt-desktop.png`

**Interfaces:**
- Consumes: current routes, navigation, API modules, and production rendering.
- Produces: a locked public-surface test and visual evidence used by Task 6.

- [ ] **Step 1: Add the public-surface test**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("public routes and storage identifiers stay stable", () => {
  const nav = readFileSync("components/Navbar.tsx", "utf8");
  const invoice = readFileSync("lib/invoice.ts", "utf8");
  const api = readFileSync("app/api/invoices/route.ts", "utf8");

  assert.match(nav, /href:\s*"\/dashboard"/);
  assert.match(nav, /href:\s*"\/console\/invoices"/);
  assert.match(invoice, /stflow\.invoices\.v1/);
  assert.match(api, /Invalid invoice payload/);
});
```

- [ ] **Step 2: Run the test**

Run: `node --test tests/sourceBoundaries.test.ts`

Expected: PASS. This is a characterization test; it protects existing public identifiers rather than introducing new behavior.

- [ ] **Step 3: Capture the named pages**

Build and restart the existing production server on `127.0.0.1:3001`. Capture each route at 1600px desktop width and capture the homepage at 500px. Reject blank, loading, or clipped images.

- [ ] **Step 4: Verify the full baseline**

Run: `node --test tests/*.test.ts`

Expected: 42 tests pass after adding the characterization test.

Run: `node_modules\.bin\tsc.cmd --noEmit`

Expected: exit code 0 with no diagnostics.

- [ ] **Step 5: Commit**

```powershell
git add tests/sourceBoundaries.test.ts
git commit -m "test: lock public application boundaries"
```

Do not commit `tmp/refactor-baseline/`.

### Task 2: Refactor Domain, Persistence, and Mock Data

**Files:**
- Modify: `lib/invoice.ts`
- Modify: `lib/invoiceStatus.ts`
- Modify: `lib/serverInvoiceStore.ts`
- Modify: `lib/paymentMode.ts`
- Modify: `lib/usdc.ts`
- Modify: `lib/v2MockData.ts`
- Modify: `lib/mockData.ts`
- Modify: `types/invoice.ts`
- Modify: `types/v2.ts`
- Test: `tests/invoiceStatus.test.ts`
- Test: `tests/invoiceRouting.test.ts`
- Test: `tests/invoiceStorageResilience.test.ts`
- Test: `tests/serverInvoiceStore.test.ts`
- Test: `tests/paymentMode.test.ts`
- Create: `tests/invoiceMerge.test.ts`

**Interfaces:**
- Consumes: current `Invoice`, `Receipt`, `CreateInvoiceInput`, storage key, status values, and existing exported functions.
- Produces: the same exports with simpler internal control flow and deterministic helper behavior.

- [ ] **Step 1: Write a failing merge test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { mergeInvoicesById } from "../lib/invoice.ts";
import { mockInvoices } from "../lib/mockData.ts";

test("mergeInvoicesById keeps the preferred copy and stable order", () => {
  const preferred = { ...mockInvoices[0], title: "Preferred" };
  const merged = mergeInvoicesById([preferred], mockInvoices);

  assert.equal(merged[0].title, "Preferred");
  assert.equal(new Set(merged.map(({ id }) => id)).size, merged.length);
});
```

Run: `node --test tests/invoiceMerge.test.ts`

Expected: PASS against current behavior. Then temporarily reverse the merge order in the test and confirm it fails before restoring the assertion; this validates the characterization test.

- [ ] **Step 2: Simplify wallet and status logic**

In `lib/invoiceStatus.ts`, keep `normalizeWallet` private, compute normalized merchant and customer values once per call, and replace repeated object literals with direct early returns. Preserve `PaymentBlockReason`, `WalletRole`, and `PayerBlockReason` exports.

Use this shape:

```ts
const walletKey = (wallet?: string | null) => wallet?.trim().toLowerCase() || undefined;

export function getInvoiceWalletRole(invoice: Invoice, wallet?: string | null): WalletRole {
  const current = walletKey(wallet);
  if (!current) return "unknown";
  if (current === walletKey(invoice.merchantWallet)) return "merchant";
  if (current === walletKey(invoice.customerWallet)) return "designated_payer";
  return "other";
}
```

- [ ] **Step 3: Simplify browser invoice persistence**

Keep `STORAGE_KEY` unchanged. Rename private functions to `inBrowser`, `writeStoredInvoices`, and `emitInvoiceChange`. Keep the two reason comments for unavailable storage and restricted synthetic events. Extract one private `seedInvoices()` function to eliminate repeated normalization and writes.

Refactor `markInvoicePaid` around one private helper:

```ts
function paidInvoice(invoice: Invoice, payerWallet: string, paymentTxHash: string, paidAt: string): Invoice {
  return { ...invoice, payerWallet, paymentTxHash, paidAt, status: "paid" };
}
```

Keep the fallback V2 invoice path, save behavior, and `null` return rules unchanged.

- [ ] **Step 4: Replace imperative merge bookkeeping**

Implement `mergeInvoicesById` with a `Map` seeded in fallback-first, preferred-second order, then return preferred IDs followed by unseen fallback IDs. Preserve the existing stable order proven by `tests/invoiceMerge.test.ts`; do not use a one-line implementation if it obscures precedence.

- [ ] **Step 5: Tighten server storage**

Rename `invoiceStoreMutation` to `writeQueue`, `normalizeStorePayload` to `parseStore`, and `storedInvoice` to `current`. Add a private `isMissingFile(error: unknown)` guard. Preserve corrupt-file renaming and the best-effort rename catch because recovery must not fail when another process already moved the file.

- [ ] **Step 6: Remove dead future-payment comments**

Delete the four-line future implementation checklist from `lib/usdc.ts`. Keep the ABI and exported names unchanged. Convert long payment-mode conditionals to `switch` expressions only where it improves readability; do not create a configuration registry for three modes.

- [ ] **Step 7: Reformat mock data without abstraction**

Keep mock records as plain typed constants. Replace repeated inline derived values only when the same expression occurs three or more times. Do not introduce builders, factories, classes, or random generators.

- [ ] **Step 8: Verify and commit**

Run the domain and storage tests, then the full suite and typecheck.

```powershell
git add lib types tests/invoiceMerge.test.ts
git commit -m "refactor: simplify invoice domain and storage"
```

### Task 3: Refactor API and Client Transport

**Files:**
- Modify: `app/api/invoices/route.ts`
- Modify: `app/api/invoices/[invoiceId]/route.ts`
- Modify: `lib/invoiceServerClient.ts`
- Test: `tests/serverInvoiceStore.test.ts`
- Create: `tests/invoiceApiPayload.test.ts`

**Interfaces:**
- Consumes: `isInvoiceRecord`, store operations, `/api/invoices`, and `/api/invoices/:id`.
- Produces: identical JSON fields and status codes with explicit transport errors and documented best-effort sync.

- [ ] **Step 1: Add a failing JSON parser test**

Create and export `readJson` from `lib/invoiceServerClient.ts` only if it is used by both API testing and client parsing. Preferred implementation:

```ts
export async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}
```

Test malformed response behavior before implementation:

```ts
test("readJson rejects malformed JSON", async () => {
  const response = new Response("not-json");
  await assert.rejects(() => readJson(response), SyntaxError);
});
```

Run the test and confirm it fails because `readJson` is not exported, then implement it.

- [ ] **Step 2: Keep API parsing local and direct**

In both route modules, retain `request.json().catch(() => null)` because malformed client JSON is an expected 400 response. Do not add a generic API framework. Rename `payload` to `invoice` after validation so validated values carry the domain name.

- [ ] **Step 3: Make transport policy explicit**

Keep `syncInvoiceToServer` returning `boolean`; it is deliberately best-effort because local persistence is primary in mock mode. Rename `createTimeoutSignal` to `withTimeout`, returning `{ signal, done }`. Let `fetchInvoiceFromServer` throw for non-404 failures and let `fetchInvoicesFromServer` return `[]` for unavailable background hydration.

- [ ] **Step 4: Verify response contracts**

Assert the exact error strings and statuses in `tests/invoiceApiPayload.test.ts` by calling `POST` and `PATCH` with malformed requests. Preserve `Invalid invoice payload` and `Invoice not found`.

- [ ] **Step 5: Verify and commit**

Run API/storage tests, full tests, and typecheck.

```powershell
git add app/api lib/invoiceServerClient.ts tests/invoiceApiPayload.test.ts
git commit -m "refactor: tighten invoice transport boundaries"
```

### Task 4: Refactor Hooks and Payment Orchestration

**Files:**
- Modify: `hooks/useInvoice.ts`
- Modify: `hooks/usePayInvoice.ts`
- Modify: `hooks/useDashboard.ts`
- Create: `lib/paymentError.ts`
- Create: `tests/paymentError.test.ts`
- Test: `tests/paymentMode.test.ts`
- Test: `tests/invoiceStatus.test.ts`
- Test: `tests/walletDisplay.test.ts`

**Interfaces:**
- Consumes: current hook return shapes, payment stages, wallet authorization reasons, wagmi calls, and server sync.
- Produces: identical hook APIs with smaller callbacks, fewer repeated state transitions, and centralized user-facing payment errors.

- [ ] **Step 1: Write failing payment-error tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { payerError } from "../lib/paymentError.ts";

test("payerError maps wallet authorization failures", () => {
  assert.equal(payerError("merchant_wallet"), "Merchant wallet cannot pay its own invoice.");
  assert.equal(payerError("wrong_payer_wallet"), "Switch to the payer wallet assigned to this invoice.");
  assert.equal(payerError("wallet_required"), "Connect the payer wallet assigned to this invoice.");
});
```

Run: `node --test tests/paymentError.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 2: Implement the pure mapper**

```ts
import type { PayerBlockReason } from "./invoiceStatus.ts";

const messages: Record<Exclude<PayerBlockReason, null>, string> = {
  wallet_required: "Connect the payer wallet assigned to this invoice.",
  merchant_wallet: "Merchant wallet cannot pay its own invoice.",
  wrong_payer_wallet: "Switch to the payer wallet assigned to this invoice."
};

export const payerError = (reason: Exclude<PayerBlockReason, null>) => messages[reason];
```

- [ ] **Step 3: Simplify invoice hydration effects**

In `useInvoice.ts`, rename `isCurrent` to `active`, `refreshServerInvoices` to `loadServerInvoices`, and `currentInvoices` to `current`. Extract one private `saveInvoice(invoice)` function that deduplicates local persistence. Keep the hook return objects exactly `{ invoices, createInvoice, isReady }` and `{ invoice, isReady }`.

- [ ] **Step 4: Flatten payment callbacks**

In `usePayInvoice.ts`, keep `payMockInvoice` and `payLiveInvoice` because they represent real product modes. Extract private `ensurePayable(invoice)` and use `payerError` for wallet messages. Rename `caughtError` to `error`. Keep stage timing, mock hash creation, chain switching, contract arguments, receipt wait, and returned values unchanged.

- [ ] **Step 5: Keep hook dependencies truthful**

Depend on the `invoice` object when callbacks consume most of its fields rather than manually listing individual fields. Do not suppress exhaustive-deps rules. Keep wagmi hook calls at the top level.

- [ ] **Step 6: Verify and commit**

Run payment, invoice, wallet, full tests, and typecheck.

```powershell
git add hooks lib/paymentError.ts tests/paymentError.test.ts
git commit -m "refactor: streamline invoice and payment hooks"
```

### Task 5: Refactor Business Components and Console Pages

**Files:**
- Modify: `components/InvoiceForm.tsx`
- Create: `components/invoice/InvoiceFields.tsx`
- Create: `components/invoice/InvoiceCreated.tsx`
- Modify: `components/PaymentPanel.tsx`
- Modify: `components/InvoicePreview.tsx`
- Modify: `components/ReceiptCard.tsx`
- Modify: `components/TransactionTable.tsx`
- Modify: `components/console/ConsoleShell.tsx`
- Modify: `app/console/page.tsx`
- Modify: `app/console/invoices/page.tsx`
- Modify: `app/console/invoices/[invoiceId]/page.tsx`
- Test: all existing invoice, payment, console, and V2 tests.

**Interfaces:**
- Consumes: existing component props, visible copy, form field names, routes, and Tailwind class strings.
- Produces: smaller files with identical rendered markup and component APIs.

- [ ] **Step 1: Characterize form field order**

Extend `tests/invoiceCreateReadiness.test.ts` with a source-order assertion for `title`, `amount`, `customerName`, `customerWallet`, `expiresAt`, `description`, and `memo`. Run it against the current file and confirm it passes; temporarily swap two expected names to prove it fails, then restore it.

- [ ] **Step 2: Split InvoiceForm by stable UI regions**

Move the existing field JSX without changing element order or class strings into `InvoiceFields`. Move the post-create result JSX into `InvoiceCreated`. Keep state, submit behavior, payment-link computation, and `useInvoices()` in `InvoiceForm.tsx`. Use explicit props containing only values and callbacks each child needs; do not create form context.

- [ ] **Step 3: Simplify event handlers and derived values**

Rename handlers to `submit`, `change`, and `reset` where unambiguous. Keep `paymentLink` and `minExpireAt` as memoized derived values only if their calculation is nontrivial or passed across renders; otherwise compute directly. Replace repeated state object spreads with one typed field-change helper.

- [ ] **Step 4: Refactor PaymentPanel without markup changes**

Move stage-to-copy selection into a private pure function. Keep the one-second clock only while expiry state can change. Derive `isPaying`, eligibility, and authorization instead of mirroring them in state.

- [ ] **Step 5: Deduplicate console presentation logic**

Move `formatUSDC` and `formatDate` into the existing `lib/format.ts` only because they are used by multiple console pages. Keep `MetricCard`, `InvoiceMiniRow`, and `EmptyQueue` close to the pages that own them unless a second page renders the exact same markup. Do not create a component library for one-off panels.

- [ ] **Step 6: Reduce long render functions**

Extract only stable table bodies or detail sections from console files exceeding 250 lines. Preserve page exports, links, empty states, filters, and visible labels. Keep server components as server components and client boundaries unchanged.

- [ ] **Step 7: Verify and commit**

Run all tests and typecheck. Render `/invoice/new`, `/pay/af-1029`, `/receipt/af-1001`, `/console`, and `/console/invoices`; inspect field order, labels, buttons, and empty states.

```powershell
git add components app/console lib/format.ts tests
git commit -m "refactor: clarify invoice and console components"
```

### Task 6: Refactor Presentation Pages and Complete Regression QA

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/dashboard/page.tsx`
- Modify: `app/resources/page.tsx`
- Modify: `components/home/*.tsx`
- Modify: `components/product-layer/*.tsx`
- Modify: `components/Navbar.tsx`
- Modify: `app/globals.css` only for dead selector removal proven by source search.
- Update: `design-qa.md`

**Interfaces:**
- Consumes: approved visual baselines and all existing visible markup.
- Produces: concise static configuration and presentation code with pixel-equivalent output.

- [ ] **Step 1: Remove presentation boilerplate**

Move large static arrays outside component bodies, use direct `map` callbacks with domain names, and delete unused imports, exports, selectors, and components only after repository-wide search proves no consumer. Do not rename CSS classes or reorder JSX.

- [ ] **Step 2: Keep animation behavior exact**

Preserve durations, keyframes, reduced-motion behavior, IntersectionObserver thresholds, and cleanup functions. Rename internal animation variables only when the new name is shorter and equally clear.

- [ ] **Step 3: Remove dead CSS safely**

For each candidate selector, search TSX and CSS references. Delete it only when it has no markup reference, no composition reference, and no keyframe dependency. Run the production build after each CSS batch.

- [ ] **Step 4: Run complete automated verification**

Run: `node --test tests/*.test.ts`

Expected: all tests pass.

Run: `node_modules\.bin\tsc.cmd --noEmit`

Expected: exit code 0.

Run: `npm.cmd run build`

Expected: all 18 routes build successfully.

- [ ] **Step 5: Compare visual baselines**

Capture the same routes at the same viewports. Build side-by-side images for each pre/post pair. Reject P0-P2 differences in layout, copy, color, spacing, typography, assets, controls, or responsive collapse. Record P3-only implementation-neutral rendering differences in `design-qa.md`.

- [ ] **Step 6: Run source-quality checks**

Search production source for comment-only lines, `console.log`, `console.warn`, `console.error`, empty catches, `catch` blocks that only log, and exported symbols with no repository consumer. Review every match manually; do not enforce arbitrary zero counts where a browser or storage boundary requires a catch.

- [ ] **Step 7: Commit final presentation cleanup**

```powershell
git add app components design-qa.md
git commit -m "refactor: finish presentation cleanup"
```

- [ ] **Step 8: Verify repository state**

Run `git status --short`, confirm the worktree is clean, and compare `git diff 56f3a38..HEAD --stat` with the six approved task scopes. Do not deploy or push until the user reviews the local result.
