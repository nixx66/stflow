# Payment confirmation and reconciliation

## Goal

Once the payment receipt and `InvoicePaid` event are verified, the payment is final in the UI. A later Arc RPC read failure must not change that confirmed payment into an error.

## State flow

1. Submit `payInvoice` and wait for its transaction receipt.
2. Validate the receipt status and the expected `InvoicePaid` event fields.
3. Store the transaction hash and move the payment state to confirmed immediately.
4. Read `getInvoice` to reconcile the displayed invoice data.
5. If reconciliation succeeds, replace the local invoice snapshot with the confirmed chain data.
6. If reconciliation fails, retain the confirmed state and show `Payment confirmed. Chain data is still syncing.`

## Retry behavior

The retry action after confirmation only reloads invoice data. It must not call `approve` or `payInvoice` again. The confirmed transaction hash remains available while reconciliation is pending.

## Error boundaries

- Failures before the receipt and event are verified remain payment errors.
- Failures after receipt and event verification are reconciliation warnings.
- Switching to another invoice clears payment and reconciliation state for the previous invoice.

## Tests

- A verified receipt followed by a failed `getInvoice` read remains confirmed.
- The reconciliation warning is displayed without the payment error treatment.
- Retry invokes data refresh only and cannot submit another transaction.
- A pre-confirmation failure still enters the payment failure state.
