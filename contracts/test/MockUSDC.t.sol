// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {MockUSDC} from "../src/test/MockUSDC.sol";

contract MockUSDCTest {
    function testDecimalsAreSix() public {
        MockUSDC token = new MockUSDC();

        assert(token.decimals() == 6);
    }

    function testMintCreditsRecipient() public {
        MockUSDC token = new MockUSDC();
        address recipient = address(0xBEEF);
        uint256 amount = 1_000_000;

        token.mint(recipient, amount);

        assert(token.balanceOf(recipient) == amount);
    }
}
