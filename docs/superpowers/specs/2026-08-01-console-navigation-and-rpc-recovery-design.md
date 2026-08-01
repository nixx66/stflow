# Console navigation and RPC recovery

## Goal

Make every console navigation item open a distinct, useful screen and prevent Arc RPC failures from exposing raw infrastructure errors in the browser.

## Scope

- Keep the existing console shell and visual language.
- Replace redirects for Customers, Orders, Analytics, and Export with real wallet-scoped screens.
- Keep Overview, Invoices, and Settings behavior compatible with the current invoice model.
- Do not change invoice creation, payment authorization, wallet connection, or contract behavior.

## Page behavior

### Customers

Group the connected wallet's invoices by counterparty. Show the counterparty address, invoice count, pending amount, settled amount, and whether the relationship is receivable, payable, or both. Empty and disconnected states must be explicit.

### Orders

Present wallet-scoped invoices as settlement orders. Each row shows the invoice reference, counterparty, direction, amount, deadline, and status, with a link to the existing invoice detail or payment route.

### Analytics

Derive all metrics from the same wallet-scoped invoice collection used by Overview and Invoices. Show totals and status/direction breakdowns without mock data or invented trends.

### Export

Show an export summary and download the current wallet's invoices as a UTF-8 CSV. Fields include invoice ID, direction, merchant, payer, title, amount, currency, status, created time, deadline, and paid time. CSV values must be escaped correctly.

## RPC data flow

Browser console pages call an internal read-only API instead of calling the Arc RPC endpoint directly. The API validates the wallet address, reads the verified registry contract through the server-side public client, and returns the chain invoices needed by the existing mapper. Metadata continues to use the existing batch endpoint.

The browser receives stable application error codes and short user-facing messages. Raw RPC URLs, calldata, stack traces, environment values, and contract internals are never rendered.

## Shared implementation

- Extract wallet invoice loading into a reusable console data hook so all pages share one status model.
- Add small pure helpers for customer aggregation, analytics totals, order rows, and CSV serialization.
- Keep page components focused on presentation and reuse existing `DataPanel`, `StatusBadge`, formatting, and wallet controls.

## Error handling

- Disconnected: ask the user to connect a wallet.
- Loading: show a stable loading state.
- RPC unavailable: show a concise temporary-network message and Retry.
- Partial metadata: keep chain data visible and mark descriptive metadata as unavailable.
- Invalid requests: server returns a 400 response; upstream failures return a sanitized 503 response.

## Verification

- Unit tests cover aggregation, order mapping, CSV escaping, API validation, and sanitized RPC failures.
- Route checks confirm all seven navigation targets return their own page rather than redirecting.
- Full test suite, lint/type checks available in the repository, and production build must pass.
- Browser smoke validation covers Overview, Invoices, Customers, Orders, Analytics, Export, and Settings, including wallet-disconnected and network-error states.

## Out of scope

- Historical price charts, customer profiles, order editing, scheduled exports, and new database tables.
- UI redesign outside the console content area.
- Contract or Supabase schema changes.
