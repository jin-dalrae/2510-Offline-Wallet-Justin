// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title OfflineEscrow
 * @notice Holds stablecoin collateral for trustless offline payments.
 *
 * Flow:
 *  1. Sender (online): approve(escrow, X); escrow.deposit(token, X)
 *  2. Sender (offline): sign a Voucher EIP-712 message via wallet
 *  3. Receiver (offline): take voucher + verify signature locally
 *  4. Anyone (online): submit voucher to escrow.claim(...)
 *     -> if signature valid + nonce unused + balance OK -> tokens transfer
 *        from escrow to receiver
 *
 * Trust properties:
 *  - Sender cannot rug: locked funds are in the contract, not their wallet.
 *  - Sender cannot double-spend: each voucher has a unique nonce; reused
 *    nonces revert.
 *  - Receiver cannot forge: signature is verified against sender's address.
 *  - Cross-contract / cross-chain replay impossible: EIP-712 domain separator
 *    binds the signature to (name, version, chainId, this contract).
 *  - Expired vouchers can't be claimed: deadline check.
 *
 * Wallet compatibility:
 *  Uses OpenZeppelin's SignatureChecker, which transparently supports both
 *  EOA signatures (recovered via ECDSA) and smart-wallet signatures verified
 *  by the wallet contract's own ERC-1271 isValidSignature() callback. This
 *  means Coinbase Smart Wallet, Safe, and other smart-contract wallets can
 *  sign vouchers without modification to this contract.
 */
contract OfflineEscrow is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    string private constant SIGNING_DOMAIN = "JustinOfflineEscrow";
    string private constant SIGNATURE_VERSION = "1";

    /// keccak256("Voucher(address from,address to,address token,uint256 amount,bytes32 nonce,uint256 deadline)")
    bytes32 public constant VOUCHER_TYPEHASH =
        keccak256(
            "Voucher(address from,address to,address token,uint256 amount,bytes32 nonce,uint256 deadline)"
        );

    /// (sender, token) -> locked balance available to spend offline
    mapping(address => mapping(address => uint256)) public balanceOf;

    /// (sender, nonce) -> claimed flag. Tied to sender so that two different
    /// senders can independently pick the same nonce without conflict.
    mapping(address => mapping(bytes32 => bool)) public usedNonce;

    event Deposited(address indexed sender, address indexed token, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed sender, address indexed token, uint256 amount, uint256 newBalance);
    event Claimed(
        address indexed from,
        address indexed to,
        address indexed token,
        uint256 amount,
        bytes32 nonce
    );

    error InvalidSignature();
    error NonceAlreadyUsed();
    error VoucherExpired();
    error InsufficientBalance();
    error InvalidVoucher();

    constructor() EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {}

    /**
     * @notice Lock `amount` of `token` into the caller's escrow budget.
     *         Caller must approve(escrow, amount) on `token` first.
     */
    function deposit(IERC20 token, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidVoucher();
        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 newBalance = balanceOf[msg.sender][address(token)] + amount;
        balanceOf[msg.sender][address(token)] = newBalance;
        emit Deposited(msg.sender, address(token), amount, newBalance);
    }

    /**
     * @notice Pull `amount` of `token` back from caller's escrow budget into
     *         their wallet. Only the depositor can withdraw their own funds.
     */
    function withdraw(IERC20 token, uint256 amount) external nonReentrant {
        uint256 current = balanceOf[msg.sender][address(token)];
        if (amount == 0 || amount > current) revert InsufficientBalance();
        unchecked {
            balanceOf[msg.sender][address(token)] = current - amount;
        }
        token.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, address(token), amount, current - amount);
    }

    /**
     * @notice Submit an offline-signed voucher and transfer tokens to the
     *         designated receiver.
     *
     * @dev Anyone can submit (the receiver, a relayer, etc.) — funds always
     *      land at `to`. This is intentional so that a relayer can pay gas
     *      on behalf of the receiver if needed.
     */
    function claim(
        address from,
        address to,
        IERC20 token,
        uint256 amount,
        bytes32 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        if (block.timestamp > deadline) revert VoucherExpired();
        if (amount == 0) revert InvalidVoucher();
        if (usedNonce[from][nonce]) revert NonceAlreadyUsed();

        bytes32 structHash = keccak256(
            abi.encode(VOUCHER_TYPEHASH, from, to, address(token), amount, nonce, deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        if (!SignatureChecker.isValidSignatureNow(from, digest, signature)) {
            revert InvalidSignature();
        }

        uint256 current = balanceOf[from][address(token)];
        if (current < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[from][address(token)] = current - amount;
        }
        usedNonce[from][nonce] = true;

        token.safeTransfer(to, amount);
        emit Claimed(from, to, address(token), amount, nonce);
    }

    /**
     * @notice Convenience view for the receiver to know whether a voucher
     *         would currently claim successfully.
     */
    function quoteClaim(
        address from,
        address to,
        IERC20 token,
        uint256 amount,
        bytes32 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external view returns (bool claimable, string memory reason) {
        if (block.timestamp > deadline) return (false, "expired");
        if (usedNonce[from][nonce]) return (false, "nonce_used");
        if (balanceOf[from][address(token)] < amount) return (false, "insufficient_balance");

        bytes32 structHash = keccak256(
            abi.encode(VOUCHER_TYPEHASH, from, to, address(token), amount, nonce, deadline)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        if (!SignatureChecker.isValidSignatureNow(from, digest, signature)) {
            return (false, "bad_signature");
        }

        return (true, "ok");
    }

    /// @notice Expose the EIP-712 domain separator so clients can compute it client-side.
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
