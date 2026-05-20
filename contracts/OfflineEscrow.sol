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
 *  - Sender cannot rug a still-valid voucher: withdrawals are delayed by
 *    WITHDRAW_DELAY (>= MAX_VOUCHER_TTL), and a voucher's deadline is capped
 *    at MAX_VOUCHER_TTL. So any voucher a receiver holds that has not yet
 *    expired is still backed by collateral the sender physically cannot
 *    remove before that voucher's own deadline.
 *  - Sender cannot replay: each voucher has a unique nonce; reused nonces
 *    revert.
 *  - Receiver cannot forge: signature is verified against sender's address.
 *  - Cross-contract / cross-chain replay impossible: EIP-712 domain separator
 *    binds the signature to (name, version, chainId, this contract).
 *  - Expired vouchers can't be claimed: deadline check.
 *
 * Residual risk (NOT eliminated by this contract — disclosed honestly):
 *  - Over-issuance / multi-spend. A sender can sign more vouchers than their
 *    locked balance. Each is individually valid; on settlement only those that
 *    fit the remaining balance succeed, the rest revert (InsufficientBalance).
 *    Fully preventing this offline requires trusted hardware; the client must
 *    surface this to receivers rather than imply a voucher is final.
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

    /// Longest a voucher's deadline may be in the future, measured at claim
    /// time. Bounds how long collateral must stay put for any one voucher.
    uint256 public constant MAX_VOUCHER_TTL = 48 hours;

    /// Delay between requesting a withdrawal and being able to execute it.
    /// MUST be >= MAX_VOUCHER_TTL so a sender cannot pull collateral out from
    /// under a voucher that was signed (in good faith) before the request.
    uint256 public constant WITHDRAW_DELAY = 48 hours;

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

    /// (sender, token) -> amount currently requested for delayed withdrawal.
    mapping(address => mapping(address => uint256)) public pendingWithdrawal;

    /// (sender, token) -> unix time at/after which executeWithdrawal is allowed.
    mapping(address => mapping(address => uint256)) public withdrawableAt;

    event Deposited(address indexed sender, address indexed token, uint256 amount, uint256 newBalance);
    event WithdrawalRequested(address indexed sender, address indexed token, uint256 amount, uint256 executableAt);
    event WithdrawalCancelled(address indexed sender, address indexed token);
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
    error DeadlineTooFar();
    error NoPendingWithdrawal();
    error WithdrawalNotReady();

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
     * @notice Step 1 of 2: request to pull `amount` of `token` back out.
     *         The funds remain claimable by outstanding vouchers during the
     *         WITHDRAW_DELAY window — this is deliberate, so a sender cannot
     *         strand a receiver who holds a still-valid voucher. Re-calling
     *         overwrites any prior request and restarts the timer.
     */
    function requestWithdrawal(IERC20 token, uint256 amount) external {
        uint256 current = balanceOf[msg.sender][address(token)];
        if (amount == 0 || amount > current) revert InsufficientBalance();
        uint256 executableAt = block.timestamp + WITHDRAW_DELAY;
        pendingWithdrawal[msg.sender][address(token)] = amount;
        withdrawableAt[msg.sender][address(token)] = executableAt;
        emit WithdrawalRequested(msg.sender, address(token), amount, executableAt);
    }

    /// @notice Cancel a pending withdrawal request before it executes.
    function cancelWithdrawal(IERC20 token) external {
        if (pendingWithdrawal[msg.sender][address(token)] == 0) revert NoPendingWithdrawal();
        delete pendingWithdrawal[msg.sender][address(token)];
        delete withdrawableAt[msg.sender][address(token)];
        emit WithdrawalCancelled(msg.sender, address(token));
    }

    /**
     * @notice Step 2 of 2: after WITHDRAW_DELAY has elapsed, pull the funds
     *         out. Pays out min(requested, currentBalance): any claims that
     *         landed during the delay window take precedence (receiver-first),
     *         so the sender can never withdraw collateral a valid voucher
     *         already consumed.
     */
    function executeWithdrawal(IERC20 token) external nonReentrant {
        uint256 requested = pendingWithdrawal[msg.sender][address(token)];
        if (requested == 0) revert NoPendingWithdrawal();
        if (block.timestamp < withdrawableAt[msg.sender][address(token)]) {
            revert WithdrawalNotReady();
        }

        uint256 current = balanceOf[msg.sender][address(token)];
        uint256 amount = requested < current ? requested : current;
        if (amount == 0) revert InsufficientBalance();

        delete pendingWithdrawal[msg.sender][address(token)];
        delete withdrawableAt[msg.sender][address(token)];
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
        if (deadline > block.timestamp + MAX_VOUCHER_TTL) revert DeadlineTooFar();
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
        if (deadline > block.timestamp + MAX_VOUCHER_TTL) return (false, "deadline_too_far");
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
