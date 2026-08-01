# Console Navigation and RPC Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace four redirect-only console entries with useful wallet-scoped pages and move invoice registry reads behind a sanitized server API.

**Architecture:** Pure helpers derive customers, orders, analytics, and CSV from the existing `Invoice` model. A server route performs Arc registry reads and returns serialized chain invoices; the browser hook combines those results with the existing metadata endpoint. Pages reuse the current console shell and status components.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, viem, wagmi, Node test runner, Tailwind CSS.

## Global Constraints

- Keep the existing console shell and visual language.
- Do not change invoice creation, payment authorization, wallet connection, contract behavior, Supabase schema, or homepage UI.
- Use only real Arc Testnet and wallet-scoped data; no mock production data.
- Never render raw RPC URLs, calldata, stack traces, secrets, or contract internals.

---

### Task 1: Wallet-scoped console view models

**Files:**
- Create: `lib/consoleViews.ts`
- Create: `tests/consoleViews.test.ts`

**Interfaces:**
- Consumes: `Invoice[]`, connected wallet address.
- Produces: `customerRows(invoices, wallet)`, `orderRows(invoices, wallet)`, `invoiceAnalytics(invoices, wallet)`, and `invoiceCsv(invoices, wallet)`.

- [ ] Write tests proving counterparties are grouped case-insensitively, directions remain independent, status totals use real invoices, and CSV quotes commas, quotes, and newlines.
- [ ] Run `node --test tests/consoleViews.test.ts` and confirm it fails because `lib/consoleViews.ts` is missing.
- [ ] Implement minimal pure helpers using the existing `getConsoleInvoiceData` wallet filter and `Invoice` fields.
- [ ] Run `node --test tests/consoleViews.test.ts` and confirm all cases pass.

### Task 2: Sanitized server-side Arc invoice reads

**Files:**
- Create: `lib/server/readWalletInvoices.ts`
- Create: `app/api/v1/invoices/wallet/[wallet]/route.ts`
- Modify: `hooks/useInvoice.ts`
- Create: `tests/walletInvoiceRoute.test.ts`
- Modify: `tests/invoiceLoadStates.test.ts`

**Interfaces:**
- `readWalletChainInvoices(wallet: Address): Promise<ChainInvoice[]>` reads registry count, IDs, and invoices through a server public client.
- `GET /api/v1/invoices/wallet/:wallet` returns `{ invoices }`, `400 INVALID_WALLET`, or sanitized `503 ARC_RPC_UNAVAILABLE`.
- Browser hook calls this route and maps returned tuples before existing metadata verification.

- [ ] Write failing tests for invalid address rejection, sanitized upstream failure, and absence of direct browser `readContract` calls.
- [ ] Run the two focused test files and confirm the expected failures.
- [ ] Implement the reader and route with dependency-injectable route logic for real tests, then replace browser RPC calls with `fetch`.
- [ ] Return the fixed user message `Arc Testnet data is temporarily unavailable. Please try again.` for RPC failures.
- [ ] Run the focused tests and confirm they pass.

### Task 3: Four distinct console pages

**Files:**
- Replace: `app/console/customers/page.tsx`
- Replace: `app/console/orders/page.tsx`
- Replace: `app/console/analytics/page.tsx`
- Replace: `app/console/export/page.tsx`
- Create: `components/console/ConsoleLoadState.tsx`
- Create: `components/console/ConsolePageHeader.tsx`
- Create: `tests/consoleRoutes.test.ts`

**Interfaces:**
- Each page uses `useInvoices`, `useAccount`, and Task 1 helpers.
- `ConsoleLoadState` owns disconnected/loading/error/partial copy and Retry behavior.
- Export triggers a browser download named `stflow-invoices-<wallet>.csv`.

- [ ] Write a failing source-level route test asserting none of the four pages imports `redirect` and each has a distinct heading and helper call.
- [ ] Run `node --test tests/consoleRoutes.test.ts` and confirm all redirect routes fail.
- [ ] Implement Customers with counterparty totals, Orders with direction/status/action rows, Analytics with factual summaries, and Export with CSV preview/download.
- [ ] Run route and view-model tests and confirm they pass.

### Task 4: Regression and click-path verification

**Files:**
- Modify only files required by failures discovered in verification.

**Interfaces:**
- Seven paths: `/console`, `/console/invoices`, `/console/customers`, `/console/orders`, `/console/analytics`, `/console/export`, `/console/settings`.

- [ ] Run `npm test` and fix regressions without weakening assertions.
- [ ] Run `npm run lint`, `npm run typecheck`, and `npm run build`; all must exit 0.
- [ ] Start the production build locally and request all seven paths, confirming HTTP 200 and distinct page content.
- [ ] Exercise the wallet API with an invalid address and a real Arc Testnet wallet, confirming sanitized errors and JSON success.
- [ ] Inspect the final diff for unrelated UI, wallet, contract, or payment changes.
