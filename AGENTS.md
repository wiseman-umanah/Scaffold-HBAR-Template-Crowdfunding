# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project

USD-denominated crowdfunding on Hedera testnet. **Factory model**: one `CrowdfundFactory` deployed once; users create individual `UsdGoalCrowdfund` campaigns via the UI. Contributors send only native HBAR. Goal outcome is determined by a single Chainlink oracle read inside `finalize()` — never per-contribution.

## Stack

- **Monorepo**: pnpm workspaces — `packages/hardhat` and `packages/frontend`
- **Smart contracts**: Hardhat + Solidity `^0.8.20`
- **Frontend**: Next.js 14 App Router + TypeScript + RainbowKit + wagmi + viem
- **Node**: >= 20.18.3 · **Package manager**: pnpm >= 9

## Key Commands

```bash
# From repo root
pnpm install

# From packages/hardhat/
pnpm test                                          # run all tests (both suites)
pnpm hardhat test test/UsdGoalCrowdfund.ts         # single test file
pnpm hardhat test test/CrowdfundFactory.ts         # single test file
pnpm run deploy:factory                            # deploys CrowdfundFactory to hedera_testnet

# From packages/frontend/
pnpm dev
pnpm build
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

## HashPack Tinybar Scaling (frontend only)

HashPack divides `msg.value` by `1e10` before sending on-chain. All on-chain HBAR amounts (`totalRaised`, `contributions`) are stored as tinybars. The frontend multiplies every on-chain HBAR value by `10_000_000_000n` for display. Sending (ContributeForm) uses `parseEther(hbarInput)` unchanged.

## Mirror Node (replaces eth_getLogs)

Hedera Hashio `eth_getLogs` fails for any range > ~7 days of blocks — block "numbers" are packed nanosecond timestamps, not sequential integers; subtraction is meaningless. Both `useFactory` and `useContributors` use the **Hedera Mirror Node REST API** instead:
- Base URL: `https://testnet.mirrornode.hedera.com`
- Endpoint: `/api/v1/contracts/{addr}/results/logs?limit=100&order=asc`
- topic0 filter requires a timestamp range on mirror node — filter client-side instead
- Pagination via `links.next` in the response

Event topic hashes:
- `CampaignCreated`: `0x71535c0fb2cc0698611e65f99d703fe0e5711fd616b8016ddceaadc134b203d8`
- `Contributed`: `0xfa35a310d7113dddce1c275da946348e9aaebf9050b00b372033c4d84b0bd6eb`

## Security Rules (must follow CEI)

- `withdraw()` and `refund()`: zero state (`withdrawn = true` / `contributions[msg.sender] = 0`) **before** sending HBAR.
- `finalize()`: require `!finalized` first; set `finalized = true` on the success path only.
- Oracle validation in `finalize()`: `answer > 0`, `block.timestamp - updatedAt <= maxAge`, `answeredInRound >= roundId`. A stale or non-positive answer must **REVERT** — never silently set `goalMet = false`.

## Deployment

Deploy is **factory-only** — run once, users create campaigns via UI:

```bash
cd packages/hardhat && pnpm run deploy:factory
# Prints: NEXT_PUBLIC_FACTORY_ADDRESS and NEXT_PUBLIC_FACTORY_DEPLOY_BLOCK
# Writes: deployments/hedera_testnet.json
```

Add both env vars to `packages/frontend/.env.local`. Use `gasLimit: 3_000_000` — Hedera silently rejects low gas. New addresses need an inbound HBAR first or deploy fails with "Sender account not found". Print HashScan URL: `https://hashscan.io/testnet/contract/<address>`.

## Hard Constraints (never violate)

- `CrowdfundFactory` passes `msg.sender` explicitly as `organizer_` to `UsdGoalCrowdfund` — do NOT let the factory become the organizer.
- Title and description stored **in event logs only** (`CampaignCreated` event) — not in contract state. `useCampaignMeta` reads them from the mirror node.
- Price is read **once** in `finalize()` only — never snapshot per `contribute()`.
- `previewUsdValue()` is UI-only; does NOT affect `goalMet`.
- No token association, no WHBAR, no SaucerSwap, no DEX flows.
- `goalUsd` is stored with 8 decimals (e.g. `$10 = 10 * 1e8 = 1_000_000_000`).

## Required Files for Eligibility

`template.json`, `README.md`, `AGENTS.md`, `LICENSE` (MIT), `packages/hardhat/contracts/UsdGoalCrowdfund.sol`, `packages/hardhat/contracts/CrowdfundFactory.sol`, deploy script, test files, HashScan proof link in README.

## template.json (required fields)

```json
{ "name": "usd-hbar-crowdfund", "description": "USD-HBAR crowdfunding on Hedera with Chainlink HBAR/USD and automatic refunds",
  "version": "1.0.0", "tags": ["crowdfunding","oracle","chainlink","hbar","refunds"], "repository": "https://github.com/wiseman-umanah/Scaffold-HBAR-Template-Crowdfunding" }
```
