# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project

USD-denominated crowdfunding on Hedera testnet. One deploy = one campaign. Contributors send only native HBAR. Goal outcome is determined by a single Chainlink oracle read inside `finalize()` — never per-contribution.

## Stack

- **Monorepo**: pnpm workspaces — `packages/hardhat` and `packages/nextjs` (or vite)
- **Smart contracts**: Hardhat + Solidity `^0.8.20`
- **Frontend**: Next.js (preferred) or Vite + React; RainbowKit + wagmi + viem
- **Node**: >= 20.18.3
- **Package manager**: pnpm >= 9

## Key Commands

```bash
# From repo root
pnpm install                      # install all workspace packages

# From packages/hardhat/
pnpm test                         # run all Hardhat tests
pnpm hardhat test test/UsdGoalCrowdfund.ts   # single test file
pnpm hardhat compile
pnpm hardhat run scripts/deploy.ts --network hedera_testnet

# From packages/nextjs/ (or vite frontend)
pnpm build
pnpm dev
```

## Critical Fixed Values (testnet — do not change)

| Field | Value |
|---|---|
| Chainlink HBAR/USD feed | `0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a` |
| Chain ID | `296` |
| RPC | `https://testnet.hashio.io/api` |
| Feed decimals | `8` |
| Recommended `maxAge` | `3600` (1 hour) |

## Unit Math (critical — test this)

```solidity
// HBAR is 18-decimal (wei-style via Hashio). Chainlink answer is 8-decimal. goalUsd is 8-decimal.
uint256 usdRaised = (totalRaised * uint256(answer)) / 1e18;
bool met = usdRaised >= goalUsd;
// e.g. 100 HBAR (100e18) * 10150000 / 1e18 = 1015000000 → $10.15 (8 dec)
```

## Security Rules (must follow CEI)

- `withdraw()` and `refund()`: zero state (`withdrawn = true` / `contributions[msg.sender] = 0`) **before** sending HBAR.
- `finalize()`: require `!finalized` first; set `finalized = true` on the success path only.
- Oracle validation in `finalize()`: `answer > 0`, `block.timestamp - updatedAt <= maxAge`, `answeredInRound >= roundId`. A stale or non-positive answer must **REVERT** — never silently set `goalMet = false`.

## Deployment

- Use `gasLimit: 2_500_000` to `4_000_000` — Hedera rejects low gas limits.
- Env var: `HARDHAT_PRIVATE_KEY` (ECDSA). New addresses need an inbound HBAR first or deploy fails with "Sender account not found".
- Print HashScan URL: `https://hashscan.io/testnet/contract/<address>`

## Hard Constraints (never violate)

- One campaign per contract (constructor-set params). Do **not** add multi-campaign logic.
- Price is read **once** in `finalize()` only — never snapshot per `contribute()`.
- No token association, no WHBAR, no SaucerSwap, no DEX flows.
- No `withdraw()` before `finalize()` completes; no `contribute()` after deadline.
- `goalUsd` is stored with 8 decimals (e.g. `$10 = 10 * 1e8 = 1_000_000_000`).

## Required Files for Eligibility

`template.json`, `README.md`, `AGENTS.md`, `LICENSE` (MIT), `packages/hardhat/contracts/UsdGoalCrowdfund.sol`, deploy script, test file, HashScan proof link in README.

## template.json (required fields)

```json
{ "name": "usd-goal-crowdfund", "description": "USD-goal crowdfunding on Hedera with Chainlink HBAR/USD and automatic refunds",
  "version": "1.0.0", "tags": ["crowdfunding","oracle","chainlink","hbar","refunds"], "repository": "https://github.com/<org>/<repo>" }
```
