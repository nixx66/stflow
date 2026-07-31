# STFlow production connectivity fix

## Goal

Restore production metadata access and remove WalletConnect failures without changing the existing UI or adding a paid service.

## Scope

- Correct the Vercel server-side Supabase credential.
- Disable WalletConnect when no valid Reown project ID is configured.
- Preserve injected browser-wallet support, including MetaMask.
- Redeploy to the existing `stflow-arc.vercel.app` production domain.
- Verify Supabase-backed APIs, Arc Testnet connectivity, and primary application routes.

## Supabase credential

`SUPABASE_SERVICE_ROLE_KEY` remains a server-only sensitive Vercel environment variable. Its value must be the complete `sb_secret_...` credential created for `stflow_vercel`, not the key name. The value must never be written to source files, logs, test fixtures, Git history, or this document.

The credential is enabled only for Production and Preview. Local development continues to require an explicitly supplied local environment value.

## Wallet configuration

Wallet configuration will be built from the available environment variables. When `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is absent, empty, or still set to the current placeholder, the application will configure injected wallets only and will not initialize WalletConnect network clients.

This removes the failing WalletConnect configuration and telemetry requests while retaining MetaMask-compatible browser connections. No visual changes are intended.

## Error handling

- Server APIs continue returning a controlled `503` when Supabase is unavailable.
- Secrets are never included in error responses.
- Missing WalletConnect configuration is treated as an intentionally disabled optional connector, not as a runtime error.

## Testing

- Add a regression test proving that absent WalletConnect configuration does not create a WalletConnect connector.
- Add a regression test proving that a real project ID enables WalletConnect.
- Run type checking, linting, automated tests, and a production build.
- After deployment, verify the stable production domain, invoice metadata API behavior, nonce API behavior, unauthorized chain-sync rejection, Arc chain ID, and deployed contract bytecode.
- Do not perform a wallet-signed transaction or request private keys, seed phrases, wallet passwords, database passwords, or secret API keys through chat.

## Acceptance criteria

- Production Supabase requests no longer fail because of an invalid API key.
- Pages no longer generate WalletConnect `403` or `400` requests when WalletConnect is unconfigured.
- MetaMask remains available.
- Existing pages, routes, layout, and application behavior are unchanged outside this connectivity correction.
- Production remains available at `https://stflow-arc.vercel.app/`.
