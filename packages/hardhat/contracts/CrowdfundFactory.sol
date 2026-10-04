// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UsdGoalCrowdfund.sol";

/// @title CrowdfundFactory
/// @notice Deploys UsdGoalCrowdfund instances and maintains a registry.
///         Title and description are stored as event data only — cheap, immutable,
///         readable by anyone via getLogs. No funds ever pass through this contract.
contract CrowdfundFactory {
    // ── Fixed feed config ──────────────────────────────────────────────────
    address public immutable feed;   // Chainlink HBAR/USD feed
    uint256 public immutable maxAge; // Oracle max freshness (seconds)

    // ── Registry ───────────────────────────────────────────────────────────
    address[] public campaigns; // ordered list of deployed campaign addresses

    // ── Events ────────────────────────────────────────────────────────────
    event CampaignCreated(
        address indexed campaign,
        address indexed organizer,
        uint256 goalUsd,
        uint256 deadline,
        string  title,
        string  description
    );

    constructor(address feed_, uint256 maxAge_) {
        require(feed_ != address(0), "invalid feed");
        feed   = feed_;
        maxAge = maxAge_;
    }

    /// @notice Deploy a new crowdfunding campaign.
    /// @param goalUsd_     USD goal in 8 decimals (e.g. $10 = 10 * 1e8)
    /// @param deadline_    Unix timestamp of campaign end
    /// @param title_       Human-readable campaign title (stored in event only)
    /// @param description_ Campaign description (stored in event only)
    /// @return campaign    Address of the newly deployed UsdGoalCrowdfund
    function createCampaign(
        uint256 goalUsd_,
        uint256 deadline_,
        string  calldata title_,
        string  calldata description_
    ) external returns (address campaign) {
        require(bytes(title_).length > 0,       "title required");
        require(bytes(title_).length <= 100,    "title too long");
        require(bytes(description_).length <= 500, "description too long");

        // Pass msg.sender as the explicit organizer so the factory itself
        // does not become the organizer of the deployed campaign.
        UsdGoalCrowdfund c = new UsdGoalCrowdfund(
            goalUsd_,
            deadline_,
            feed,
            maxAge,
            msg.sender
        );
        campaign = address(c);
        campaigns.push(campaign);

        emit CampaignCreated(campaign, msg.sender, goalUsd_, deadline_, title_, description_);
    }

    /// @notice Number of campaigns ever created through this factory.
    function campaignCount() external view returns (uint256) {
        return campaigns.length;
    }

    /// @notice Returns a slice of campaigns (pagination).
    /// @param from  Start index (inclusive)
    /// @param to    End index (exclusive); clamped to campaigns.length
    function getCampaigns(uint256 from, uint256 to)
        external
        view
        returns (address[] memory)
    {
        uint256 len = campaigns.length;
        if (from >= len) return new address[](0);
        if (to > len) to = len;
        address[] memory out = new address[](to - from);
        for (uint256 i = from; i < to; i++) {
            out[i - from] = campaigns[i];
        }
        return out;
    }
}
