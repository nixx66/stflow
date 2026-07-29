# STFlow

STFlow is a Next.js, TypeScript, and Tailwind CSS DApp for stablecoin invoice and settlement workflows.

STFlow = Stablecoin Transaction Flow. Invoice creation and settlement are backed by an Arc Testnet registry contract and USDC.

## Tech Stack

- Next.js & React for high-performance routing, rendering, and modular product surfaces.
- TypeScript for invoice amount, payment status, receipt, and dashboard record type safety.
- RainbowKit for wallet connection UX.
- wagmi & viem for wallet state, contract reads, and signed Arc Testnet transactions.
- Tailwind CSS for the deep green, cream, and soft yellow fintech visual system.
- Arc Testnet as the settlement validation network.

## Pages

- `/` - fintech SaaS product homepage
- `/dashboard` - settlement dashboard
- `/invoice/new` - invoice creation with live preview
- `/pay/[invoiceId]` - assigned-payer checkout page
- `/receipt/[invoiceId]` - commercial receipt page

## Run Locally

On Windows, double-click:

```txt
start-stflow.cmd
```

It starts the local Next.js server and opens:

```txt
http://127.0.0.1:3000
```

Keep the server window open while using the site.

You can also run:

```bash
pnpm dev
```

## Environment

```bash
NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS=0x...
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are server-only. Never prefix
them with `NEXT_PUBLIC_` or expose them to browser code. Arc Testnet chain ID,
RPC, explorer, and USDC address are pinned in reviewed source and cannot be
overridden through environment variables. Missing or invalid server
configuration fails closed when a server database utility is invoked.

## Arc Framework Notes

See [docs/STFlow-Arc-Framework.md](docs/STFlow-Arc-Framework.md) for the build plan:

- mock invoice workflow first
- wallet connection second
- real Arc USDC transfer third
- Memo-based audit trail fourth
- Supabase/indexer-backed dashboard later

## Current Product Surface

- Product homepage with invoice-to-receipt settlement story.
- Wise-style Create Invoice payment request form.
- Payment link and assigned-payer Arc Testnet USDC checkout flow.
- Formal receipt view with proof fields.
- Settlement dashboard with stats, invoices, and transaction history.
- V2 merchant console for invoices, customers, orders, analytics, export, and settings.

## Integration Status

- Contract writes and payment authorization use Arc Testnet.
- The Supabase schema and strict server-only client are present. The metadata
  API route still needs to be switched from its legacy store before production
  cutover; confirmed onchain creation remains recoverable if metadata saving
  fails.
- Dashboard and seeded presentation data are not authoritative settlement
  records until the planned chain/Supabase synchronization is complete.
- Keep wallet private keys and recovery phrases out of source, environment
  variables, logs, and support messages.

## Disclaimer

STFlow is an independent testnet project for development and Build on Arc experimentation. It is not an official Arc or Circle product.
