# Arc Testnet registry deployment

> **Status: NOT DEPLOYED.** No Arc Testnet address or deployment transaction is
> recorded in this repository.

The release scripts never accept a private key, seed phrase, keystore, wallet
password, or signing environment variable. MetaMask is the only signing boundary.
`STFlowInvoiceRegistry` has no owner, administrator, upgrade, pause, fee, or recovery
authority.

## Locked network and constructor

| Item | Value |
| --- | --- |
| Chain | Arc Testnet (`5042002`) |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` |
| Contract | `contracts/src/STFlowInvoiceRegistry.sol:STFlowInvoiceRegistry` |
| Constructor | `address usdcAddress` |
| USDC | `0x3600000000000000000000000000000000000000` |
| Compiler | `0.8.30+commit.73712a01` |
| Optimizer | enabled, 200 runs |

Arc Testnet charges native gas in USDC. Keep enough testnet USDC for the contract
creation and leave settlement funds in separate wallets when possible.

## 1. Prepare from a clean Git commit

The repository must be completely clean, including untracked files. Scratch
directories such as `.superpowers/` intentionally block release preparation. Remove
or relocate them only after confirming they contain no work that must be preserved.

Set `FORGE_BIN` only when `forge` is not on `PATH`; it must point to the trusted
Foundry executable, not a wrapper:

```powershell
$env:FORGE_BIN = "C:\trusted\foundry\bin\forge.exe"
npm run arc:deploy:prepare
```

Preparation performs two independent builds from `git archive HEAD` in temporary
directories. It never compiles worktree bytes. It verifies:

- every compiler input source is tracked at the recorded commit;
- compiler input bytes match the corresponding Git blob;
- Solidity metadata source Keccak hashes match those bytes;
- artifact init/runtime bytecode matches full build-info output;
- both clean compiler replays produce identical standard JSON and bytecode;
- compiler is exactly `0.8.30`, optimizer is enabled with 200 runs, and the complete
  EVM version, metadata, `viaIR`, remapping, and library settings are recorded.

The ignored `.stflow-deployment/` directory receives:

- `arc-testnet-request.json`: versioned, self-checksummed deployment manifest;
- `standard-input.json`: exact standard JSON compiler input from committed blobs.

The manifest contains the source commit, complete settings, constructor, init and
runtime bytecode, immutable references, exact creation data and byte length, plus
artifact/build-info/standard-JSON/source hashes. It has no timestamp, so identical
inputs produce identical request bytes.

**Checkpoint A:** Confirm the command reports `NOT_DEPLOYED`, chain `5042002`, the
fixed USDC address, the expected source commit, creation-data hash and byte length,
and a valid manifest checksum.

## 2. Submit the exact prepared creation data with MetaMask

Do not recompile or use Remix's **Deploy** button. Deployment must submit the exact
`creationData` already verified in `arc-testnet-request.json`.

Open the official Remix site from a trusted bookmark. In **Deploy & Run
Transactions**, select **Injected Provider - MetaMask**, then verify MetaMask shows
Arc Testnet. Open the Remix terminal and paste the following snippet after replacing
the three manifest placeholders. The `data` value is public bytecode, not a secret.

```javascript
const data = "PASTE_manifest_bytecode_creationData";
const expectedHash = "PASTE_manifest_hashes_creationDataKeccak";
const expectedBytes = PASTE_manifest_bytecode_creationDataBytes;

if ((await web3.eth.getChainId()) !== 5042002) throw new Error("Wrong chain");
if ((data.length - 2) / 2 !== expectedBytes) throw new Error("Wrong byte length");
if (web3.utils.keccak256(data) !== expectedHash) throw new Error("Wrong creation-data hash");

const [from] = await web3.eth.getAccounts();
if (!from) throw new Error("MetaMask account unavailable");
await web3.eth.sendTransaction({ from, data });
```

The script has no `to` address, so MetaMask must describe a contract-creation
transaction.

**Checkpoint B:** In MetaMask, verify the selected account, Arc Testnet chain
`5042002`, contract creation, no recipient, and acceptable USDC gas. Reject anything
that requests token approval/transfer, changes network, adds a recipient, or differs
from those facts. Never paste a seed phrase or private key into Remix, DevTools,
terminal, chat, a file, or an environment variable.

Copy the confirmed transaction hash and created address from Arcscan.

## 3. Rebuild and validate chain evidence

First run without `--write`:

```powershell
npm run arc:deploy:verify -- `
  --request .stflow-deployment/arc-testnet-request.json `
  --address 0xDEPLOYED_ADDRESS `
  --tx 0xTRANSACTION_HASH
```

The verifier rejects unknown, duplicate, missing, or valueless flags. It verifies
the manifest checksum, rebuilds the manifest's source commit from a fresh Git
archive, and requires an exact manifest match before contacting Arc RPC. It then
requires:

- chain ID `5042002`;
- a successful receipt that created the supplied address;
- transaction and receipt hashes, block numbers, block hashes, and deployer to
  agree;
- transaction `to` to be null and `input` to exactly equal manifest creation data;
- deployed runtime bytecode to exactly equal the manifest template after inserting
  immutable Arc USDC;
- `registry.usdc()` to equal fixed Arc USDC;
- USDC `decimals()` to return a complete 32-byte ABI word equal to 6.

**Checkpoint C:** Compare the printed address, transaction, block, deployer, source
commit, request checksum and hashes with MetaMask, Arcscan and the manifest.

Only after that review, create the evidence file:

```powershell
npm run arc:deploy:verify -- `
  --request .stflow-deployment/arc-testnet-request.json `
  --address 0xDEPLOYED_ADDRESS `
  --tx 0xTRANSACTION_HASH `
  --write
```

`--write` is effective only after every check passes and refuses to overwrite an
existing `contracts/deployment/arc-testnet.json`.

## 4. Verify source on Arcscan

If Arcscan exposes Blockscout standard JSON verification:

1. Open the deployed address → **Code** → **Verify & Publish**.
2. Choose **Solidity (Standard JSON Input)**.
3. Select `v0.8.30+commit.73712a01`.
4. Upload `.stflow-deployment/standard-input.json`.
5. Select
   `contracts/src/STFlowInvoiceRegistry.sol:STFlowInvoiceRegistry`.
6. If requested separately, enter constructor arguments without `0x`:
   `0000000000000000000000003600000000000000000000000000000000000000`.

Use the manifest's full compiler settings; currently these include the recorded
`evmVersion`, optimizer, metadata bytecode hash/CBOR choice, `viaIR`, remappings and
libraries. Do not mark `verification.sourceCode` true until Arcscan confirms the
exact source.

## 5. Evidence and smoke test

The validated record includes network/RPC/explorer URLs, address, transaction,
block number/hash, deployer, constructor, source commit and target, full compiler
settings, standard JSON hash, creation/runtime code hashes, manifest checksum,
validation timestamp, and verification flags.

Before configuring the application, use only low-value testnet funds:

1. create an invoice assigned to another payer;
2. confirm a third wallet cannot pay;
3. assigned payer approves exactly the invoice amount and pays;
4. verify exact merchant receipt and terminal paid status;
5. confirm duplicate payment/cancellation fail;
6. create and cancel a second invoice as merchant.

## Release checks

```powershell
forge fmt --check
forge test
forge build --sizes
npm run test:integration
npm test
npm run typecheck
npm run lint
npm run build
```

All checks, preparation, signing and verification must refer to the same immutable
source commit.
