# Project Documentation Rules (Non-Obvious Only)

## Authoritative sources

- `prd.md` is the single source of truth — it specifies exact contract interface, oracle address, unit math, and acceptance checklist. Do not invent features outside it.
- The Chainlink feed address `0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a` was validated 4 Oct 2026 — treat as fixed for testnet.

## Counterintuitive design decisions (document these in README)

- **Price read once at `finalize()`, not per `contribute()`** — this is intentional, not an oversight. Explain in README: per-contribute snapshots break on stale feeds and misrepresent goal status if HBAR price moves.
- **No partial refunds, no early cancel** — these are explicit non-goals. Document clearly.
- **`goalUsd` uses 8 decimals**: `$10 = 1_000_000_000` — document this in README unit notes section.
- **HBAR is 18-decimal on Hashio** (wei-style) — not the 8-decimal precision users see in wallets.
- **New deployer addresses need a first inbound HBAR** before deploy (Hedera account activation) — document in demo path / prerequisites.

## README required sections (acceptance criterion)

1. One-command scaffold line: `npm create scaffold-hbar@latest --template <org/repo>`
2. How this differs from price-triggered escrow templates (pooled contributions + per-contributor refunds)
3. Prerequisites: Node ≥ 20.18.3, testnet account, Hedera Portal faucet
4. Env var table: `HARDHAT_PRIVATE_KEY`, `HASHIO_RPC_URL` (optional), frontend public contract address
5. Contract + oracle addresses table with HashScan transaction link
6. Unit notes (18-dec HBAR, 8-dec USD) and volatility disclaimer on finalize price
7. Architecture diagram or package map

## What this template is NOT (prevent scope creep in docs)

- Not a multi-campaign factory — one deploy = one campaign
- Not a SaucerSwap / DEX integration
- Not a WHBAR or HTS token flow
- Not mainnet-ready (testnet only, no audit)
