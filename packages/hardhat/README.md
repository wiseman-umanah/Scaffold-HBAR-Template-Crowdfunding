# packages/hardhat

Hardhat workspace for the USD-HBAR Crowdfunding template. Contains two contracts, a factory deploy script, and a full test suite.

## Contracts

### `CrowdfundFactory.sol`

Deployed **once** by the developer. Stores the Chainlink feed address and `maxAge` and passes them to every campaign it creates.

| Function | Description |
|---|---|
| `createCampaign(goalUsd, deadline, title, description)` | Deploys a new `UsdGoalCrowdfund`; emits `CampaignCreated` |

Title and description live **in event logs only** — not in contract state. The frontend reads them from the Hedera Mirror Node.

### `UsdGoalCrowdfund.sol`

One instance per campaign. Constructor sets all immutable parameters.

| Function | Who | What |
|---|---|---|
| `contribute()` | Anyone | Send HBAR while campaign is open |
| `finalize()` | Anyone | After deadline — reads oracle once, sets `goalMet` |
| `withdraw()` | Organizer only | Collect all HBAR if goal was met |
| `refund()` | Each contributor | Reclaim HBAR if goal was not met |
| `previewUsdValue(hbar)` | View | UI-only USD estimate — does **not** affect `goalMet` |
| `timeLeft()` | View | Seconds until deadline (0 if past) |
| `isOpen()` | View | `true` while `!finalized && block.timestamp < deadline` |

### `interfaces/AggregatorV3Interface.sol`

Minimal 5-function interface for the Chainlink feed. **Do not** install `@chainlink/contracts` — this local file avoids dependency conflicts.

---

## Commands

```bash
# Install deps (from repo root)
pnpm install

# Compile
pnpm compile

# Run all tests (31 tests, both suites)
pnpm test

# Run a single test file
pnpm hardhat test test/UsdGoalCrowdfund.ts
pnpm hardhat test test/CrowdfundFactory.ts

# Deploy the factory to Hedera Testnet
pnpm run deploy:factory
```

---

## Deploy

```bash
cp .env.example .env
# Set HARDHAT_PRIVATE_KEY to your ECDSA key (0x…)
# Fund the address from https://portal.hedera.com/ first
pnpm run deploy:factory
```

The deploy script:
1. Deploys `CrowdfundFactory` with the hardcoded Chainlink feed and `maxAge: 3600`.
2. Prints the factory address and a HashScan link.
3. Prints the two env vars to copy into `packages/frontend/.env.local`.
4. Writes `deployments/hedera_testnet.json` with `{ factory, deployBlock, chainId, deployedAt }`.

> The `gasLimit: 3_000_000` option is required — Hedera silently rejects deploys with insufficient gas.

---

## Testing

Tests use Hardhat's in-process EVM. No Hedera testnet connection is needed.

Key patterns:
- **Mock feed**: `contracts/test/MockFeed.sol` — deployed inline in each test, returns a configurable `answer` and `updatedAt`.
- **Time warp**: `network.provider.send("evm_increaseTime", [seconds])` + `evm_mine` to advance past the deadline.
- **Boundary**: `usdRaised == goalUsd` must set `goalMet = true`.

Test coverage includes: goal-met path, refund path, second-refund revert, contribute-after-deadline revert, finalize-before-deadline revert, double-finalize revert, stale oracle revert, view helpers, factory organizer identity, factory event metadata, `createCampaign` input validation.

---

## Unit Math

```solidity
// HBAR is 18-decimal (wei-style via Hashio). Chainlink answer is 8-decimal. goalUsd is 8-decimal.
uint256 usdRaised = (totalRaised * uint256(answer)) / 1e18;
bool met = usdRaised >= goalUsd;
// e.g. 100 HBAR (100e18) * 10150000 / 1e18 = 1015000000 → $10.15 in 8-decimal USD
```

`goalUsd` uses 8 decimals: `$10 = 10 * 1e8 = 1_000_000_000`.

---

## Critical Fixed Values

| Field | Value |
|---|---|
| Chainlink HBAR/USD (testnet) | `0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a` |
| Chain ID | `296` |
| RPC | `https://testnet.hashio.io/api` |
| Feed decimals | `8` |
| maxAge | `3600` (1 hour) |
