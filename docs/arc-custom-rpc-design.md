# Arc Custom RPC Design

## Goal

Use a private Alchemy Arc Testnet endpoint for server-side chain access while keeping Circle's public endpoint as a fallback. The change must not alter wallet custody, contract addresses, invoice data, or the current UI.

## Configuration

- `ARC_RPC_URL` stores the private Alchemy HTTPS endpoint in server-only environment configuration.
- The endpoint must never use a `NEXT_PUBLIC_` prefix or be embedded in client bundles.
- Circle's `https://rpc.testnet.arc.network` remains a code-defined fallback.
- Missing private configuration falls back to Circle so local development remains usable.

## Runtime behavior

Server-side invoice reads, metadata verification, and event synchronization use a shared RPC transport configuration. Each request starts with the private endpoint when configured. Transient transport, timeout, and rate-limit failures may retry a bounded number of times before switching to the public endpoint. Contract reverts, invalid arguments, and wallet errors are returned immediately and never retried on another endpoint.

MetaMask continues to use the public Arc Testnet network definition. This prevents the Alchemy API key from being exposed to browser extensions or page JavaScript.

## Security

- Store the private endpoint only in Vercel's encrypted environment variables and local untracked environment files.
- Do not log complete RPC URLs because the path contains the provider key.
- Do not commit provider keys, wallet secrets, seed phrases, or private keys.
- Redact provider URLs from user-facing and server error messages.

## Testing

- Configuration tests cover private-endpoint preference and public fallback.
- Transport tests cover bounded retry, failover, and non-retryable contract failures.
- Static checks ensure `ARC_RPC_URL` is not referenced from client components and the endpoint is absent from tracked files.
- Existing test, typecheck, lint, and production build checks must continue to pass.

## Deployment

Create an Alchemy Arc Testnet application, copy its HTTPS endpoint, and add it to Vercel as `ARC_RPC_URL` for Production and Preview. Redeploy the current `main` branch, then verify invoice reads, event synchronization, and payment confirmation against the production domain.
