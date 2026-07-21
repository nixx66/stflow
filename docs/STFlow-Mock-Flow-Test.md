# STFlow Mock Flow Test

Date: 2026-07-07

## Scope

- Create Invoice
- Generate Payment Link
- Open Pay Page
- Mock USDC Payment
- Generate Receipt
- Dashboard Record
- Expired invoice guard
- Local mock ledger hydration behavior

## Findings Fixed

- Dynamic Pay and Receipt pages could hydrate from different data than the server render when a newly created invoice lived only in `localStorage`.
- Pending invoices with a past expiration time were not normalized to `expired`.
- Mock payment could mark an expired invoice as paid from the lower-level payment function.
- New invoices used an old chain ID fallback instead of the Arc testnet config.
- Dashboard transaction fields showed `Not connected` for missing transaction hashes.
- Invalid dates could render as browser-level date errors.
- Arc Memo ABI was missing the `BeforeMemo` event used by the official memo flow.

## Verification

- Invoice status regression tests: 3 passed.
- TypeScript check: passed.
- Next production build: passed.
- Local routes checked: `/`, `/invoice/new`, `/pay/af-1003`, `/receipt/af-1001`, `/dashboard`.
- Browser flow checked:
  - Created invoice `Mock flow QA invoice final`.
  - Opened generated Pay link.
  - Completed mock USDC payment.
  - Reached Receipt with amount and transaction hash.
  - Dashboard showed the paid record and tx hash.
  - No new hydration error after the Pay/Receipt loading-state fix.
