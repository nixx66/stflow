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

## Local contract integration

The integration test builds the current contracts, starts an isolated Anvil
node on an available local port, deploys `MockUSDC` and
`STFlowInvoiceRegistry`, and exercises invoice creation and assigned-payer
settlement:

```bash
npm run test:integration
```

`forge` and `anvil` must be on `PATH`. On Windows, explicit executable paths
can be supplied without changing the machine configuration:

```powershell
$env:FORGE_BIN = "C:\path\to\forge.exe"
$env:ANVIL_BIN = "C:\path\to\anvil.exe"
npm.cmd run test:integration
```

The harness uses Anvil's public deterministic development accounts. Their
keys are intentionally visible in the test and have no value. Never send
assets to those addresses, reuse the keys on Arc Testnet or another network,
or replace them with a wallet private key or recovery phrase.

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

## Current Product Surface

- Product homepage with invoice-to-receipt settlement story.
- Wise-style Create Invoice payment request form.
- Payment link and assigned-payer Arc Testnet USDC checkout flow.
- Formal receipt view with proof fields.
- Settlement dashboard with connected-wallet Arc Testnet invoices.
- Merchant console backed by the same verified chain records.

## Integration Status

- Invoice creation, payment authorization, status, amounts, participants, and
  deadlines come from the Arc Testnet registry.
- Descriptive invoice metadata is stored through the signed `/api/v1` routes
  and accepted by clients only when its hash matches the contract record.
- `/dashboard`, `/console`, and `/console/invoices` enumerate the connected
  wallet directly from the registry in pages of at most 100 records. They show
  explicit disconnected, configuration, RPC, and metadata-service states.
- `/pay/[invoiceId]` and `/receipt/[invoiceId]` accept only canonical onchain
  `bytes32` invoice IDs. Payment links do not embed invoice snapshots.
- There is no browser ledger, seeded invoice set, simulated settlement,
  generated transaction hash, or unauthenticated legacy invoice write API.
- A usable environment requires a deployed registry address, Supabase schema
  and server credentials, and a WalletConnect project ID. Missing services fail
  closed instead of returning sample records.
- Keep wallet private keys and recovery phrases out of source, environment
  variables, logs, and support messages.

## Disclaimer

STFlow is an independent testnet project for development and Build on Arc experimentation. It is not an official Arc or Circle product.
