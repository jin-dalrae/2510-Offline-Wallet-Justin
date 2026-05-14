// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * Minimal ERC-1271 smart wallet for testing.
 *
 * Designates a single EOA owner. Verifies any EIP-712 digest by recovering
 * the owner's ECDSA signature. This mirrors how Coinbase Smart Wallet,
 * Safe, and other ERC-1271 wallets validate signatures, even though those
 * production wallets use more sophisticated owner schemes (passkeys,
 * multi-sig, session keys).
 *
 * Includes the helper functions needed to deposit into / withdraw from
 * the OfflineEscrow as a smart wallet would in production.
 */
contract MockSmartWallet is IERC1271 {
    address public immutable owner;

    // ERC-1271 success magic value: bytes4(keccak256("isValidSignature(bytes32,bytes)"))
    bytes4 private constant MAGIC_VALUE = 0x1626ba7e;

    error NotOwner();

    constructor(address _owner) {
        owner = _owner;
    }

    function isValidSignature(bytes32 hash, bytes memory signature)
        external
        view
        override
        returns (bytes4)
    {
        address recovered = ECDSA.recover(hash, signature);
        return recovered == owner ? MAGIC_VALUE : bytes4(0);
    }

    /// Call `escrow.deposit(token, amount)` as this smart wallet.
    /// Test harness calls `token.transfer(thisSmartWallet, amount)` and
    /// then `smartWallet.approve(escrow, amount)` first.
    function approve(IERC20 token, address spender, uint256 amount) external {
        if (msg.sender != owner) revert NotOwner();
        token.approve(spender, amount);
    }

    function exec(address target, bytes calldata data) external returns (bytes memory) {
        if (msg.sender != owner) revert NotOwner();
        (bool ok, bytes memory ret) = target.call(data);
        require(ok, "exec failed");
        return ret;
    }
}
