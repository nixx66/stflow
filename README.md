# STFlow

STFlow is a Next.js + TypeScript + Tailwind CSS Web3 DApp framework for stablecoin invoice and settlement workflows.

STFlow = Stablecoin Transaction Flow. It focuses on a clean operational workflow for USDC invoices, payment links, mock checkout, receipts, transaction history, and settlement review.

The project follows a mock-first to live-ready strategy: first complete the product loop locally, then connect wallet state, Arc Testnet USDC payment, and transaction proof.

## Tech Stack

- Next.js & React for high-performance routing, rendering, and modular product surfaces.
- TypeScript for invoice amount, payment status, receipt, and dashboard record type safety.
- RainbowKit for wallet connection UX.
- wagmi & viem for wallet state, contract reads, signatures, and future USDC transfer execution.
- Tailwind CSS for the deep green, cream, and soft yellow fintech visual system.
- Arc Testnet as the settlement validation network.
- Mock-first to live-ready architecture for reducing early chain-integration risk.

## Pages

- `/` - fintech SaaS product homepage
- `/dashboard` - settlement dashboard for the demo merchant account
- `/invoice/new` - invoice creation with live preview
- `/pay/[invoiceId]` - public mock checkout page
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

## Static Preview

If you only need a no-server mock preview, double-click:

```txt
STFlow.html
```

## Environment Variables Reserved For Later

```bash
NEXT_PUBLIC_ARC_CHAIN_ID=5042002
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_ARC_EXPLORER_URL=https://testnet.arcscan.app
NEXT_PUBLIC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

The current UI runs with mock data when these variables are empty.

## Arc Framework Notes

See [docs/STFlow-Arc-Framework.md](docs/STFlow-Arc-Framework.md) for the build plan:

- mock invoice workflow first
- wallet connection second
- real Arc USDC transfer third
- Memo-based audit trail fourth
- Supabase/indexer-backed dashboard later

## Mock-First Flow

```text
Create Invoice
  -> Generate Payment Link
  -> Open Pay Page
  -> Mock USDC Payment
  -> Generate Receipt
  -> Dashboard Record
```

## Current Product Surface

- Product homepage with invoice-to-receipt settlement story.
- Wise-style Create Invoice payment request form.
- Payment link and mock USDC checkout flow.
- Formal receipt view with proof fields.
- Settlement dashboard with stats, invoices, and transaction history.
- V2 merchant console for invoices, customers, orders, analytics, export, and settings.

## Later Integration Notes

- Replace the local mock invoice store in `lib/invoice.ts` with Supabase queries.
- Add Supabase Row Level Security before production use.
- Connect real wallet and USDC transfer logic only after the mock UI flow is approved.
- Keep private keys out of frontend code and environment variables.

## Disclaimer

STFlow is an independent mock UI project for learning, prototyping, and Build on Arc experimentation. It is not an official Arc or Circle product.
