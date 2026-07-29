// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract STFlowInvoiceRegistry is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status {
        Pending,
        Paid,
        Cancelled
    }

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
    error InvalidUsdc();
    error InvalidPayer();
    error InvalidAmount();
    error InvalidDeadline();
    error UnauthorizedPayer();
    error UnauthorizedMerchant();
    error InvoiceNotPending();
    error InvoiceExpired();

    IERC20 public immutable usdc;

    mapping(bytes32 id => Invoice invoice) private invoices;

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

    constructor(address usdcAddress) {
        if (usdcAddress == address(0)) revert InvalidUsdc();
        usdc = IERC20(usdcAddress);
    }

    function createInvoice(bytes32 id, address payer, uint128 amount, uint64 dueAt, bytes32 metadataHash) external {
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

    function getInvoice(bytes32 id) external view returns (Invoice memory invoice) {
        invoice = invoices[id];
        if (invoice.merchant == address(0)) revert InvoiceNotFound();
    }
}
