# Payer Wallet Authorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require the invoice's assigned payer wallet in both mock and live checkout without changing the UI.

**Architecture:** Keep `getPayerAuthorization` as the single wallet policy. Apply it through a payment-mode-independent checkout helper used by both the payment panel and payment execution hook, then record the connected authorized wallet in mock settlements.

**Tech Stack:** Next.js 15, React 19, TypeScript, wagmi, viem, Node test runner

## Global Constraints

- Preserve all existing UI layout and styling.
- Do not change invoice, receipt, or dashboard features.
- Require a connected wallet in every payment mode.
- Recheck authorization immediately before settlement.
- Preserve current behavior for invoices without an assigned payer.

---

### Task 1: Mode-independent checkout authorization

**Files:**
- Modify: `lib/invoiceStatus.ts`
- Modify: `tests/invoiceStatus.test.ts`

**Interfaces:**
- Consumes: `getPaymentEligibility(invoice, now)` and `getPayerAuthorization(invoice, wallet)`
- Produces: `getCheckoutAuthorization(invoice, wallet, now)` returning payment and payer eligibility

- [ ] **Step 1: Write the failing test**

```ts
test("rejects a different connected wallet before mock checkout", () => {
  const invoice = {
    ...baseInvoice,
    customerWallet: "0x0000000000000000000000000000000000000002"
  };

  assert.deepEqual(
    getCheckoutAuthorization(
      invoice,
      "0x0000000000000000000000000000000000000003"
    ),
    {
      canPay: false,
      paymentReason: null,
      payerReason: "wrong_payer_wallet",
      expectedWallet: invoice.customerWallet
    }
  );
});
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `npm.cmd test`

Expected: FAIL because `getCheckoutAuthorization` is not exported.

- [ ] **Step 3: Implement the smallest shared policy**

```ts
export function getCheckoutAuthorization(
  invoice: Invoice,
  wallet?: string | null,
  now = new Date()
) {
  const payment = getPaymentEligibility(invoice, now);
  const payer = getPayerAuthorization(invoice, wallet);

  return {
    canPay: payment.canPay && payer.canPay,
    paymentReason: payment.reason,
    payerReason: payer.reason,
    expectedWallet: payer.expectedWallet
  };
}
```

- [ ] **Step 4: Run the targeted test and verify GREEN**

Run: `npm.cmd test`

Expected: all invoice status tests pass.

### Task 2: Enforce the shared policy in UI and execution

**Files:**
- Modify: `components/PaymentPanel.tsx`
- Modify: `hooks/usePayInvoice.ts`

**Interfaces:**
- Consumes: `getCheckoutAuthorization(invoice, connectedWallet)`
- Produces: a disabled payment control for unauthorized wallets and guarded mock/live payment functions

- [ ] **Step 1: Use the shared policy for every payment mode**

Replace the mock-mode authorization bypass in `PaymentPanel` with:

```ts
const checkoutAuthorization = getCheckoutAuthorization(
  invoice,
  connectedPayerWallet,
  now
);
const canSubmitPayment = checkoutAuthorization.canPay;
```

Keep the existing button labels and warning messages, sourcing their reason and expected wallet from `checkoutAuthorization`.

- [ ] **Step 2: Guard mock payment execution**

Before changing the mock payment stage:

```ts
if (!isConnected || !address) {
  throw new Error(payerError("wallet_required"));
}

const authorization = getCheckoutAuthorization(invoice, address);
if (!authorization.canPay) {
  throw new Error(
    payerError(authorization.payerReason ?? "wallet_required")
  );
}
```

Use `address` when calling `markInvoicePaid`.

- [ ] **Step 3: Use the same guard in live execution**

Replace separate payment and payer checks with `getCheckoutAuthorization(invoice, address)` while preserving live network, contract, and receipt handling.

- [ ] **Step 4: Run full verification**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Expected: every command exits with code 0.

- [ ] **Step 5: Commit the fix**

```powershell
git add docs/superpowers/specs/2026-07-28-payer-wallet-authorization-design.md docs/superpowers/plans/2026-07-28-payer-wallet-authorization.md lib/invoiceStatus.ts tests/invoiceStatus.test.ts components/PaymentPanel.tsx hooks/usePayInvoice.ts
git commit -m "fix: restrict invoice payment to assigned wallet"
```
