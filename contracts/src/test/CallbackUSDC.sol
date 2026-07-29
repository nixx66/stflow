// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface InvoicePayer {
    function payInvoice(bytes32 id) external;
}

contract CallbackUSDC is ERC20 {
    address private registry;
    bytes32 private invoice;
    bool private armed;

    uint256 public callbackCount;
    uint256 public transferCount;
    bytes4 public callbackError;

    constructor() ERC20("Callback USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function arm(address registryAddress, bytes32 invoiceId) external {
        registry = registryAddress;
        invoice = invoiceId;
        armed = true;
    }

    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        if (armed) {
            armed = false;
            ++callbackCount;
            (bool success, bytes memory reason) = registry.call(abi.encodeCall(InvoicePayer.payInvoice, (invoice)));
            // The length check guarantees the revert payload contains a selector.
            // forge-lint: disable-next-line(unsafe-typecast)
            if (!success && reason.length >= 4) callbackError = bytes4(reason);
        }

        ++transferCount;
        return super.transferFrom(from, to, value);
    }
}
