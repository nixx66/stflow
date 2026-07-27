# Payer Wallet Authorization Design

## Problem

An invoice can name a payer wallet, but the mock checkout path currently skips wallet authorization. As a result, a third wallet can open the shared payment link and complete the simulated payment.

## Required Behavior

- When `customerWallet` is present, only that wallet can pay.
- The merchant wallet and every other wallet can view the invoice but cannot submit payment.
- A disconnected checkout cannot submit payment.
- The same authorization rules apply to mock and live payment modes.
- Authorization is checked both when rendering the payment control and immediately before payment execution.
- Existing UI layout, styling, invoice creation, receipt, and dashboard behavior remain unchanged.
- Address comparison is case-insensitive and ignores surrounding whitespace.
- Existing invoices without `customerWallet` retain their current behavior: any connected non-merchant wallet may pay.

## Design

`getPayerAuthorization` remains the single domain rule for wallet eligibility. `PaymentPanel` will use it for every payment mode instead of bypassing it in mock mode. `usePayInvoice` will use the connected wallet in both payment paths and run the same authorization immediately before changing payment state.

The mock payment record will store the connected and authorized payer address. It will no longer substitute the invoice wallet or a fixed demo address. This makes the mock ledger reflect the actor that actually approved payment.

## Error Handling

Unauthorized payment attempts return the existing payer-specific messages:

- no wallet: connect the assigned payer wallet;
- merchant wallet: merchant cannot pay its own invoice;
- another wallet: switch to the assigned payer wallet.

No blockchain or mock settlement action starts after an authorization failure.

## Verification

- A regression test proves wallet C is rejected in mock checkout policy.
- Existing payer authorization tests continue to cover wallet B, wallet A, missing wallets, and invoices without an assigned payer.
- The full test suite, TypeScript check, and production build must pass.

