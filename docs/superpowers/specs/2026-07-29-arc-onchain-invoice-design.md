# Arc Onchain Invoice Design

## Goal

Replace STFlow's mock-first workflow with an Arc Testnet invoice system whose authoritative state is held by a smart contract. Supabase stores private-facing invoice text and indexes public chain data, but it cannot create, pay, cancel, or alter an invoice without the corresponding onchain transaction.

## Network

- Network: Arc Testnet
- Chain ID: `5042002`
- RPC: `https://rpc.testnet.arc.network`
- Explorer: `https://testnet.arcscan.app`
- USDC ERC-20 interface: `0x3600000000000000000000000000000000000000`
- Application amounts use the USDC ERC-20 interface with 6 decimals.
- Arc native gas uses USDC with 18-decimal gas accounting. Gas and invoice amounts must never share conversion helpers.

## Smart Contract

Add a non-upgradeable `STFlowInvoiceRegistry` contract with an immutable USDC address and no owner-only withdrawal, arbitrary-call, or fund-recovery function.

### Invoice State

Each invoice stores:

- `bytes32 id`
- `address merchant`
- `address payer`
- `uint128 amount`
- `uint64 createdAt`
- `uint64 dueAt`
- `uint64 paidAt`
- `bytes32 metadataHash`
- `Status status` where status is `Pending`, `Paid`, or `Cancelled`

The contract does not store customer names, titles, descriptions, or memos. Those values are public only if the user intentionally publishes them elsewhere.

### Contract Operations

`createInvoice(bytes32 id, address payer, uint128 amount, uint64 dueAt, bytes32 metadataHash)`

- Uses `msg.sender` as the merchant.
- Rejects a zero payer, merchant-as-payer, zero amount, duplicate id, and an elapsed deadline.
- Emits `InvoiceCreated`.

`payInvoice(bytes32 id)`

- Requires `msg.sender` to equal the stored payer.
- Requires a pending, unexpired invoice.
- Sets the invoice to paid before the external token transfer.
- Pulls exactly the invoice amount from the payer and sends it directly to the merchant with `SafeERC20.safeTransferFrom`.
- Emits `InvoicePaid`.
- The contract does not retain invoice funds.

`cancelInvoice(bytes32 id)`

- Requires `msg.sender` to equal the merchant.
- Requires a pending invoice.
- Emits `InvoiceCancelled`.

Read functions expose a single invoice and wallet-scoped invoice ids. Events remain the canonical history for indexers and receipts.

## Payment Flow

1. The payer connects the wallet assigned to the invoice.
2. The frontend checks Arc Testnet, current status, USDC balance, and current allowance.
3. If allowance is below the exact invoice amount, the payer approves exactly that amount for the registry.
4. After the approval receipt succeeds, the payer separately confirms `payInvoice`.
5. The frontend waits for the Arc receipt, reads the updated contract state, and then displays the receipt.
6. A failed, rejected, or reverted transaction never marks an invoice paid in Supabase or browser state.

Unlimited USDC approval is not requested. An existing larger allowance is accepted but never increased unnecessarily.

## Metadata and Supabase

Supabase PostgreSQL stores:

- onchain invoice id
- merchant and payer addresses
- customer name
- title
- description
- memo
- normalized metadata JSON
- metadata hash
- create transaction hash and block number
- last indexed status and transaction data
- created and updated timestamps

The metadata hash is computed from one canonical JSON representation before the create transaction. Reads recompute the hash and reject mismatched metadata instead of presenting it as verified.

Only server-side routes use the Supabase service-role key. Browser code receives no database administration secret. Public shared payment links may read only the metadata needed for that invoice. Merchant mutations require a wallet-signed nonce verified by the server; database writes alone cannot change onchain status.

If required Supabase or contract configuration is missing, invoice creation and payment are disabled with a configuration error. There is no mock, demo, local-storage, or seeded-data fallback.

## Frontend Data Flow

- Invoice creation sends the contract transaction first.
- After the transaction receipt succeeds, the API persists metadata and chain references.
- Invoice pages read contract state through viem and fetch matching metadata from the API.
- Dashboard and console read indexed chain-backed records scoped to the connected wallet.
- Receipt pages derive payment status, payer, merchant, amount, and transaction hash from chain data.
- Supabase may cache indexed state for query performance, but contract reads are used for security-sensitive decisions.

## Wallet Account Menu

The shared `WalletConnectControl` opens a compact account menu for a connected wallet.

- Shows the full address.
- Copies the address with visible success feedback.
- Disconnects through wagmi.
- Closes on outside click or `Escape`.
- Preserves the existing connect and wrong-network behavior.

No private key, seed phrase, raw signing key, or wallet credential is read, stored, logged, or transmitted by STFlow.

## Mock Removal

Remove production dependencies on:

- `mock` payment mode
- generated transaction hashes
- demo merchant and payer wallets
- seeded invoice fallbacks
- V2 mock invoice fallbacks
- browser local storage as an invoice ledger
- server files preloaded with mock invoices
- UI copy that labels active workflows as mock or demo

Historical fixture data may remain only inside isolated tests where it is clearly named as test data and cannot enter a production bundle or runtime path.

## Error Handling

- Wallet rejection returns to an actionable idle state without creating a record.
- Wrong network requests an Arc Testnet switch before any write.
- Insufficient USDC distinguishes invoice amount from Arc gas requirements.
- Reverted approval, creation, payment, or cancellation displays the decoded contract or wallet error.
- RPC and indexer failures display retryable errors without inventing local success.
- A successful transaction followed by a database outage remains recoverable from its transaction hash and contract events.

## Security

- Use OpenZeppelin `SafeERC20` and `ReentrancyGuard`.
- Apply checks-effects-interactions in payment.
- Use exact integer amounts; never use JavaScript floating-point arithmetic for USDC.
- Canonicalize and hash metadata deterministically.
- Validate chain id, contract address, bytecode presence, receipt status, and emitted event before updating the UI.
- Verify wallet signatures server-side for protected metadata changes.
- Apply Supabase Row Level Security and deny direct browser writes.
- Keep deployer credentials, Supabase service-role keys, and Vercel secrets outside Git and frontend environment variables.
- Deploy with the user's wallet through an explicit MetaMask confirmation. STFlow never receives the private key or seed phrase.
- Verify the deployed source code on Arcscan before setting the production contract address.

## Testing and Verification

### Contract

Foundry tests cover:

- valid creation
- duplicate ids
- invalid merchant and payer combinations
- invalid amount and deadline
- exact USDC transfer
- unauthorized payer
- merchant self-payment
- expired invoice
- cancelled invoice
- duplicate payment
- cancellation authorization
- reentrancy behavior
- transfer failure rollback
- emitted event values

### Application

- Unit tests cover canonical metadata hashing and chain/domain mapping.
- Component tests cover wallet disconnect, transaction stages, and disabled states.
- Integration tests run against a local EVM node with the contract and a test USDC token.
- The full test suite, TypeScript check, production build, and Arc Testnet smoke test must pass.
- The deployed contract address and create/payment transaction links are verified on Arcscan.

## Delivery Sequence

1. Add and test the Solidity contract locally.
2. Replace frontend mock payment and wallet behavior with contract reads and writes.
3. Add Supabase schema, RLS, server APIs, signature verification, and chain indexing.
4. Remove all production mock and demo paths.
5. Deploy and verify the contract with the user's MetaMask approval.
6. Configure Supabase and Vercel secrets.
7. Run an Arc Testnet invoice from creation through payment and receipt.
8. Deploy the verified application to `stflow-arc.vercel.app`.

The application is not considered complete while any production workflow silently falls back to mock or local state.

