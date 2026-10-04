// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/AggregatorV3Interface.sol";

/// @title UsdGoalCrowdfund — one campaign per deployment
/// @notice Goal is denominated in USD (8 decimals). Contributions are native HBAR only.
///         Oracle is read ONCE inside finalize() — never per contribution.
///         Uses strict Checks-Effects-Interactions (CEI) on all value transfers.
contract UsdGoalCrowdfund {
    // ── Immutables (set in constructor) ────────────────────────────────────
    address public immutable organizer;
    uint256 public immutable goalUsd;   // 8 decimals  ($100 = 100e8 = 10_000_000_000)
    uint256 public immutable deadline;  // Unix seconds
    AggregatorV3Interface public immutable feed;
    uint256 public immutable maxAge;    // Max acceptable oracle answer age (seconds)

    // ── Mutable state ──────────────────────────────────────────────────────
    mapping(address => uint256) public contributions; // 18-decimal HBAR per contributor
    uint256 public totalRaised;
    bool public finalized;
    bool public goalMet;
    bool public withdrawn;

    // ── Events ─────────────────────────────────────────────────────────────
    event Contributed(address indexed contributor, uint256 amount, uint256 totalRaised);
    event Finalized(bool goalMet, int256 priceAnswer, uint256 updatedAt, uint256 totalRaised);
    event Withdrawn(address indexed organizer, uint256 amount);
    event Refunded(address indexed contributor, uint256 amount);

    // ── Constructor ────────────────────────────────────────────────────────
    /// @param organizer_  Campaign organizer. Pass address(0) to use msg.sender.
    ///                    The factory passes the wallet address explicitly so the
    ///                    factory contract itself does not become the organizer.
    constructor(
        uint256 goalUsd_,
        uint256 deadline_,
        address feed_,
        uint256 maxAge_,
        address organizer_
    ) {
        require(goalUsd_ > 0, "goalUsd must be > 0");
        require(deadline_ > block.timestamp, "deadline must be in future");
        require(feed_ != address(0), "invalid feed address");
        organizer = organizer_ == address(0) ? msg.sender : organizer_;
        goalUsd = goalUsd_;
        deadline = deadline_;
        feed = AggregatorV3Interface(feed_);
        maxAge = maxAge_;
    }

    // ── Mutators ───────────────────────────────────────────────────────────

    /// @notice Contribute HBAR to this campaign.
    ///         Reverts if campaign is closed or already finalized.
    function contribute() external payable {
        require(!finalized, "campaign finalized");
        require(block.timestamp < deadline, "campaign closed");
        require(msg.value > 0, "must send HBAR");

        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;

        emit Contributed(msg.sender, msg.value, totalRaised);
    }

    /// @notice Finalize the campaign after the deadline.
    ///         Reads the Chainlink HBAR/USD feed once and sets goalMet.
    ///         A stale or non-positive oracle answer REVERTS — never silently fails.
    function finalize() external {
        require(!finalized, "already finalized");
        require(block.timestamp >= deadline, "deadline not reached");

        // Read oracle
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = feed.latestRoundData();

        // Validate oracle response
        require(answer > 0, "bad price");
        require(block.timestamp - updatedAt <= maxAge, "stale oracle");
        require(answeredInRound >= roundId, "stale round");

        uint8 dec = feed.decimals();
        require(dec == 8, "unexpected decimals");

        // Compute USD value raised
        // usdRaised (8 dec) = totalRaised (18 dec HBAR) * answer (8 dec) / 1e18
        uint256 usdRaised = (totalRaised * uint256(answer)) / 1e18;

        // Effects
        goalMet = usdRaised >= goalUsd;
        finalized = true;

        emit Finalized(goalMet, answer, updatedAt, totalRaised);
    }

    /// @notice Organizer withdraws all HBAR when goal was met.
    ///         CEI: set withdrawn = true BEFORE transferring.
    function withdraw() external {
        require(msg.sender == organizer, "not organizer");
        require(finalized, "not finalized");
        require(goalMet, "goal not met");
        require(!withdrawn, "already withdrawn");

        // Effects before interaction (CEI)
        withdrawn = true;
        uint256 amount = totalRaised;

        emit Withdrawn(organizer, amount);

        // Interaction
        (bool ok, ) = organizer.call{value: amount}("");
        require(ok, "transfer failed");
    }

    /// @notice Contributor claims full refund when goal was not met.
    ///         CEI: zero contribution BEFORE transferring.
    function refund() external {
        require(finalized, "not finalized");
        require(!goalMet, "goal was met");
        require(contributions[msg.sender] > 0, "nothing to refund");

        // Effects before interaction (CEI)
        uint256 amount = contributions[msg.sender];
        contributions[msg.sender] = 0;

        emit Refunded(msg.sender, amount);

        // Interaction
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
    }

    // ── View helpers ───────────────────────────────────────────────────────

    /// @notice Seconds remaining until deadline; 0 if past deadline.
    function timeLeft() external view returns (uint256) {
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }

    /// @notice True while contributions are accepted.
    function isOpen() external view returns (bool) {
        return !finalized && block.timestamp < deadline;
    }

    /// @notice Preview the USD value (8 decimals) of a given HBAR amount using the live feed.
    ///         This is informational only — does NOT affect goalMet.
    function previewUsdValue(uint256 hbarAmount) external view returns (uint256 usd8) {
        (, int256 answer, , , ) = feed.latestRoundData();
        require(answer > 0, "bad price");
        return (hbarAmount * uint256(answer)) / 1e18;
    }
}
