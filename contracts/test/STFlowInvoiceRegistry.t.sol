// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {STFlowInvoiceRegistry} from "../src/STFlowInvoiceRegistry.sol";
import {MockUSDC} from "../src/test/MockUSDC.sol";

interface Vm {
    function prank(address msgSender) external;
    function startPrank(address msgSender) external;
    function stopPrank() external;
    function warp(uint256 newTimestamp) external;
    function expectRevert() external;
    function expectRevert(bytes4 revertData) external;
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
        registry.createInvoice(ID, PAYER, AMOUNT, dueAt, METADATA_HASH);

        STFlowInvoiceRegistry.Invoice memory invoice = registry.getInvoice(ID);
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
        emit InvoiceCreated(ID, MERCHANT, PAYER, AMOUNT, dueAt, METADATA_HASH);
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
        registry.payInvoice(ID);

        STFlowInvoiceRegistry.Invoice memory invoice = registry.getInvoice(ID);
        assert(usdc.balanceOf(MERCHANT) == AMOUNT);
        assert(usdc.balanceOf(PAYER) == 0);
        assert(usdc.balanceOf(address(registry)) == 0);
        assert(uint8(invoice.status) == uint8(STFlowInvoiceRegistry.Status.Paid));
    }

    function testRejectsOtherPayer() public {
        _createInvoice();

        vm.prank(OTHER);
        vm.expectRevert(STFlowInvoiceRegistry.UnauthorizedPayer.selector);
        registry.payInvoice(ID);
    }

    function testRejectsMerchantAttemptingPayment() public {
        _createInvoice();

        vm.prank(MERCHANT);
        vm.expectRevert(STFlowInvoiceRegistry.UnauthorizedPayer.selector);
        registry.payInvoice(ID);
    }

    function testRejectsPaymentForMissingInvoice() public {
        vm.prank(PAYER);
        vm.expectRevert(STFlowInvoiceRegistry.InvoiceNotFound.selector);
        registry.payInvoice(ID);
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
        registry.payInvoice(ID);
    }

    function testPaymentRecordsPaidAtTimestamp() public {
        _createInvoice();
        _fundAndApprovePayer();
        uint64 paidAt = uint64(block.timestamp + 1 hours);
        vm.warp(paidAt);

        vm.prank(PAYER);
        registry.payInvoice(ID);

        assert(registry.getInvoice(ID).paidAt == paidAt);
    }

    function testRejectsDuplicatePayment() public {
        _createInvoice();
        _fundAndApprovePayer();

        vm.startPrank(PAYER);
        registry.payInvoice(ID);
        vm.expectRevert(STFlowInvoiceRegistry.InvoiceNotPending.selector);
        registry.payInvoice(ID);
        vm.stopPrank();
    }

    function testPayInvoiceEmitsExactEvent() public {
        _createInvoice();
        _fundAndApprovePayer();

        vm.expectEmit(true, true, true, true, address(registry));
        emit InvoicePaid(ID, PAYER, MERCHANT, AMOUNT);
        vm.prank(PAYER);
        registry.payInvoice(ID);
    }

    function testMerchantCancelsInvoice() public {
        _createInvoice();

        vm.prank(MERCHANT);
        registry.cancelInvoice(ID);

        STFlowInvoiceRegistry.Invoice memory invoice = registry.getInvoice(ID);
        assert(uint8(invoice.status) == uint8(STFlowInvoiceRegistry.Status.Cancelled));
        assert(invoice.paidAt == 0);
    }

    function testRejectsUnauthorizedCancellation() public {
        _createInvoice();

        vm.prank(PAYER);
        vm.expectRevert(STFlowInvoiceRegistry.UnauthorizedMerchant.selector);
        registry.cancelInvoice(ID);
    }

    function testRejectsDuplicateCancellation() public {
        _createInvoice();

        vm.startPrank(MERCHANT);
        registry.cancelInvoice(ID);
        vm.expectRevert(STFlowInvoiceRegistry.InvoiceNotPending.selector);
        registry.cancelInvoice(ID);
        vm.stopPrank();
    }

    function testRejectsPaymentAfterCancellation() public {
        _createInvoice();
        _fundAndApprovePayer();
        vm.prank(MERCHANT);
        registry.cancelInvoice(ID);

        vm.prank(PAYER);
        vm.expectRevert(STFlowInvoiceRegistry.InvoiceNotPending.selector);
        registry.payInvoice(ID);
    }

    function testCancelInvoiceEmitsExactEvent() public {
        _createInvoice();

        vm.expectEmit(true, true, false, true, address(registry));
        emit InvoiceCancelled(ID, MERCHANT);
        vm.prank(MERCHANT);
        registry.cancelInvoice(ID);
    }

    function testInsufficientAllowanceRollsBackPayment() public {
        _createInvoice();
        usdc.mint(PAYER, AMOUNT);
        vm.prank(PAYER);
        usdc.approve(address(registry), AMOUNT - 1);

        vm.prank(PAYER);
        vm.expectRevert();
        registry.payInvoice(ID);

        STFlowInvoiceRegistry.Invoice memory invoice = registry.getInvoice(ID);
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
        vm.expectRevert();
        registry.payInvoice(ID);

        STFlowInvoiceRegistry.Invoice memory invoice = registry.getInvoice(ID);
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
}
