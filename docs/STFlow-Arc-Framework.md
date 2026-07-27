# STFlow Arc DApp Technical Framework

STFlow is a Web3 invoice and settlement DApp designed for Arc Testnet. The product can start as a polished mock workflow, then upgrade step by step into real USDC settlement without rewriting the whole UI.

## Product Flow

```text
Create Invoice
  -> Generate Payment Link
  -> Open Pay Page
  -> Mock or real USDC payment
  -> Generate Receipt
  -> Dashboard shows the record
```

## Technical Feasibility

This product is feasible on Arc because Arc is EVM compatible. The frontend can use the normal Ethereum stack: Next.js, wagmi, viem, RainbowKit, Solidity/Foundry later if needed, and standard wallets.

The key Arc-specific detail is that Arc uses USDC as its native gas token. For STFlow, application payments should use the USDC ERC-20 interface at `0x3600000000000000000000000000000000000000`, with 6 decimals. Native gas accounting uses 18 decimals, so do not mix raw native balance values with ERC-20 USDC values.

## Official Arc Testnet Configuration

```ts
chainId: 5042002
rpcUrl: "https://rpc.testnet.arc.network"
websocketUrl: "wss://rpc.testnet.arc.network"
explorerUrl: "https://testnet.arcscan.app"
nativeCurrency: "USDC"
usdcAddress: "0x3600000000000000000000000000000000000000"
memoAddress: "0x5294E9927c3306DcBaDb03fe70b92e01cCede505"
```

These values are already mapped in:

- `lib/arc.ts`
- `lib/chains.ts`
- `lib/usdc.ts`
- `.env.example`

## Recommended Build Phases

### Phase 1: Mock Product, Real UX

Keep the current V1 as mock-first:

- invoice creation stored in local state or Supabase later
- generated payment link as `/pay/[invoiceId]`
- simulated USDC payment button
- generated mock tx hash
- receipt page with payment proof fields
- dashboard with paid, pending, expired states

This is the right phase for visual marketing, demo videos, investor review, hackathon submission, and user testing.

### Phase 2: Wallet Connection

Use RainbowKit + wagmi:

- connect payer wallet
- enforce Arc Testnet chain
- show payer address and USDC balance
- keep mock payment as a fallback mode

Key UI states:

- wallet not connected
- wrong network
- insufficient USDC
- ready to pay
- transaction submitted
- transaction confirmed
- transaction failed

### Phase 3: Real USDC Transfer

Implement real payment with viem or wagmi:

```ts
writeContract({
  address: USDC_ADDRESS,
  abi: usdcAbi,
  functionName: "transfer",
  args: [merchantWallet, parseUnits(invoice.amount, 6)]
});
```

After confirmation:

- store `paymentTxHash`
- store `payerWallet`
- set invoice status to `paid`
- show explorer link
- generate receipt

No smart contract is required for the first real version. The invoice record can be offchain, while the payment proof is onchain.

### Phase 4: Memo-Based Audit Trail

Use Arc's predeployed Memo contract to attach invoice metadata to the USDC transfer.

Recommended memo payload:

```json
{
  "invoiceId": "af-1001",
  "merchant": "0x...",
  "amount": "1250.00",
  "currency": "USDC",
  "app": "STFlow"
}
```

This creates a cleaner audit path because dashboard records can match:

- invoice ID
- transfer calldata hash
- payer wallet
- target token contract
- memo event
- transaction hash

### Phase 5: Backend and Dashboard Reliability

Move from browser local storage to Supabase:

Core tables:

```text
merchants
  id
  wallet_address
  display_name
  created_at

invoices
  id
  merchant_wallet
  payer_wallet
  title
  amount
  currency
  memo
  status
  chain_id
  payment_tx_hash
  created_at
  paid_at
  expires_at

receipts
  id
  invoice_id
  receipt_number
  payment_tx_hash
  issued_at

activity_events
  id
  invoice_id
  event_type
  payload
  created_at
```

Later, add an indexer or server job to verify transaction receipts instead of trusting only the browser.

## Suggested App Structure

```text
app/
  page.tsx                    marketing homepage
  invoice/new/page.tsx         merchant creates invoice
  pay/[invoiceId]/page.tsx     payer checkout page
  receipt/[invoiceId]/page.tsx receipt proof page
  dashboard/page.tsx           merchant records

lib/
  arc.ts                       official Arc constants
  chains.ts                    wagmi chain definition
  usdc.ts                      USDC ABI and payment constants
  invoice.ts                   mock invoice store now, DB adapter later
  supabase.ts                  backend adapter later

hooks/
  usePayInvoice.ts             mock now, real payment later
  useInvoice.ts                invoice read/write
  useDashboard.ts              dashboard data
```

## UX And Visual Marketing Direction

You said you care a lot about visual marketing, and you prefer large blocks with partial dynamic sections. STFlow should look more like a premium financial operating product than a typical crypto landing page.

Recommended homepage sections:

- Hero block: large visual, STFlow headline, clear “Create Invoice” action
- Workflow block: Create -> Link -> Pay -> Confirm -> Receipt -> Dashboard
- Product block: invoice builder, payment link, checkout, receipt, proof layer
- Dynamic proof block: floating transaction panels or subtle payment-status loop
- Dashboard block: large settlement table, KPIs, status chips
- Receipt/Audit block: formal receipt visual plus timeline
- Integration block: Arc Testnet, USDC, Memo, future real settlement

Motion rules:

- use subtle hover, soft floating payment panels, animated status changes
- avoid neon crypto effects
- avoid too many colors
- keep green as the financial success color
- use blue only for navigation/action emphasis
- make numbers and states more important than decorative text

## Best Next Step

Keep the current UI mock intact, then add a toggle in the Pay page:

```text
Payment Mode:
  Mock Payment
  Real Arc USDC Payment
```

This lets you demo the full product even when the wallet is not ready, while still having a clear path to live Arc settlement.
