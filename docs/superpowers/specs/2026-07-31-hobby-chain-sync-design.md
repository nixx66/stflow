# Hobby Chain Sync Design

## Goal

Deploy the STFlow demo on Vercel Hobby without adding a paid plan or an external scheduler.

## Decision

Run `/api/internal/sync-chain` once per day at `00:00 UTC`.

The payment and receipt flows remain immediate because they read the Arc Testnet
contract directly, wait for the submitted transaction receipt, validate the
`InvoicePaid` event, and then re-read the invoice from the registry.

The scheduled job only updates the Supabase projection used for historical and
dashboard data. On the Hobby deployment, that projection may trail the chain by
up to 24 hours.

## Configuration

- Change the Vercel cron expression from `* * * * *` to `0 0 * * *`.
- Keep `CRON_SECRET` server-only and enabled for Production and Preview.
- Keep the Arc deployment block and confirmation depth unchanged.
- Do not add an external scheduler.
- Do not change the page UI, payment contract calls, receipt verification, or
  wallet restrictions.

## Failure Handling

The sync endpoint continues to reject requests without the correct bearer
secret. A failed daily run is visible in Vercel logs and can be retried by a
later production invocation without duplicating processed chain events.

## Verification

- Validate `vercel.json`.
- Run the existing typecheck, lint, test, and production build commands.
- Confirm the production deployment registers one daily cron job.
- Smoke-test invoice loading and the payment page against Arc Testnet.
