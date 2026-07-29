# Arc Invoice Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and locally verify the non-custodial `STFlowInvoiceRegistry` contract before any frontend integration.

**Architecture:** A non-upgradeable registry stores authoritative invoice state and pulls exactly one invoice amount from its assigned payer to its merchant. OpenZeppelin provides token and reentrancy primitives; Foundry provides deterministic tests and deployment artifacts.

**Tech Stack:** Solidity 0.8.30, Foundry, OpenZeppelin Contracts 5.x, Arc Testnet USDC

## Global Constraints

- Never request or store a private key or seed phrase.
- The registry must not retain invoice funds.
- The registry has no administrator withdrawal, arbitrary-call, pause, or upgrade path.
- Application USDC amounts use 6 decimals.
- Every production change starts with a failing test.

---

### Task 1: Foundry workspace and test token

**Files:**
- Create: `foundry.toml`
- Create: `contracts/src/test/MockUSDC.sol`
- Create: `contracts/test/STFlowInvoiceRegistry.t.sol`

**Interfaces:**
- Consumes: OpenZeppelin `ERC20`
- Produces: `MockUSDC.mint(address,uint256)` for isolated contract tests

- [ ] **Step 1: Install Foundry and initialize dependencies**

Run the official Windows installer from `https://book.getfoundry.sh/getting-started/installation`, restart the shell, then run:

```powershell
forge --version
forge install OpenZeppelin/openzeppelin-contracts@v5.4.0 --no-commit
```

Expected: `forge --version` exits 0 and `lib/openzeppelin-contracts` exists.

- [ ] **Step 2: Create the Foundry configuration**

```toml
[profile.default]
src = "contracts/src"
test = "contracts/test"
script = "contracts/script"
out = "contracts/out"
solc_version = "0.8.30"
optimizer = true
optimizer_runs = 200
remappings = ["@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/"]
```

- [ ] **Step 3: Create the isolated USDC test token**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Test USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
```

- [ ] **Step 4: Verify the workspace compiles**

Run: `forge build`

Expected: build exits 0.

- [ ] **Step 5: Commit**

```powershell
git add foundry.toml contracts/src/test/MockUSDC.sol lib/openzeppelin-contracts
git commit -m "build: add Foundry contract workspace"
```

### Task 2: Invoice creation

**Files:**
- Create: `contracts/src/STFlowInvoiceRegistry.sol`
- Modify: `contracts/test/STFlowInvoiceRegistry.t.sol`

**Interfaces:**
- Produces: `createInvoice(bytes32,address,uint128,uint64,bytes32)`
- Produces: `getInvoice(bytes32) returns (Invoice memory)`

- [ ] **Step 1: Write failing creation tests**

```solidity
function testCreateInvoice() public {
    vm.prank(merchant);
    registry.createInvoice(ID, payer, 25_000000, uint64(block.timestamp + 1 days), METADATA_HASH);

    STFlowInvoiceRegistry.Invoice memory invoice = registry.getInvoice(ID);
    assertEq(invoice.merchant, merchant);
    assertEq(invoice.payer, payer);
    assertEq(invoice.amount, 25_000000);
    assertEq(uint8(invoice.status), uint8(STFlowInvoiceRegistry.Status.Pending));
}

function testRejectsDuplicateInvoice() public {
    vm.startPrank(merchant);
    registry.createInvoice(ID, payer, 25_000000, uint64(block.timestamp + 1 days), METADATA_HASH);
    vm.expectRevert(STFlowInvoiceRegistry.InvoiceAlreadyExists.selector);
    registry.createInvoice(ID, payer, 25_000000, uint64(block.timestamp + 1 days), METADATA_HASH);
    vm.stopPrank();
}
```

Add separate tests for zero payer, merchant-as-payer, zero amount, and elapsed deadline.

- [ ] **Step 2: Verify RED**

Run: `forge test --match-contract STFlowInvoiceRegistryTest -vv`

Expected: compilation fails because `STFlowInvoiceRegistry` does not exist.

- [ ] **Step 3: Implement invoice creation**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract STFlowInvoiceRegistry is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status { Pending, Paid, Cancelled }

    struct Invoice {
        address merchant;
        address payer;
        uint128 amount;
        uint64 createdAt;
        uint64 dueAt;
        uint64 paidAt;
        bytes32 metadataHash;
        Status status;
    }

    error InvoiceAlreadyExists();
    error InvoiceNotFound();
    error InvalidPayer();
    error InvalidAmount();
    error InvalidDeadline();

    IERC20 public immutable usdc;
    mapping(bytes32 => Invoice) private invoices;

    event InvoiceCreated(
        bytes32 indexed id,
        address indexed merchant,
        address indexed payer,
        uint128 amount,
        uint64 dueAt,
        bytes32 metadataHash
    );

    constructor(address usdcAddress) {
        if (usdcAddress == address(0)) revert InvalidPayer();
        usdc = IERC20(usdcAddress);
    }

    function createInvoice(
        bytes32 id,
        address payer,
        uint128 amount,
        uint64 dueAt,
        bytes32 metadataHash
    ) external {
        if (invoices[id].merchant != address(0)) revert InvoiceAlreadyExists();
        if (payer == address(0) || payer == msg.sender) revert InvalidPayer();
        if (amount == 0) revert InvalidAmount();
        if (dueAt <= block.timestamp) revert InvalidDeadline();

        invoices[id] = Invoice({
            merchant: msg.sender,
            payer: payer,
            amount: amount,
            createdAt: uint64(block.timestamp),
            dueAt: dueAt,
            paidAt: 0,
            metadataHash: metadataHash,
            status: Status.Pending
        });

        emit InvoiceCreated(id, msg.sender, payer, amount, dueAt, metadataHash);
    }

    function getInvoice(bytes32 id) external view returns (Invoice memory invoice) {
        invoice = invoices[id];
        if (invoice.merchant == address(0)) revert InvoiceNotFound();
    }
}
```

- [ ] **Step 4: Verify GREEN**

Run: `forge test --match-contract STFlowInvoiceRegistryTest -vv`

Expected: all creation tests pass.

- [ ] **Step 5: Commit**

```powershell
git add contracts/src/STFlowInvoiceRegistry.sol contracts/test/STFlowInvoiceRegistry.t.sol
git commit -m "feat: add onchain invoice creation"
```

### Task 3: Payment and cancellation

**Files:**
- Modify: `contracts/src/STFlowInvoiceRegistry.sol`
- Modify: `contracts/test/STFlowInvoiceRegistry.t.sol`

**Interfaces:**
- Produces: `payInvoice(bytes32)`
- Produces: `cancelInvoice(bytes32)`

- [ ] **Step 1: Write failing payment and cancellation tests**

```solidity
function testAssignedPayerPaysMerchant() public {
    _createInvoice();
    usdc.mint(payer, 25_000000);
    vm.startPrank(payer);
    usdc.approve(address(registry), 25_000000);
    registry.payInvoice(ID);
    vm.stopPrank();

    assertEq(usdc.balanceOf(merchant), 25_000000);
    assertEq(usdc.balanceOf(address(registry)), 0);
    assertEq(uint8(registry.getInvoice(ID).status), uint8(STFlowInvoiceRegistry.Status.Paid));
}

function testRejectsOtherPayer() public {
    _createInvoice();
    vm.prank(other);
    vm.expectRevert(STFlowInvoiceRegistry.UnauthorizedPayer.selector);
    registry.payInvoice(ID);
}
```

Add separate tests for expiry, cancellation, duplicate payment, unauthorized cancellation, transfer failure rollback, event fields, and zero contract balance.

- [ ] **Step 2: Verify RED**

Run: `forge test --match-test "testAssignedPayerPaysMerchant|testRejectsOtherPayer" -vv`

Expected: compilation fails because payment operations do not exist.

- [ ] **Step 3: Implement payment and cancellation**

```solidity
error UnauthorizedPayer();
error UnauthorizedMerchant();
error InvoiceNotPending();
error InvoiceExpired();

event InvoicePaid(bytes32 indexed id, address indexed payer, address indexed merchant, uint128 amount);
event InvoiceCancelled(bytes32 indexed id, address indexed merchant);

function payInvoice(bytes32 id) external nonReentrant {
    Invoice storage invoice = invoices[id];
    if (invoice.merchant == address(0)) revert InvoiceNotFound();
    if (msg.sender != invoice.payer) revert UnauthorizedPayer();
    if (invoice.status != Status.Pending) revert InvoiceNotPending();
    if (block.timestamp >= invoice.dueAt) revert InvoiceExpired();

    invoice.status = Status.Paid;
    invoice.paidAt = uint64(block.timestamp);
    usdc.safeTransferFrom(msg.sender, invoice.merchant, invoice.amount);

    emit InvoicePaid(id, msg.sender, invoice.merchant, invoice.amount);
}

function cancelInvoice(bytes32 id) external {
    Invoice storage invoice = invoices[id];
    if (invoice.merchant == address(0)) revert InvoiceNotFound();
    if (msg.sender != invoice.merchant) revert UnauthorizedMerchant();
    if (invoice.status != Status.Pending) revert InvoiceNotPending();

    invoice.status = Status.Cancelled;
    emit InvoiceCancelled(id, msg.sender);
}
```

- [ ] **Step 4: Run contract verification**

Run:

```powershell
forge fmt --check
forge test -vv
forge build --sizes
```

Expected: all commands exit 0 and the registry stays below the EVM contract-size limit.

- [ ] **Step 5: Commit**

```powershell
git add contracts/src/STFlowInvoiceRegistry.sol contracts/test/STFlowInvoiceRegistry.t.sol
git commit -m "feat: settle Arc invoices through USDC"
```

