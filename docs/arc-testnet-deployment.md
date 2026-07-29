# Arc Testnet registry deployment

> **Status: NOT DEPLOYED.** This repository does not contain a confirmed Arc Testnet
> registry address or deployment transaction yet.

This checklist deploys `STFlowInvoiceRegistry` without exporting a wallet secret.
The contract has no owner, administrator, upgrade, pause, or recovery function. The
deployer receives no special authority after deployment.

## Locked release inputs

| Item | Required value |
| --- | --- |
| Network | Arc Testnet |
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` |
| Contract | `contracts/src/STFlowInvoiceRegistry.sol:STFlowInvoiceRegistry` |
| Constructor | `address usdcAddress` |
| Constructor value | `0x3600000000000000000000000000000000000000` |
| Solidity | `0.8.30` |
| Optimizer | enabled, 200 runs |

Arc Testnet uses USDC for native gas. The deploying wallet must have enough testnet
USDC for gas before opening the confirmation. Keep invoice settlement funds separate
from the deployment wallet when possible.

## 1. Freeze and prepare

1. Confirm `git status --short` has no tracked changes.
2. Run the full release checks listed under **Release checks**.
3. Record the full source commit:

   ```powershell
   git rev-parse HEAD
   ```

4. Generate the non-secret request:

   ```powershell
   npm run arc:deploy:prepare
   ```

The command reads the current Foundry artifact and build information, validates the
constructor and compiler profile, and creates ignored files under
`.stflow-deployment/`. It does not connect to a wallet or broadcast a transaction.
Preserve these evidence values:

- source commit;
- creation-data Keccak-256;
- runtime-artifact Keccak-256;
- standard JSON SHA-256.

**Human checkpoint A:** Stop if the request says anything other than
`"status": "NOT_DEPLOYED"`, chain `5042002`, or the locked USDC address.

## 2. Confirm with MetaMask

Use a fresh browser session and open Remix from its official bookmarked URL. Import
the repository at the recorded commit. Do not paste a seed phrase, private key,
keystore, or wallet password into Remix, a terminal, environment variable, chat, or
website.

1. Compile `STFlowInvoiceRegistry` with Solidity `0.8.30`, optimizer enabled, 200
   runs. Do not change EVM/compiler settings.
2. In **Deploy & Run Transactions**, select **Injected Provider - MetaMask**.
3. MetaMask must display Arc Testnet with chain ID `5042002`.
4. Select `STFlowInvoiceRegistry`.
5. Enter the single constructor argument:
   `0x3600000000000000000000000000000000000000`.
6. Compare Remix's compiled creation bytecode plus constructor argument with
   `.stflow-deployment/arc-testnet-request.json` → `creationData`. Stop on any
   difference.
7. Click deploy once. Review the account, Arc Testnet network, contract-creation
   action, and USDC gas estimate in MetaMask.

**Human checkpoint B:** Reject the MetaMask request if it switches network, requests
an approval/transfer instead of contract creation, has an unexpected recipient, or
the gas cost is not acceptable. MetaMask is the only place where authorization is
confirmed.

After confirmation, copy the transaction hash and deployed address from the Arc
Testnet explorer. Do not rely on a Remix notification alone.

## 3. Validate before recording

Run read-only validation first:

```powershell
npm run arc:deploy:verify -- --address 0xDEPLOYED_ADDRESS --tx 0xTRANSACTION_HASH
```

The verifier fails closed unless all of the following are true:

- RPC reports chain ID `5042002`;
- the successful receipt creates the supplied address;
- the transaction is confirmed;
- deployed runtime bytecode exactly matches the Foundry artifact after inserting
  the immutable USDC address;
- `registry.usdc()` is the locked Arc Testnet USDC address;
- that token reports 6 decimals.

The read-only command prints a candidate record and does not create
`contracts/deployment/arc-testnet.json`.

**Human checkpoint C:** Compare the printed address, transaction, block, deployer,
commit, constructor, and code hashes with MetaMask, Arcscan, and the prepared
request. Only then write the record:

```powershell
npm run arc:deploy:verify -- --address 0xDEPLOYED_ADDRESS --tx 0xTRANSACTION_HASH --write
```

The write is refused if validation fails or a record already exists. Commit the
record separately so the deployment evidence is auditable.

## 4. Verify source on Arcscan

If Arcscan exposes the Blockscout verification flow:

1. Open the deployed address, then **Code** → **Verify & Publish**.
2. Choose **Solidity (Standard JSON Input)**.
3. Select compiler `v0.8.30+commit.73712a01`.
4. Upload `.stflow-deployment/standard-input.json`.
5. Set the contract identifier to
   `contracts/src/STFlowInvoiceRegistry.sol:STFlowInvoiceRegistry`.
6. If constructor arguments are requested separately, provide the ABI-encoded
   address only:
   `0000000000000000000000003600000000000000000000000000000000000000`.
7. Submit and wait until Arcscan marks the source verified.

Confirm the standard-input SHA-256 still matches
`.stflow-deployment/arc-testnet-request.json`. If Arcscan does not offer Standard
JSON verification, retain the bundle and checksums and use Blockscout's verification
API/UI when that option becomes available. Do not mark source verification true
before Arcscan confirms it.

After verification, update only
`verification.sourceCode` in the recorded deployment evidence to `true`, with the
Arcscan verification URL reviewed in the commit.

## 5. Post-deploy smoke check

Record:

- deployed address;
- deployment transaction hash;
- block number and block hash;
- deployer address;
- source commit;
- compiler version and optimizer runs;
- constructor USDC address;
- creation-data, artifact-template, and deployed-code hashes;
- standard-input SHA-256;
- Arcscan contract and verification URLs;
- validation timestamp and reviewer;
- source verification status.

Before wiring the address into the application, use a low-value test invoice:

1. merchant creates an invoice for a different assigned payer;
2. a third wallet is rejected;
3. the assigned payer approves exactly the invoice amount and pays;
4. the merchant receives the exact USDC amount;
5. the invoice becomes paid and cannot be paid or cancelled again;
6. create a second invoice and verify merchant cancellation.

Do not reuse production funds or mainnet accounts for this smoke test.

## Release checks

Run from the repository root:

```powershell
forge fmt --check
forge test
forge build --sizes
npm run test:integration
npm test
npm run typecheck
npm run lint
npm run build
node --test tests/arcDeployment.test.ts
```

All commands must pass against the same clean source commit used to generate the
deployment request.
