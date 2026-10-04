# USD-HBAR Crowdfunding — Scaffold-HBAR Template

> One-command scaffold:
> ```bash
> npm create scaffold-hbar@latest --template wiseman-umanah/Scaffold-HBAR-Template-Crowdfunding
> # or
> pnpm create scaffold-hbar@latest --template wiseman-umanah/Scaffold-HBAR-Template-Crowdfunding
> ```

## What this is

A **multi-campaign crowdfunding platform** on Hedera Testnet. A single `CrowdfundFactory` is deployed once; anyone can create a campaign from the UI. Each campaign has a USD goal and a deadline. Contributors send only native **HBAR** — no token association, no WHBAR, no DEX.

After the deadline, **anyone** calls `finalize()`, which reads the [Chainlink HBAR/USD feed](https://data.chain.link/) **exactly once** and decides if the goal was met:

- **Goal met** → organiser calls `withdraw()` to collect all HBAR.
- **Goal not met** → every contributor calls `refund()` to recover their full HBAR.

### How this differs from single-contract templates

Most crowdfunding templates deploy one contract = one campaign. This template uses a **factory**: deploy once, create unlimited campaigns from the UI. Each campaign gets a dedicated contract with a shareable URL (`/campaign/0x...`).

### Real-world use cases

Community drives · school projects · emergency funds · small creative campaigns.

---

## Prerequisites

| Requirement | Detail |
|---|---|
| Node.js | >= 20.18.3 |
| pnpm | >= 9 |
| Testnet account | [Hedera Portal](https://portal.hedera.com/) |
| Testnet HBAR faucet | [Hedera Portal faucet](https://portal.hedera.com/) or ask in the Hedera Discord |
| ECDSA private key | Export from MetaMask or generate via `cast wallet new` or get from your wallet setting in Hashpack |
| WalletConnect project ID | Free at [cloud.walletconnect.com](https://cloud.walletconnect.com) |

> **Important:** A brand-new ECDSA address needs at least one inbound HBAR before it can deploy. If deploy fails with `Sender account not found`, fund the address first.

---

## Environment Variables

### `packages/hardhat/.env`

| Variable | Required | Description |
|---|---|---|
| `HARDHAT_PRIVATE_KEY` | ✅ | ECDSA private key for deployment (`0x…`) |
| `HASHIO_RPC_URL` | optional | Override RPC (default: `https://testnet.hashio.io/api`) |

### `packages/frontend/.env.local`

| Variable | Required | Description |
|---|---|---|
| `VITE_FACTORY_ADDRESS` | ✅ | Factory contract address — printed by deploy script |
| `VITE_FACTORY_DEPLOY_BLOCK` | ✅ | Block factory was deployed at — printed by deploy script |
| `VITE_WALLETCONNECT_PROJECT_ID` | ✅ | WalletConnect Cloud project ID |

Copy the template:
```bash
cp packages/frontend/.env.example packages/frontend/.env.local
```

---

## Deploy & Run

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure the deployer

```bash
cp packages/hardhat/.env.example packages/hardhat/.env
# Edit HARDHAT_PRIVATE_KEY — fund the address from the Hedera Portal faucet first
```

### 3. Compile contracts

```bash
cd packages/hardhat
pnpm compile
```

### 4. Run tests

```bash
pnpm test                                  # all 31 tests
pnpm hardhat test test/UsdGoalCrowdfund.ts # single suite
pnpm hardhat test test/CrowdfundFactory.ts # single suite
```

### 5. Deploy the factory (once)

```bash
pnpm run deploy:factory
```

The script prints:

```
CrowdfundFactory deployed: 0x…
HashScan: https://hashscan.io/testnet/contract/0x…

Add to packages/frontend/.env.local:
VITE_FACTORY_ADDRESS=0x…
VITE_FACTORY_DEPLOY_BLOCK=12345678
```

Copy both values to `packages/frontend/.env.local`.

### 6. Start the frontend

```bash
cd packages/frontend
pnpm dev
```

Open `http://localhost:5173`. Connect MetaMask (Hedera Testnet, chainId 296) and start creating campaigns.

---

## UI Walkthrough

1. **Gallery** (`/`) — see all campaigns, or click **Create Campaign** to launch a new one.
2. **Create** — enter title, description, USD goal, and duration. Transaction deploys a new `UsdGoalCrowdfund` contract; you are redirected to its campaign page.
3. **Contribute** — enter HBAR amount (or toggle to type USD; conversion shown live via Chainlink).
4. **Finalize** — any wallet can call this after the deadline. The oracle is read once; `goalMet` is set permanently.
5. **Withdraw** (organiser only, if goal met) or **Refund** (each contributor, if goal not met).
6. Share the campaign URL (`/campaign/0x…`) — title and description are always shown, no query params needed.

---

## Contract & Oracle Addresses

| Item | Address |
|---|---|
| Chainlink HBAR/USD feed (testnet) | `0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a` |
| Deployed factory | _see `packages/hardhat/deployments/hedera_testnet.json` after deploy_ |

HashScan proof: _https://hashscan.io/testnet/contract/0xb6136d979D027690031E3E9d86a02c548498D1A9_

---

## Unit Notes

- **HBAR decimals on-chain:** 18 — Hashio exposes native HBAR as wei-style (just like ETH).
- **Chainlink feed decimals:** 8 — e.g., answer `10150000` = $0.1015 per HBAR.
- **goalUsd decimals:** 8 — e.g., `1_000_000_000` = $10.00.
- **USD raised formula:** `usdRaised = (totalRaised × answer) / 1e18`
- **HashPack tinybar quirk:** HashPack divides `msg.value` by `1e10` on the way to the chain. On-chain balances are in tinybars; the frontend multiplies all HBAR reads by `10_000_000_000` for display.

### Volatility disclaimer

`goalMet` is determined by the **single** oracle price read inside `finalize()`. If HBAR price changes significantly between contributions and finalisation, the outcome may differ from contributor expectations. This is by design.

---

## Architecture

```
packages/
├── hardhat/
│   ├── contracts/
│   │   ├── CrowdfundFactory.sol      ← deployed once; users call createCampaign() from UI
│   │   ├── UsdGoalCrowdfund.sol      ← one instance per campaign
│   │   └── interfaces/
│   │       └── AggregatorV3Interface.sol
│   ├── scripts/deployFactory.ts      ← the only deploy script
│   ├── test/
│   │   ├── UsdGoalCrowdfund.ts
│   │   └── CrowdfundFactory.ts
│   └── deployments/hedera_testnet.json
└── frontend/                         ← Vite + React + wagmi + RainbowKit
    └── src/
        ├── pages/
        │   ├── Home.tsx              ← gallery + CreateCampaignForm
        │   └── CampaignPage.tsx      ← shareable /campaign/:address
        ├── hooks/
        │   ├── useCampaign.ts        ← all contract reads
        │   ├── useCampaignMeta.ts    ← title/description from Mirror Node
        │   ├── useFactory.ts         ← campaign list from Mirror Node
        │   └── useContributors.ts    ← contributor leaderboard from Mirror Node
        └── config/
            ├── chains.ts             ← Hedera Testnet viem chain (id: 296)
            └── abi.ts                ← CROWDFUND_ABI + FACTORY_ABI
```

### Event log reads — Mirror Node, not eth_getLogs

Hedera Hashio `eth_getLogs` is limited to ~7 days of blocks (block "numbers" are packed timestamps, not sequential). All event log reads (`CampaignCreated`, `Contributed`) use the **Hedera Mirror Node REST API** (`https://testnet.mirrornode.hedera.com`).

---

## Demo Path

1. Fund deployer address from [Hedera Portal](https://portal.hedera.com/).
2. Deploy factory with `pnpm run deploy:factory`.
3. Set env vars, start `pnpm dev`.
4. Create a campaign with a short deadline (e.g. 1 minute for testing).
5. Use 2–3 funded contributor addresses; contribute various HBAR amounts.
6. After deadline, click **Finalize** in the UI.
7. **Withdraw** (organiser) or **Refund** (contributors).
8. Capture HashScan links for factory deploy, campaign deploy, contribute, finalize, and withdraw/refund transactions.
