// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AggregatorV3Interface
/// @notice Minimal Chainlink price feed interface used by UsdGoalCrowdfund
interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );

    function decimals() external view returns (uint8);
}
