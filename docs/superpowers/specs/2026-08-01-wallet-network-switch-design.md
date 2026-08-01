# Wallet Network Switch Design

## Problem

The connected-wallet control renders `Switch to Testnet` when the active chain is not Arc Network Testnet, but the button only opens RainbowKit's chain modal. If that modal does not open, no network-switch request reaches MetaMask and the button appears inert.

## Behaviour

- Keep the existing navigation layout and button styling.
- When the connected chain is not Arc Network Testnet, clicking the button directly requests chain ID `5042002` through Wagmi.
- Disable the button while the request is pending to prevent duplicate requests.
- If MetaMask rejects or cannot complete the request, show a concise inline error without exposing provider internals.
- When the request succeeds, Wagmi's account state drives the existing connected-account display.

## Structure

- Isolate the switch action and user-facing error normalization in a small wallet-network helper.
- Let `WalletConnectControl` own only the pending/error UI state and invoke that helper.
- Continue using the existing `arcTestnet` chain definition as the single source of truth.

## Tests

- A failing regression test must first prove that the unsupported-chain button does not directly request Arc Testnet.
- Verify the switch helper requests chain ID `5042002`.
- Verify rejected and failed requests produce a stable user-facing message.
- Run wallet tests, type checking, linting, the full test suite, and a production build.
- After deployment, repeat the real MetaMask check before resuming the four-account hot-switch acceptance test.

## Out of Scope

- No visual redesign.
- No changes to invoice, payment, Supabase, or contract behaviour.
- No handling of seed phrases, private keys, or automatic transaction signing.
