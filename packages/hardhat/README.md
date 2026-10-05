# packages/hardhat

Hardhat workspace for the USD-HBAR Crowdfunding template. Contains two contracts, a factory deploy script, and a full test suite.

## Contracts

### `CrowdfundFactory.sol`

Deployed **once** by the developer. Stores the Chainlink feed address and `maxAge` and passes them to every campaign it creates.

| Function                                                | Description                                               |
| ------------------------------------------------------- | --------------------------------------------------------- |
| `createCampaign(goalUsd, deadline, title, description)` | Deploys a new `UsdGoalCrowdfund`; emits `CampaignCreated` |

Title and description live **in event logs only**, not in contract state. The frontend reads them from the Hedera Mirror Node.

### `UsdGoalCrowdfund.sol`

One instance per campaign. The constructor sets all immutable parameters.

| Function                | Who              | What                                                    |
| ----------------------- | ---------------- | ------------------------------------------------------- |
| `contribute()`          | Anyone           | Send HBAR while campaign is open                        |
| `finalize()`            | Anyone           | After deadline, reads oracle once and sets `goalMet`    |
| `withdraw()`            | Organizer only   | Collect all HBAR if the goal was met                    |
| `refund()`              | Each contributor | Reclaim HBAR if the goal was not met                    |
| `previewUsdValue(hbar)` | View             | UI-only USD estimate; does **not** affect `goalMet`     |
| `timeLeft()`            | View             | Seconds until deadline, `0` if past                     |
| `isOpen()`              | View             | `true` while `!finalized && block.timestamp < deadline` |

### `interfaces/AggregatorV3Interface.sol`

Minimal five-function interface for the Chainlink feed.

**Do not** install `@chainlink/contracts`. This local interface avoids unnecessary dependency conflicts.

---

## Commands

### Install dependencies

From the repository root:

Using npm:

```bash
npm install
```

Or using Yarn:

```bash
yarn install
```

### Compile contracts

Using npm:

```bash
npm run compile
```

Or using Yarn:

```bash
yarn compile
```

### Run all tests

The full test suite contains 31 tests across both suites.

Using npm:

```bash
npm test
```

Or using Yarn:

```bash
yarn test
```

### Run a single test file

Using npm:

```bash
npx hardhat test test/UsdGoalCrowdfund.ts
npx hardhat test test/CrowdfundFactory.ts
```

Using Yarn:

```bash
yarn hardhat test test/UsdGoalCrowdfund.ts
yarn hardhat test test/CrowdfundFactory.ts
```

### Deploy the factory to Hedera Testnet

Using npm:

```bash
npm run deploy:factory
```

Or using Yarn:

```bash
yarn deploy:factory
```

---

## Deploy

Before deploying, configure the environment file.

### macOS / Linux

```bash
cp .env.example .env
```

### Windows CMD

```cmd
copy .env.example .env
```

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

Set `HARDHAT_PRIVATE_KEY` in `.env`:

```env
HARDHAT_PRIVATE_KEY=0x...
```

Make sure the ECDSA address has been funded with Testnet HBAR before deploying.

You can get Testnet HBAR from the [Hedera Portal](https://portal.hedera.com/).

Then deploy the factory.

Using npm:

```bash
npm run deploy:factory
```

Using Yarn:

```bash
yarn deploy:factory
```

The deploy script:

1. Deploys `CrowdfundFactory` with the hardcoded Chainlink feed and `maxAge: 3600`.
2. Prints the factory address and a HashScan link.
3. Prints the two environment variables to copy into `packages/frontend/.env.local`.
4. Writes `deployments/hedera_testnet.json` with `{ factory, deployBlock, chainId, deployedAt }`.

> The `gasLimit: 3_000_000` option is required. Hedera may reject deployments with insufficient gas.

---

## Testing

Tests use Hardhat's in-process EVM. No Hedera Testnet connection is required.

Key testing patterns:

* **Mock feed:** `contracts/test/MockFeed.sol` is deployed inline in each test and returns a configurable `answer` and `updatedAt`.
* **Time warp:** `network.provider.send("evm_increaseTime", [seconds])` together with `evm_mine` advances the blockchain past the deadline.
* **Boundary:** `usdRaised == goalUsd` must set `goalMet = true`.

Test coverage includes:

* Goal-met path
* Refund path
* Second-refund revert
* Contribute-after-deadline revert
* Finalize-before-deadline revert
* Double-finalize revert
* Stale oracle revert
* View helpers
* Factory organizer identity
* Factory event metadata
* `createCampaign` input validation

---

## Unit Math

```solidity
// HBAR is 18-decimal (wei-style via Hashio).
// Chainlink answer is 8-decimal.
// goalUsd is 8-decimal.

uint256 usdRaised = (totalRaised * uint256(answer)) / 1e18;

bool met = usdRaised >= goalUsd;

// Example:
// 100 HBAR (100e18) * 10150000 / 1e18
// = 1015000000
// = $10.15 in 8-decimal USD
```

`goalUsd` uses 8 decimals:

```text
$10 = 10 * 1e8 = 1_000_000_000
```

---

## Critical Fixed Values

| Field                        | Value                                        |
| ---------------------------- | -------------------------------------------- |
| Chainlink HBAR/USD (Testnet) | `0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a` |
| Chain ID                     | `296`                                        |
| RPC                          | `https://testnet.hashio.io/api`              |
| Feed decimals                | `8`                                          |
| `maxAge`                     | `3600` (1 hour)                              |

---

## Troubleshooting

### Missing Hardhat dependencies

The template already includes the required Hardhat dependencies, so you normally **should not need to install them manually**.

If you encounter an `HH801` error or another error indicating that Hardhat dependencies are missing, make sure you are inside `packages/hardhat` and install the required packages manually.

### Windows CMD

```cmd
npm install --save-dev "@nomicfoundation/hardhat-chai-matchers@^2.0.0" "@nomicfoundation/hardhat-ethers@^3.0.0" "@nomicfoundation/hardhat-ignition-ethers@^0.15.0" "@nomicfoundation/hardhat-network-helpers@^1.0.0" "@nomicfoundation/hardhat-verify@^2.0.0" "@typechain/ethers-v6@^0.5.0" "@typechain/hardhat@^9.0.0" "@types/chai@^4.2.0" "@types/mocha@>=9.1.0" "chai@^4.2.0" "ethers@^6.4.0" "hardhat-gas-reporter@^1.0.8" "solidity-coverage@^0.8.1" "typechain@^8.3.0"
```

Wait for the installation to finish without errors.

Then deploy again:

```cmd
npm run deploy:factory
```

### If `HH801` still appears

Install Hardhat and the Hardhat Toolbox explicitly:

```cmd
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

Then deploy again:

```cmd
npm run deploy:factory
```

> **Note:** These are fallback troubleshooting steps. The template already includes the required dependencies, so most users should not need them.
