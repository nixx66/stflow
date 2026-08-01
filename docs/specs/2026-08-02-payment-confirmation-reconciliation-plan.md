# Payment Confirmation and Reconciliation Implementation Plan

> **For Codex:** Follow this plan task by task. Use test-driven development for every behavior change and do not collapse confirmed settlement back into an error state.

**Goal:** Treat a successful transaction receipt containing the exact `InvoicePaid` event as final payment proof, while making the subsequent invoice re-read an independent, retryable synchronization step.

**Architecture:** Keep the existing payment transaction reducer as the source of truth for wallet and receipt progress. Introduce a separate reconciliation state for the post-payment invoice refresh. The payment state moves to `success` immediately after `validateInvoicePaid`; a later RPC failure only sets the reconciliation state to `pending` and never dispatches the payment reducer's `failed` action. The UI derives its headline, icon, button state, and retry behavior from these two independent states.

**Tech stack:** TypeScript, React 19, Next.js 15, viem, wagmi, Node test runner.

---

## Task 1: Specify terminal payment-state behavior

**Files:**

- Modify: `tests/paymentTransaction.test.ts`
- Modify: `lib/paymentTransaction.ts`

### Step 1: Add failing reducer tests

Add tests proving that:

1. `payment_confirmed` moves the current request to `success` and preserves its transaction hash.
2. A late failure action for the same request cannot downgrade a `success` state.
3. A stale request still cannot modify the current state.

Use a test shaped like:

```ts
test("does not downgrade a receipt-confirmed payment", () => {
  const confirmed = reducePaymentState(
    {
      stage: "payment-confirming",
      invoiceId: ID,
      requestId: REQUEST_A,
      paymentTxHash: PAYMENT_HASH
    },
    { type: "payment_confirmed", requestId: REQUEST_A }
  );

  const afterLateFailure = reducePaymentState(confirmed, {
    type: "failed",
    requestId: REQUEST_A,
    error: "Arc Testnet is temporarily busy."
  });

  assert.deepEqual(afterLateFailure, confirmed);
});
```

### Step 2: Run the focused test and confirm it fails

Run:

```powershell
node --test tests/paymentTransaction.test.ts
```

Expected: the new late-failure assertion fails because `failed` currently changes `success` to `error`.

### Step 3: Make confirmed payment terminal in the reducer

Update `reducePaymentState` so a state already at `success` ignores every action except `reset`. Keep the existing request-id guard.

```ts
if (action.type === "reset") {
  return { stage: "idle", invoiceId: normalizeInvoiceId(action.invoiceId) };
}
if (state.stage === "success") return state;
```

This is a safety boundary: even if a later asynchronous branch accidentally reports an error, receipt-confirmed settlement remains confirmed.

### Step 4: Run the focused test and confirm it passes

Run:

```powershell
node --test tests/paymentTransaction.test.ts
```

Expected: all payment transaction tests pass.

### Step 5: Commit

```powershell
git add tests/paymentTransaction.test.ts lib/paymentTransaction.ts
git commit -m "test: make confirmed payments terminal"
```

## Task 2: Separate settlement confirmation from chain reconciliation

**Files:**

- Modify: `tests/paymentTransaction.test.ts`
- Modify: `hooks/usePayInvoice.ts`
- Modify: `lib/paymentTransaction.ts`

### Step 1: Add a pure confirmed-invoice projection test

Add a small helper test for projecting the submitted invoice into a locally confirmed snapshot without inventing chain timestamps:

```ts
test("projects a receipt-confirmed invoice without fabricating paidAt", () => {
  assert.deepEqual(markInvoiceReceiptConfirmed(invoice), {
    ...invoice,
    status: 1
  });
});
```

`paidAt` remains unchanged until reconciliation returns authoritative chain data. The UI only needs `status: 1` to stop offering payment and show confirmation.

### Step 2: Run the focused test and confirm it fails

Run:

```powershell
node --test tests/paymentTransaction.test.ts
```

Expected: failure because the helper does not exist.

### Step 3: Add the minimal projection helper

In `lib/paymentTransaction.ts` add:

```ts
export function markInvoiceReceiptConfirmed(invoice: ChainInvoice): ChainInvoice {
  return invoice.status === 1 ? invoice : { ...invoice, status: 1 };
}
```

Do not populate `paidAt` from browser time or block height.

### Step 4: Refactor `usePayInvoice` into two phases

Add an explicit reconciliation state:

```ts
type ReconciliationState = "idle" | "syncing";
const [reconciliation, setReconciliation] = useState<ReconciliationState>("idle");
```

After `waitForTransactionReceipt` and `validateInvoicePaid` succeed:

1. Project `submitted` with `markInvoiceReceiptConfirmed`.
2. Set the projected invoice and verified proof.
3. Dispatch `payment_confirmed` immediately.
4. Only then attempt the `getInvoice` re-read inside a nested `try/catch`.
5. On re-read success, call `validateConfirmedPayment`, replace the projected snapshot with authoritative chain data, and set reconciliation to `idle`.
6. On re-read failure, keep the projected paid invoice and verified proof, set reconciliation to `syncing`, and return the successful payment result.

The nested catch must not dispatch `failed` and must not clear `paymentTxHash` or proof.

Return the projected invoice when reconciliation is temporarily unavailable so the receipt route can still open with the verified transaction hash.

### Step 5: Make retry refresh-only after confirmation

Change `refresh()` so it does not dispatch `reset` when the current payment state is already `success` for the same invoice. A retry in that state should:

1. Re-read the invoice and metadata.
2. Replace the projected invoice only when authoritative data validates.
3. Clear the synchronization notice on success.
4. Retain confirmed payment state and set reconciliation to `syncing` on another transient failure.

Normal initial-load retry behavior stays unchanged.

Expose `reconciliation` from the hook.

### Step 6: Run focused tests and type checking

Run:

```powershell
node --test tests/paymentTransaction.test.ts tests/paymentError.test.ts
npm run typecheck
```

Expected: all commands pass.

### Step 7: Commit

```powershell
git add tests/paymentTransaction.test.ts hooks/usePayInvoice.ts lib/paymentTransaction.ts
git commit -m "fix: separate payment proof from reconciliation"
```

## Task 3: Render confirmed settlement and synchronization independently

**Files:**

- Modify: `tests/paymentError.test.ts`
- Modify: `components/PaymentPanel.tsx`

### Step 1: Add failing UI source assertions

Extend `tests/paymentError.test.ts` to assert that the payment panel:

- contains `Payment confirmed` for receipt-confirmed state;
- contains `链上数据正在同步` for reconciliation delay;
- retains `Retry`;
- does not render `state.error` or `loadError` when payment state is `success`;
- does not expose raw RPC, contract-call, calldata, or viem error text.

Use source assertions only for static safety checks; settlement semantics remain covered by the reducer and helper tests.

### Step 2: Run the focused UI test and confirm it fails

Run:

```powershell
node --test tests/paymentError.test.ts
```

Expected: failure because the synchronization copy and success gating are not implemented.

### Step 3: Update `PaymentPanel`

Destructure `reconciliation` from `usePayInvoice` and derive:

```ts
const paymentConfirmed = isPaid || state.stage === "success";
const isSyncing = paymentConfirmed && reconciliation === "syncing";
```

Apply these rules consistently:

- Status row: `Payment confirmed` whenever `paymentConfirmed` is true.
- Confirmation card: green check and `Payment confirmed` whenever `paymentConfirmed` is true.
- Synchronization notice: show `链上数据正在同步` plus `Retry` only when `isSyncing` is true.
- Error card: show payment/load errors only when `paymentConfirmed` is false.
- Payment button: disabled and labelled `Already Paid` whenever `paymentConfirmed` is true, even before the authoritative re-read succeeds.
- Arcscan transaction link remains visible whenever `paymentTxHash` exists.

Do not show a red visual treatment for reconciliation delay.

### Step 4: Run focused tests

Run:

```powershell
node --test tests/paymentError.test.ts tests/paymentTransaction.test.ts
```

Expected: all focused tests pass.

### Step 5: Commit

```powershell
git add tests/paymentError.test.ts components/PaymentPanel.tsx
git commit -m "fix: preserve confirmed payment UI during sync"
```

## Task 4: Complete regression verification

**Files:**

- Verify only; change files only if a regression is found.

### Step 1: Run the full automated suite

Run:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: every command exits successfully with no warnings promoted to errors.

### Step 2: Perform a local payment-state simulation

Start the app and verify the payment page at desktop and narrow widths:

```powershell
npm run dev
```

Check:

1. Before payment, the assigned payer can pay and other wallets cannot.
2. Once a receipt with the exact `InvoicePaid` event succeeds, the page immediately says `Payment confirmed`.
3. A forced or naturally occurring Arc RPC read failure after confirmation only shows `链上数据正在同步`.
4. Clicking `Retry` refreshes data without returning the UI to pending or failed.
5. The Arcscan transaction link remains available.
6. Reloading after Arc data recovers shows authoritative paid status.

### Step 3: Review the final diff

Run:

```powershell
git diff HEAD~3 -- hooks/usePayInvoice.ts lib/paymentTransaction.ts components/PaymentPanel.tsx tests/paymentTransaction.test.ts tests/paymentError.test.ts
git status --short
```

Confirm the changes are limited to payment confirmation, reconciliation, UI copy, and their tests.

### Step 4: Push and deploy only after local verification

Push the verified `main` branch, allow Vercel to deploy, then repeat the browser checks at `https://stflow-arc.vercel.app/` with a real Arc Testnet payment. Do not expose wallet secrets or Supabase service keys in logs or screenshots.
