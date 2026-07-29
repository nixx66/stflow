// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {STFlowInvoiceRegistry} from "../src/STFlowInvoiceRegistry.sol";
import {CallbackUSDC} from "../src/test/CallbackUSDC.sol";
import {MockUSDC} from "../src/test/MockUSDC.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface Vm {
    function prank(address msgSender) external;
    function startPrank(address msgSender) external;
    function stopPrank() external;
    function warp(uint256 newTimestamp) external;
    function expectRevert() external;
    function expectRevert(bytes4 revertData) external;
    function expectRevert(bytes calldata revertData) external;
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData, address emitter) external;
}

contract STFlowInvoiceRegistryTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    bytes32 private constant ID = bytes32(uint256(1));
    bytes32 private constant METADATA_HASH = bytes32(uint256(2));
    address private constant MERCHANT = address(0xA11CE);
    address private constant PAYER = address(0xB0B);
    address private constant OTHER = address(0xCAFE);
    uint128 private constant AMOUNT = 25_000000;

    MockUSDC private usdc;
    STFlowInvoiceRegistry private registry;

    event InvoiceCreated(
        bytes32 indexed id,
        address indexed merchant,
        address indexed payer,
        uint128 amount,
        uint64 dueAt,
        bytes32 metadataHash
    );

    event InvoicePaid(bytes32 indexed id, address indexed payer, address indexed merchant, uint128 amount);
    event InvoiceCancelled(bytes32 indexed id, address indexed merchant);

    function setUp() public {
        usdc = new MockUSDC();
        registry = new STFlowInvoiceRegistry(address(usdc));
    }

    function testConstructorStoresUsdc() public view {
        assert(address(registry.usdc()) == address(usdc));
    }

    function testConstructorRejectsZeroUsdc() public {
        vm.expectRevert(STFlowInvoiceRegistry.InvalidUsdc.selector);
        new STFlowInvoiceRegistry(address(0));
    }

    function testCreateInvoiceStoresAllFields() public {
        uint64 dueAt = uint64(block.timestamp + 1 days);

        vm.prank(MERCHANT);
        bytes32 id = registry.createInvoice(ID, PAYER, AMOUNT, dueAt, METADATA_HASH);

        STFlowInvoiceRegistry.Invoice memory invoice = registry.getInvoice(id);
        assert(id == registry.invoiceId(MERCHANT, ID));
        assert(invoice.id == id);
        assert(invoice.merchant == MERCHANT);
        assert(invoice.payer == PAYER);
        assert(invoice.amount == AMOUNT);
        assert(invoice.createdAt == uint64(block.timestamp));
        assert(invoice.dueAt == dueAt);
        assert(invoice.paidAt == 0);
        assert(invoice.metadataHash == METADATA_HASH);
        assert(uint8(invoice.status) == uint8(STFlowInvoiceRegistry.Status.Pending));
    }

    function testCreateInvoiceEmitsCompleteEvent() public {
        uint64 dueAt = uint64(block.timestamp + 1 days);

        vm.expectEmit(true, true, true, true, address(registry));
        emit InvoiceCreated(_invoiceId(), MERCHANT, PAYER, AMOUNT, dueAt, METADATA_HASH);
        vm.prank(MERCHANT);
        registry.createInvoice(ID, PAYER, AMOUNT, dueAt, METADATA_HASH);
    }

    function testRejectsDuplicateInvoice() public {
        uint64 dueAt = uint64(block.timestamp + 1 days);

        vm.startPrank(MERCHANT);
        registry.createInvoice(ID, PAYER, AMOUNT, dueAt, METADATA_HASH);
        vm.expectRevert(STFlowInvoiceRegistry.InvoiceAlreadyExists.selector);
        registry.createInvoice(ID, PAYER, AMOUNT, dueAt, METADATA_HASH);
        vm.stopPrank();
    }

    function testSameReferenceIsIsolatedAcrossMerchants() public {
        uint64 dueAt = uint64(block.timestamp + 1 days);

        vm.prank(MERCHANT);
        bytes32 merchantId = registry.createInvoice(ID, PAYER, AMOUNT, dueAt, METADATA_HASH);
        vm.prank(OTHER);
        bytes32 otherId = registry.createInvoice(ID, PAYER, AMOUNT, dueAt, METADATA_HASH);

        assert(merchantId != otherId);
        assert(registry.getInvoice(merchantId).merchant == MERCHANT);
        assert(registry.getInvoice(otherId).merchant == OTHER);
    }

    function testIndexesInvoicesForMerchantAndPayer() public {
        _createInvoice();

        assert(registry.invoiceCount(MERCHANT) == 1);
        assert(registry.invoiceCount(PAYER) == 1);
        bytes32[] memory merchantIds = registry.getInvoiceIds(MERCHANT, 0, 10);
        bytes32[] memory payerIds = registry.getInvoiceIds(PAYER, 0, 10);
        assert(merchantIds.length == 1 && merchantIds[0] == _invoiceId());
        assert(payerIds.length == 1 && payerIds[0] == _invoiceId());
    }

    function testInvoiceIndexesAreWalletScoped() public {
        _createInvoice();
        bytes32 otherReference = bytes32(uint256(99));
        vm.prank(OTHER);
        bytes32 otherId =
            registry.createInvoice(otherReference, MERCHANT, AMOUNT, uint64(block.timestamp + 1 days), METADATA_HASH);

        bytes32[] memory payerIds = registry.getInvoiceIds(PAYER, 0, 10);
        bytes32[] memory otherIds = registry.getInvoiceIds(OTHER, 0, 10);
        assert(payerIds.length == 1 && payerIds[0] == _invoiceId());
        assert(otherIds.length == 1 && otherIds[0] == otherId);
    }

    function testPaginatesInvoiceIdsAndReturnsEmptyPastEnd() public {
        for (uint256 i; i < 3; ++i) {
            vm.prank(MERCHANT);
            registry.createInvoice(bytes32(i + 10), PAYER, AMOUNT, uint64(block.timestamp + 1 days), METADATA_HASH);
        }

        bytes32[] memory page = registry.getInvoiceIds(MERCHANT, 1, 2);
        assert(page.length == 2);
        assert(page[0] == registry.invoiceId(MERCHANT, bytes32(uint256(11))));
        assert(page[1] == registry.invoiceId(MERCHANT, bytes32(uint256(12))));
        assert(registry.getInvoiceIds(MERCHANT, 0, 0).length == 0);
        assert(registry.getInvoiceIds(MERCHANT, 3, 2).length == 0);
        assert(registry.getInvoiceIds(MERCHANT, 100, 2).length == 0);
    }

    function testCapsInvoiceIdPageSizeAtOneHundred() public {
        for (uint256 i; i < 101; ++i) {
            vm.prank(MERCHANT);
            registry.createInvoice(bytes32(i + 1_000), PAYER, AMOUNT, uint64(block.timestamp + 1 days), METADATA_HASH);
        }

        bytes32[] memory page = registry.getInvoiceIds(MERCHANT, 0, 101);
        assert(page.length == 100);
        assert(page[99] == registry.invoiceId(MERCHANT, bytes32(uint256(1_099))));
    }

    function testRejectsZeroPayer() public {
        vm.prank(MERCHANT);
        vm.expectRevert(STFlowInvoiceRegistry.InvalidPayer.selector);
        registry.createInvoice(ID, address(0), AMOUNT, uint64(block.timestamp + 1 days), METADATA_HASH);
    }

    function testRejectsMerchantAsPayer() public {
        vm.prank(MERCHANT);
        vm.expectRevert(STFlowInvoiceRegistry.InvalidPayer.selector);
        registry.createInvoice(ID, MERCHANT, AMOUNT, uint64(block.timestamp + 1 days), METADATA_HASH);
    }

    function testRejectsZeroAmount() public {
        vm.prank(MERCHANT);
        vm.expectRevert(STFlowInvoiceRegistry.InvalidAmount.selector);
        registry.createInvoice(ID, PAYER, 0, uint64(block.timestamp + 1 days), METADATA_HASH);
    }

    function testRejectsElapsedDeadline() public {
        vm.prank(MERCHANT);
        vm.expectRevert(STFlowInvoiceRegistry.InvalidDeadline.selector);
        registry.createInvoice(ID, PAYER, AMOUNT, uint64(block.timestamp), METADATA_HASH);
    }

    function testGetInvoiceRejectsMissingInvoice() public {
        vm.expectRevert(STFlowInvoiceRegistry.InvoiceNotFound.selector);
        registry.getInvoice(ID);
    }

    function testAssignedPayerPaysMerchantAndRegistryKeepsNoFunds() public {
        _createInvoice();
        _fundAndApprovePayer();

        vm.prank(PAYER);
        registry.payInvoice(_invoiceId());

        STFlowInvoiceRegistry.Invoice memory invoice = registry.getInvoice(_invoiceId());
        assert(usdc.balanceOf(MERCHANT) == AMOUNT);
        assert(usdc.balanceOf(PAYER) == 0);
        assert(usdc.balanceOf(address(registry)) == 0);
        assert(uint8(invoice.status) == uint8(STFlowInvoiceRegistry.Status.Paid));
    }

    function testRejectsOtherPayer() public {
        _createInvoice();
        uint256 merchantBalance = usdc.balanceOf(MERCHANT);

        vm.prank(OTHER);
        vm.expectRevert(STFlowInvoiceRegistry.UnauthorizedPayer.selector);
        registry.payInvoice(_invoiceId());

        STFlowInvoiceRegistry.Invoice memory invoice = registry.getInvoice(_invoiceId());
        assert(uint8(invoice.status) == uint8(STFlowInvoiceRegistry.Status.Pending));
        assert(invoice.paidAt == 0);
        assert(usdc.balanceOf(MERCHANT) == merchantBalance);
        assert(usdc.balanceOf(address(registry)) == 0);
    }

    function testRejectsMerchantAttemptingPayment() public {
        _createInvoice();

        vm.prank(MERCHANT);
        vm.expectRevert(STFlowInvoiceRegistry.UnauthorizedPayer.selector);
        registry.payInvoice(_invoiceId());
    }

    function testRejectsPaymentForMissingInvoice() public {
        vm.prank(PAYER);
        vm.expectRevert(STFlowInvoiceRegistry.InvoiceNotFound.selector);
        registry.payInvoice(_invoiceId());
    }

    function testRejectsCancellationForMissingInvoice() public {
        vm.prank(MERCHANT);
        vm.expectRevert(STFlowInvoiceRegistry.InvoiceNotFound.selector);
        registry.cancelInvoice(ID);
    }

    function testRejectsPaymentAtDueAt() public {
        uint64 dueAt = _createInvoice();
        _fundAndApprovePayer();
        vm.warp(dueAt);

        vm.prank(PAYER);
        vm.expectRevert(STFlowInvoiceRegistry.InvoiceExpired.selector);
        registry.payInvoice(_invoiceId());

        STFlowInvoiceRegistry.Invoice memory invoice = registry.getInvoice(_invoiceId());
        assert(uint8(invoice.status) == uint8(STFlowInvoiceRegistry.Status.Pending));
        assert(invoice.paidAt == 0);
        assert(usdc.balanceOf(MERCHANT) == 0);
        assert(usdc.balanceOf(PAYER) == AMOUNT);
        assert(usdc.balanceOf(address(registry)) == 0);
    }

    function testPaymentRecordsPaidAtTimestamp() public {
        _createInvoice();
        _fundAndApprovePayer();
        uint64 paidAt = uint64(block.timestamp + 1 hours);
        vm.warp(paidAt);

        vm.prank(PAYER);
        registry.payInvoice(_invoiceId());

        assert(registry.getInvoice(_invoiceId()).paidAt == paidAt);
    }

    function testRejectsDuplicatePayment() public {
        _createInvoice();
        _fundAndApprovePayer();

        vm.startPrank(PAYER);
        registry.payInvoice(_invoiceId());
        vm.expectRevert(STFlowInvoiceRegistry.InvoiceNotPending.selector);
        registry.payInvoice(_invoiceId());
        vm.stopPrank();
    }

    function testPayInvoiceEmitsExactEvent() public {
        _createInvoice();
        _fundAndApprovePayer();

        vm.expectEmit(true, true, true, true, address(registry));
        emit InvoicePaid(_invoiceId(), PAYER, MERCHANT, AMOUNT);
        vm.prank(PAYER);
        registry.payInvoice(_invoiceId());
    }

    function testMerchantCancelsInvoice() public {
        _createInvoice();

        vm.prank(MERCHANT);
        registry.cancelInvoice(_invoiceId());

        STFlowInvoiceRegistry.Invoice memory invoice = registry.getInvoice(_invoiceId());
        assert(uint8(invoice.status) == uint8(STFlowInvoiceRegistry.Status.Cancelled));
        assert(invoice.paidAt == 0);
    }

    function testRejectsUnauthorizedCancellation() public {
        _createInvoice();

        vm.prank(PAYER);
        vm.expectRevert(STFlowInvoiceRegistry.UnauthorizedMerchant.selector);
        registry.cancelInvoice(_invoiceId());
    }

    function testRejectsDuplicateCancellation() public {
        _createInvoice();

        vm.startPrank(MERCHANT);
        registry.cancelInvoice(_invoiceId());
        vm.expectRevert(STFlowInvoiceRegistry.InvoiceNotPending.selector);
        registry.cancelInvoice(_invoiceId());
        vm.stopPrank();
    }

    function testRejectsPaymentAfterCancellation() public {
        _createInvoice();
        _fundAndApprovePayer();
        vm.prank(MERCHANT);
        registry.cancelInvoice(_invoiceId());

        vm.prank(PAYER);
        vm.expectRevert(STFlowInvoiceRegistry.InvoiceNotPending.selector);
        registry.payInvoice(_invoiceId());
    }

    function testCancelInvoiceEmitsExactEvent() public {
        _createInvoice();

        vm.expectEmit(true, true, false, true, address(registry));
        emit InvoiceCancelled(_invoiceId(), MERCHANT);
        vm.prank(MERCHANT);
        registry.cancelInvoice(_invoiceId());
    }

    function testInsufficientAllowanceRollsBackPayment() public {
        _createInvoice();
        usdc.mint(PAYER, AMOUNT);
        vm.prank(PAYER);
        usdc.approve(address(registry), AMOUNT - 1);

        vm.prank(PAYER);
        vm.expectRevert(
            abi.encodeWithSelector(
                IERC20Errors.ERC20InsufficientAllowance.selector, address(registry), AMOUNT - 1, AMOUNT
            )
        );
        registry.payInvoice(_invoiceId());

        STFlowInvoiceRegistry.Invoice memory invoice = registry.getInvoice(_invoiceId());
        assert(uint8(invoice.status) == uint8(STFlowInvoiceRegistry.Status.Pending));
        assert(invoice.paidAt == 0);
        assert(usdc.balanceOf(MERCHANT) == 0);
        assert(usdc.balanceOf(address(registry)) == 0);
    }

    function testInsufficientBalanceRollsBackPayment() public {
        _createInvoice();
        usdc.mint(PAYER, AMOUNT - 1);
        vm.prank(PAYER);
        usdc.approve(address(registry), AMOUNT);

        vm.prank(PAYER);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, PAYER, AMOUNT - 1, AMOUNT)
        );
        registry.payInvoice(_invoiceId());

        STFlowInvoiceRegistry.Invoice memory invoice = registry.getInvoice(_invoiceId());
        assert(uint8(invoice.status) == uint8(STFlowInvoiceRegistry.Status.Pending));
        assert(invoice.paidAt == 0);
        assert(usdc.balanceOf(MERCHANT) == 0);
        assert(usdc.balanceOf(address(registry)) == 0);
    }

    function _createInvoice() private returns (uint64 dueAt) {
        dueAt = uint64(block.timestamp + 1 days);
        vm.prank(MERCHANT);
        registry.createInvoice(ID, PAYER, AMOUNT, dueAt, METADATA_HASH);
    }

    function _fundAndApprovePayer() private {
        usdc.mint(PAYER, AMOUNT);
        vm.prank(PAYER);
        usdc.approve(address(registry), AMOUNT);
    }

    function _invoiceId() private pure returns (bytes32) {
        return keccak256(abi.encode(MERCHANT, ID));
    }
}

contract STFlowInvoiceRegistryReentrancyTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    bytes32 private constant REFERENCE_ID = bytes32(uint256(7));
    address private constant MERCHANT = address(0xA11CE);
    address private constant PAYER = address(0xB0B);
    uint128 private constant AMOUNT = 50_000000;

    CallbackUSDC private usdc;
    STFlowInvoiceRegistry private registry;

    event InvoicePaid(bytes32 indexed id, address indexed payer, address indexed merchant, uint128 amount);

    function setUp() public {
        usdc = new CallbackUSDC();
        registry = new STFlowInvoiceRegistry(address(usdc));
    }

    function testBlocksNestedPaymentWhileOuterPaymentSucceedsOnce() public {
        vm.prank(MERCHANT);
        bytes32 id =
            registry.createInvoice(REFERENCE_ID, PAYER, AMOUNT, uint64(block.timestamp + 1 days), bytes32(uint256(8)));
        usdc.mint(PAYER, AMOUNT);
        vm.prank(PAYER);
        usdc.approve(address(registry), AMOUNT);
        usdc.arm(address(registry), id);

        vm.expectEmit(true, true, true, true, address(registry));
        emit InvoicePaid(id, PAYER, MERCHANT, AMOUNT);
        vm.prank(PAYER);
        registry.payInvoice(id);

        STFlowInvoiceRegistry.Invoice memory invoice = registry.getInvoice(id);
        assert(usdc.callbackCount() == 1);
        assert(usdc.transferCount() == 1);
        assert(usdc.callbackError() == ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        assert(uint8(invoice.status) == uint8(STFlowInvoiceRegistry.Status.Paid));
        assert(usdc.balanceOf(MERCHANT) == AMOUNT);
        assert(usdc.balanceOf(PAYER) == 0);
        assert(usdc.balanceOf(address(registry)) == 0);
    }
}
