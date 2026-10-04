// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev Test-only mock for AggregatorV3Interface.
///      Used in UsdGoalCrowdfund.ts tests to set arbitrary oracle responses.
contract MockFeed {
    uint80  public roundId;
    int256  public answer;
    uint256 public startedAt;
    uint256 public updatedAt;
    uint80  public answeredInRound;
    uint8   private _decimals = 8;

    function setRound(
        uint80  _roundId,
        int256  _answer,
        uint256 _updatedAt,
        uint80  _answeredInRound
    ) external {
        roundId         = _roundId;
        answer          = _answer;
        startedAt       = block.timestamp;
        updatedAt       = _updatedAt;
        answeredInRound = _answeredInRound;
    }

    function setDecimals(uint8 d) external {
        _decimals = d;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80,
            int256,
            uint256,
            uint256,
            uint80
        )
    {
        return (roundId, answer, startedAt, updatedAt, answeredInRound);
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }
}
