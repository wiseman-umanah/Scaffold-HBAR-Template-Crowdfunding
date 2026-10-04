# USD-Goal Crowdfunding — Scaffold-HBAR Template

> One-command scaffold:
> ```bash
> pnpm create scaffold-hbar@latest --template <org>/usd-hbar-crowdfund
> ```

## What this is

A USD-denominated crowdfunding contract on **Hedera Testnet**. An organiser sets a goal in USD and a deadline. Contributors send only testnet **HBAR** — no token association, no WHBAR, no DEX. After the deadline, **anyone** calls `finalize()` which reads the [Chainlink HBAR/USD feed](https://data.chain.link/) **once** and decides if the goal was met.

- **Goal met** → organiser calls `withdraw()` to collect all HBAR.
- **Goal not met** → every contributor calls `refund()` to recover their full HBAR.

### How this differs from price-triggered escrow

A price-triggered escrow releases funds **if the token price crosses a threshold**. This template is a **pooled crowdfunding** contract: funds are released only if the USD value of all pooled HBAR contributions is at or above the fundraising goal at the moment of finalisation.

### Real-world use cases

Community drives · school projects · emergency funds · small creative campaigns.

---

## Prerequisites

| Requirement | Detail |
|---|---|
| Node.js | >= 20.18.3 |
| Testnet account | [Hedera Portal](https://portal.hedera.com/) |
| Testnet HBAR faucet | [HashScan faucet](https://portal.hedera.com/) or ask in the Hedera Discord |
| ECDSA private key | Export from MetaMask or generate via `cast wallet new` |

---

## Environment Variables

### `packages/hardhat/.env`

| Variable | Required | Description |
|---|---|---|
| `HARDHAT_PRIVATE_KEY` | ✅ | ECDSA private key for deployment (`0x…`) |
| `HASHIO_RPC_URL` | optional | Override RPC (default: `https://testnet.hashio.io/api`) |

### `packages/nextjs/.env.local`

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | ✅ | Deployed contract address (auto-populated by deploy script) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ✅ | WalletConnect Cloud project ID |

---

## Deploy Steps

### 1. Install dependencies

```bash
pnpm install          # installs all workspace packages
```

### 2. Configure environment

```bash
cp packages/hardhat/.env.example packages/hardhat/.env
# Edit HARDHAT_PRIVATE_KEY — fund the address from the Hedera Portal faucet first
```

> **Important:** A brand-new ECDSA address needs at least one inbound HBAR before it can deploy. If deploy fails with `Sender account not found`, fund the address first.

### 3. Compile

```bash
cd packages/hardhat
pnpm dlx hardhat compile
```

### 4. Run tests

```bash
pnpm dlx hardhat test
```

### 5. Deploy to Hedera Testnet

```bash
pnpm dlx hardhat run scripts/deploy.ts --network hedera_testnet
```

The script prints the contract address and a HashScan URL, and writes `deployments/hedera_testnet.json` for the frontend.

### Constructor parameter meanings

| Parameter | Value in deploy script | Meaning |
|---|---|---|
| `goalUsd_` | `10 * 1e8` | $10 goal (8-decimal USD) |
| `deadline_` | `now + 3600` | Campaign closes in 1 hour |
| `feed_` | `0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a` | Chainlink HBAR/USD testnet feed |
| `maxAge_` | `3600` | Accept oracle answers up to 1 hour old |

---

## UI Walkthrough

1. Open `http://localhost:3000` after `pnpm dev` in `packages/nextjs`.
2. Connect your wallet (MetaMask on Hedera Testnet, chainId 296).
3. **Contribute** — enter HBAR amount and click Contribute while the campaign is open.
4. **Wait** for the deadline to pass (or use a short-deadline deploy for testing).
5. **Finalize** — any wallet can call this after the deadline. The oracle is read once.
6. **Withdraw** (organiser only, if goal met) or **Refund** (each contributor, if goal not met).

---

## Contract & Oracle Addresses

| Item | Address |
|---|---|
| Chainlink HBAR/USD feed (testnet) | `0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a` |
| Deployed contract | _see `packages/hardhat/deployments/hedera_testnet.json` after deploy_ |

HashScan proof: _(add your HashScan link here after deployment)_

---

## Unit Notes

- **HBAR decimals:** 18 (Hashio exposes native HBAR as wei-style, just like ETH).
- **Chainlink feed decimals:** 8 (e.g., answer `10150000` = $0.1015 per HBAR).
- **goalUsd decimals:** 8 (e.g., `1_000_000_000` = $10.00).
- **USD raised formula:** `usdRaised = (totalRaised × answer) / 1e18`

### Volatility disclaimer

`goalMet` is determined by the **single** oracle price read inside `finalize()`. If HBAR price changes significantly between contributions and finalisation, the outcome may differ from contributor expectations. This is by design — per-contribution snapshots introduce stale-feed risk and wrong semantics if HBAR moves before deadline.

---

## Architecture

```
packages/
├── hardhat/
│   ├── contracts/
│   │   ├── UsdGoalCrowdfund.sol      ← one campaign per deployment
│   │   └── interfaces/
│   │       └── AggregatorV3Interface.sol
│   ├── scripts/deploy.ts             ← deploys to hedera_testnet
│   ├── test/UsdGoalCrowdfund.ts      ← mock feed, time warp, boundary tests
│   └── deployments/hedera_testnet.json  ← written by deploy script
└── nextjs/
    ├── app/page.tsx                  ← single page
    ├── config/chains.ts              ← Hedera Testnet viem chain
    ├── components/
    │   ├── CampaignCard.tsx
    │   ├── ContributeForm.tsx
    │   └── ActionButtons.tsx
    └── hooks/useCampaign.ts          ← wagmi reads for all state
```

---

## Demo Path

1. Fund deployer address from [Hedera Portal](https://portal.hedera.com/).
2. Deploy with `$10` goal and 1-hour deadline.
3. Use 2–3 funded contributor addresses; contribute various HBAR amounts.
4. After deadline, click **Finalize** in the UI (or run the deploy script's second deploy with a short deadline for the refund path).
5. **Withdraw** (organiser) or **Refund** (contributors).
6. Capture HashScan links for deploy, contribute, finalize, and withdraw/refund transactions.
