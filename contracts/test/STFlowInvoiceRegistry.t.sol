// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {STFlowInvoiceRegistry} from "../src/STFlowInvoiceRegistry.sol";
import {MockUSDC} from "../src/test/MockUSDC.sol";

interface Vm {
    function prank(address msgSender) external;
    function startPrank(address msgSender) external;
    function stopPrank() external;
    function expectRevert(bytes4 revertData) external;
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData, address emitter) external;
}

contract STFlowInvoiceRegistryTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    bytes32 private constant ID = bytes32(uint256(1));
    bytes32 private constant METADATA_HASH = bytes32(uint256(2));
    address private constant MERCHANT = address(0xA11CE);
    address private constant PAYER = address(0xB0B);
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
}
