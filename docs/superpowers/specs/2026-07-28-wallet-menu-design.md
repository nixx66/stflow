# Wallet Account Menu Design

## Problem

The shared wallet control displays the connected address but does not provide a visible in-page disconnect action. Users cannot reliably find a way to end the current wallet session.

## Required Behavior

- Clicking a connected wallet address opens a compact account menu.
- The menu shows the full connected address.
- `Copy address` copies the address and briefly changes to `Copied`.
- `Disconnect wallet` uses wagmi's disconnect action and closes the menu.
- Clicking outside the menu or pressing `Escape` closes it.
- The existing connect and wrong-network actions keep their current behavior.
- The shared implementation applies to the homepage, console, invoice creation, and payment surfaces.
- Navigation dimensions, colors, responsive behavior, and business features remain unchanged.

## Component Design

`WalletConnectControl` remains the single shared component. A small internal menu owns only its open state and copy feedback. Wallet connection state stays in RainbowKit and wagmi; no parallel wallet state or new dependency is introduced.

The connected-address button becomes a menu trigger with `aria-expanded`, `aria-haspopup`, and an associated menu id. The menu uses normal buttons for copy and disconnect operations. A document-level pointer listener and keyboard listener are registered only while the menu is open and removed during cleanup.

## Error Handling

Clipboard failure leaves the label unchanged and does not affect the wallet connection. Disconnect uses wagmi's supported action. The control closes after a successful disconnect; wallet-provider failures remain available through the existing connector state rather than being hidden by an empty catch block.

## Testing

- A focused regression test verifies that the shared wallet control exposes copy and disconnect actions.
- TypeScript validates wagmi integration and event cleanup.
- The complete test suite and production build verify that existing pages remain intact.

