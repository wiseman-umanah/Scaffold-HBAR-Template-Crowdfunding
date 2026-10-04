# Project Architecture Rules (Non-Obvious Only)

## Monorepo structure (required layout)

```
usd-goal-crowdfund/
├── package.json              # workspaces: ["packages/*"]
├── template.json             # scaffold-hbar manifest (REQUIRED)
├── LICENSE                   # MIT
├── README.md
├── AGENTS.md
├── packages/
│   ├── hardhat/
│   │   ├── hardhat.config.ts # chainId 296, Hashio RPC
│   │   ├── .env.example
│   │   ├── contracts/
│   │   │   ├── UsdGoalCrowdfund.sol
│   │   │   └── interfaces/AggregatorV3Interface.sol
│   │   ├── scripts/deploy.ts
│   │   ├── test/UsdGoalCrowdfund.ts
│   │   └── deployments/      # written by deploy script, read by frontend
│   └── nextjs/               # (or vite)
│       ├── config/chains.ts  # custom Hedera Testnet chain definition
│       ├── components/
│       │   ├── CampaignCard.tsx
│       │   ├── ContributeForm.tsx
│       │   └── ActionButtons.tsx
│       ├── hooks/useCampaign.ts
│       └── app/ or src/
```

## Data flow (one-way, no side channels)

```
deploy.ts → deployments/hedera_testnet.json → frontend config
             ↓
         UsdGoalCrowdfund (on-chain)
             ↓
         useCampaign hook (wagmi reads: all state vars + view fns)
             ↓
         CampaignCard (display) + ActionButtons (write calls)
```

## Oracle architecture constraint

- `AggregatorV3Interface` is a local interface file — **do not install `@chainlink/contracts`** unless it's already in the stack. The interface is 5 lines; copying it avoids dependency version conflicts on Hedera.
- The feed is called **once** at finalize, not at deployment time. `previewUsdValue()` is a UI convenience view — it does NOT affect `goalMet`.

## State machine (contract lifecycle)

```
OPEN (isOpen=true)
  → contribute() allowed
  → deadline passes
PENDING_FINALIZE (past deadline, !finalized)
  → finalize() allowed (anyone)
FINALIZED_MET (finalized=true, goalMet=true)
  → withdraw() allowed (organizer only, once)
FINALIZED_FAILED (finalized=true, goalMet=false)
  → refund() allowed (each contributor, once each)
```
There is no "cancelled" or "reset" state. No backward transitions.

## Frontend: single page, no routing

No multi-page app. One page shows all four actions with conditional visibility. No token association UI, no swap UI.

## Key architectural decision: no OpenZeppelin

PRD says "prefer strict CEI; do not pull in heavy frameworks unless already in the stack." Implement reentrancy protection manually via CEI pattern, not `ReentrancyGuard`.

## Scaffold-HBAR compatibility requirement

The repo must be scaffoldable via:
```
npm create scaffold-hbar@latest --template <org/repo>
```
This means `template.json` must exist at the repo root with exact required fields. The scaffold command is a hard acceptance criterion (#1 on checklist).
