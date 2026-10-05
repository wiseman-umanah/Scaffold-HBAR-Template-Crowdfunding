![alt text](image.png)

# USD-HBAR Crowdfunding — Scaffold-HBAR Template

A **multi-campaign USD-denominated crowdfunding platform** on Hedera Testnet, powered by a Chainlink HBAR/USD oracle.

Deploy the factory once, then users can create unlimited campaigns from the UI with shareable URLs.

## Real-world Use Case

Community drives · school projects · emergency funds · small creative campaigns.

---

## Quick Start

### Step 1 — Scaffold the project

Using npm:

```bash
npm create scaffold-hbar@latest -- --template wiseman-umanah/Scaffold-HBAR-Template-Crowdfunding
```

Or using Yarn:

```bash
yarn create scaffold-hbar@latest --template wiseman-umanah/Scaffold-HBAR-Template-Crowdfunding
```

The template is downloaded and the project dependencies are installed automatically.

---

### Step 2 — Get your prerequisites

Before running anything, make sure you have:

| Requirement              | How to get it                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Node.js >= 20.18.3       | [nodejs.org](https://nodejs.org)                                                   |
| npm or Yarn              | npm is included with Node.js. Yarn can be enabled with `corepack enable`           |
| Hedera Testnet account   | [Hedera Portal](https://portal.hedera.com/) — sign up and create a Testnet account |
| Testnet HBAR             | Use the [Hedera Portal faucet](https://portal.hedera.com/faucet) to fund your ECDSA address                            |
| ECDSA private key        | Export from MetaMask, HashPack wallet settings, or `cast wallet new`               |
| WalletConnect Project ID | Free at [cloud.walletconnect.com](https://cloud.walletconnect.com)                 |

> **Important:** Your ECDSA address needs at least one inbound HBAR before it can deploy. If deployment fails with `Sender account not found`, fund the address from the Portal faucet first.

---

### Step 3 — Configure the contract deployer

#### macOS / Linux

```bash
cp packages/hardhat/.env.example packages/hardhat/.env
```

#### Windows CMD

```cmd
copy packages\hardhat\.env.example packages\hardhat\.env
```

#### Windows PowerShell

```powershell
Copy-Item packages/hardhat/.env.example packages/hardhat/.env
```

Edit `packages/hardhat/.env` and add your private key:

```env
HARDHAT_PRIVATE_KEY=0x...
```

---

### Step 4 — Deploy the factory contract

The factory is deployed **once**. It creates individual campaign contracts on demand from the UI.

Using npm:

```bash
cd packages/hardhat

npm run deploy:factory
```

Or using Yarn:

```bash
cd packages/hardhat

yarn deploy:factory
```

The script will print output similar to:

```text
CrowdfundFactory deployed: 0xABC...

HashScan: https://hashscan.io/testnet/contract/0xABC...

Add to packages/frontend/.env.local:

NEXT_PUBLIC_FACTORY_ADDRESS=0xABC...
NEXT_PUBLIC_FACTORY_DEPLOY_BLOCK=12345678
```

**Copy both printed values.** You will need them in the next step.

---

### Step 5 — Configure the frontend

#### macOS / Linux

```bash
cp packages/frontend/.env.example packages/frontend/.env.local
```

#### Windows CMD

```cmd
copy packages\frontend\.env.example packages\frontend\.env.local
```

#### Windows PowerShell

```powershell
Copy-Item packages/frontend/.env.example packages/frontend/.env.local
```

Edit `packages/frontend/.env.local` and fill in all three values:

```env
NEXT_PUBLIC_FACTORY_ADDRESS=0xABC...
NEXT_PUBLIC_FACTORY_DEPLOY_BLOCK=12345678
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

---

### Step 6 — Start the frontend

Using npm:

```bash
cd packages/frontend

npm run dev
```

Or using Yarn:

```bash
cd packages/frontend

yarn dev
```

Open **http://localhost:3000** in your browser.

Connect your wallet using MetaMask or HashPack on Hedera Testnet (chain ID `296`) and you're ready to go.

---

## What happens next

1. **Gallery (`/`)** — See all campaigns. Click **Create Campaign** to launch a new one.

2. **Create** — Enter a title, description, USD goal, and duration. This deploys a new campaign contract and redirects you to its page.

3. **Contribute** — Enter an HBAR amount, or switch to USD input for a live HBAR/USD conversion using Chainlink.

4. **Finalize** — Anyone can call this after the deadline. The oracle is read once and the result becomes permanent.

5. **Withdraw or Refund** — The organizer can withdraw the funds if the goal was met. Otherwise, each contributor can claim a full refund.

6. **Share** — Share the campaign URL (`/campaign/0x…`). The campaign title and description load without requiring a login.

---

## Other useful commands

### Run the full test suite

Using npm:

```bash
cd packages/hardhat

npm test
```

Using Yarn:

```bash
cd packages/hardhat

yarn test
```

The tests run against the local Hardhat EVM and do not require a network connection.

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

### Compile contracts

Using npm:

```bash
npm run compile
```

Using Yarn:

```bash
yarn compile
```

---

## What this is

* One `CrowdfundFactory` is deployed **once**. It stores the Chainlink feed address.
* Users call `createCampaign()` from the UI. Each call deploys a fresh `UsdGoalCrowdfund` contract.
* Contributors send native HBAR only. There are no tokens, DEXs, or WHBAR involved.
* After the deadline, **anyone** can call `finalize()`.
* The Chainlink HBAR/USD feed is read **exactly once** during finalization, and that result becomes final.
* **Goal met:** The organizer can withdraw the HBAR pot.
* **Goal not met:** Every contributor can claim a full refund.

Real-world uses include community drives, school projects, emergency funds, and small creative campaigns.

---

## Contract & Oracle Addresses

| Item                              | Address                                                                 |
| --------------------------------- | ----------------------------------------------------------------------- |
| Chainlink HBAR/USD feed (Testnet) | `0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a`                            |
| Deployed factory                  | See `packages/hardhat/deployments/hedera_testnet.json` after deployment |

HashScan proof:

[View the deployed factory on HashScan](https://hashscan.io/testnet/contract/0xb6136d979D027690031E3E9d86a02c548498D1A9)

---

## Unit Notes

* **HBAR decimals on-chain:** 18. Hashio exposes native HBAR using wei-style units, similar to ETH.
* **Chainlink feed decimals:** 8. For example, `10150000` represents `$0.1015` per HBAR.
* **`goalUsd` decimals:** 8. For example, `1_000_000_000` represents `$10.00`.

### USD raised formula

```text
usdRaised = (totalRaised × answer) / 1e18
```

### HashPack tinybar quirk

HashPack divides `msg.value` by `1e10` on the way to the chain.

On-chain balances are represented in tinybars, so the frontend multiplies HBAR reads by `10_000_000_000` for display.

### Volatility disclaimer

`goalMet` is determined by the **single** oracle price read inside `finalize()`.

If the HBAR price changes significantly between contributions and finalization, the outcome may differ from contributor expectations. This is intentional and is part of the design.

---

## Architecture

```text
packages/

├── hardhat/
│   ├── contracts/
│   │   ├── CrowdfundFactory.sol        ← deployed once; users call createCampaign() from UI
│   │   ├── UsdGoalCrowdfund.sol        ← one instance per campaign
│   │   └── interfaces/
│   │       └── AggregatorV3Interface.sol
│   ├── scripts/
│   │   └── deployFactory.ts            ← the only deploy script
│   ├── test/
│   │   ├── UsdGoalCrowdfund.ts
│   │   └── CrowdfundFactory.ts
│   └── deployments/
│       └── hedera_testnet.json
│
└── frontend/                           ← Next.js 14 App Router + wagmi + RainbowKit
    └── src/
        ├── app/
        │   ├── page.tsx                ← gallery + CreateCampaignForm (/)
        │   ├── campaign/[address]/     ← shareable /campaign/:address
        │   ├── layout.tsx              ← root layout, wraps Providers
        │   └── providers.tsx           ← wagmi + RainbowKit singleton providers
        ├── components/
        │   ├── ActionButtons.tsx       ← finalize / withdraw / refund buttons
        │   ├── CampaignCard.tsx        ← campaign detail stats card
        │   ├── CampaignPreviewCard.tsx ← gallery preview tile
        │   ├── ContributeForm.tsx      ← HBAR/USD dual-input contribute form
        │   ├── ContributorList.tsx     ← contributor leaderboard
        │   └── CreateCampaignForm.tsx  ← campaign creation form
        ├── hooks/
        │   ├── useCampaign.ts          ← contract reads + useHbarPrice
        │   ├── useCampaignMeta.ts      ← title/description from Mirror Node
        │   ├── useFactory.ts            ← campaign list from Mirror Node
        │   └── useContributors.ts       ← contributor leaderboard from Mirror Node
        └── config/
            ├── chains.ts               ← Hedera Testnet viem chain (id: 296)
            └── abi.ts                  ← CROWDFUND_ABI + FACTORY_ABI
```

---

## Event log reads: Mirror Node, not `eth_getLogs`

Hedera Hashio `eth_getLogs` is limited to approximately 7 days of blocks.

Block numbers are also packed timestamps rather than sequential block numbers.

For this reason, event log reads such as `CampaignCreated` and `Contributed` use the **Hedera Mirror Node REST API** instead:

https://testnet.mirrornode.hedera.com

---

## Demo Path

1. Fund the deployer address from the [Hedera Portal](https://portal.hedera.com/).
2. Deploy the factory with `npm run deploy:factory` or `yarn deploy:factory`.
3. Set the required environment variables.
4. Start the frontend with `npm run dev` or `yarn dev`.
5. Create a campaign with a short deadline, such as one minute for testing.
6. Use two or three funded contributor addresses and contribute different HBAR amounts.
7. After the deadline, click **Finalize** in the UI.
8. Test **Withdraw** if the goal was met, or **Refund** if it was not.
9. Capture HashScan links for the factory deployment, campaign deployment, contributions, finalization, and withdrawal or refund transactions.

---

## Troubleshooting

### Missing Hardhat dependencies

The template already includes the required Hardhat dependencies, so you normally **should not need to install them manually**.

If you are inside `packages/hardhat` and encounter an `HH801` error or another error indicating that Hardhat dependencies are missing, install the required packages manually.

#### Windows CMD

```cmd
cd packages\hardhat

npm install --save-dev "@nomicfoundation/hardhat-chai-matchers@^2.0.0" "@nomicfoundation/hardhat-ethers@^3.0.0" "@nomicfoundation/hardhat-ignition-ethers@^0.15.0" "@nomicfoundation/hardhat-network-helpers@^1.0.0" "@nomicfoundation/hardhat-verify@^2.0.0" "@typechain/ethers-v6@^0.5.0" "@typechain/hardhat@^9.0.0" "@types/chai@^4.2.0" "@types/mocha@>=9.1.0" "chai@^4.2.0" "ethers@^6.4.0" "hardhat-gas-reporter@^1.0.8" "solidity-coverage@^0.8.1" "typechain@^8.3.0"
```

Wait for the installation to finish without errors.

Then deploy again:

```cmd
npm run deploy:factory
```

### If `HH801` still appears

Install Hardhat and the Hardhat Toolbox explicitly inside `packages/hardhat`:

```cmd
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

Then try the deployment again:

```cmd
npm run deploy:factory
```

> **Note:** This is a fallback for dependency installation issues. The template is already configured with these dependencies, so most users should not need these steps.
