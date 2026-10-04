# packages/frontend

Vite + React + TypeScript frontend for the USD-HBAR Crowdfunding template.

**Stack:** Vite · React 18 · TypeScript · React Router v6 · wagmi · viem · RainbowKit · @tanstack/react-query

---

## Setup

```bash
# From repo root
pnpm install

# Copy and fill in env vars
cp packages/frontend/.env.example packages/frontend/.env.local
```

### Required env vars (`packages/frontend/.env.local`)

| Variable | Where to get it |
|---|---|
| `VITE_FACTORY_ADDRESS` | Printed by `pnpm run deploy:factory` in `packages/hardhat/` |
| `VITE_FACTORY_DEPLOY_BLOCK` | Printed by `pnpm run deploy:factory` in `packages/hardhat/` |
| `VITE_WALLETCONNECT_PROJECT_ID` | Free at [cloud.walletconnect.com](https://cloud.walletconnect.com) |

---

## Commands

```bash
# Development server (http://localhost:5173)
pnpm dev

# Type-check + build
pnpm build

# Preview production build
pnpm preview
```

---

## Pages

| Route | File | Description |
|---|---|---|
| `/` | `src/pages/Home.tsx` | Gallery of all campaigns + Create Campaign form |
| `/campaign/:address` | `src/pages/CampaignPage.tsx` | Campaign detail — shareable URL, no query params needed |

---

## Hooks

| Hook | File | What it does |
|---|---|---|
| `useCampaign(addr)` | `hooks/useCampaign.ts` | All contract state reads + tinybar scaling + `hbarPrice` |
| `useHbarPrice()` | `hooks/useCampaign.ts` (named export) | Live Chainlink HBAR/USD price only — use on pages without a campaign address |
| `useCampaignMeta(addr)` | `hooks/useCampaignMeta.ts` | Fetches `title` + `description` from Mirror Node by campaign address |
| `useFactory()` | `hooks/useFactory.ts` | All `CampaignCreated` events from Mirror Node → campaign list |
| `useContributors(addr)` | `hooks/useContributors.ts` | `Contributed` events from Mirror Node, aggregated + ranked, 15s poll |

---

## Non-obvious Hedera quirks handled here

### HashPack tinybar scaling

HashPack divides `msg.value` by `1e10` before sending the transaction on-chain. On-chain values for `totalRaised` and `contributions` are tinybars (8-decimal), not wei.

**Fix applied in `useCampaign.ts` and `useContributors.ts`:** all on-chain HBAR reads are multiplied by `10_000_000_000n` before display.

`ContributeForm.tsx` uses `parseEther(hbarInput)` for sending — this is intentionally left unchanged; HashPack handles the conversion.

### Mirror Node replaces eth_getLogs

Hedera Hashio `eth_getLogs` breaks for any range beyond ~7 days of blocks. Hedera block "numbers" are packed nanosecond timestamps — not sequential integers, so subtraction is meaningless.

All event log reads (`CampaignCreated` in `useFactory`, `Contributed` in `useContributors`, and `CampaignCreated` filtered by address in `useCampaignMeta`) use the [Hedera Mirror Node REST API](https://testnet.mirrornode.hedera.com):

```
GET https://testnet.mirrornode.hedera.com/api/v1/contracts/{addr}/results/logs?limit=100&order=asc
```

- Paginate with `links.next` from the response body.
- topic0 filter is not supported server-side without a timestamp range — filter client-side by checking `l.topics[0] === TOPIC_HASH`.

### useQueryClient import

```ts
// Must come from @tanstack/react-query, NOT from wagmi
import { useQueryClient } from "@tanstack/react-query";
```

---

## Chain config

```ts
// src/config/chains.ts
import { defineChain } from "viem";
export const hederaTestnet = defineChain({
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet.hashio.io/api"] } },
  blockExplorers: { default: { name: "HashScan", url: "https://hashscan.io/testnet" } },
  testnet: true,
});
```

`decimals: 18` is what makes `msg.value` wei-compatible on Hedera.

---

## ABI

Contract ABIs live in `src/config/abi.ts` as typed constants:
- `CROWDFUND_ABI` — `UsdGoalCrowdfund` (contribute, finalize, withdraw, refund, view helpers, all state vars)
- `FACTORY_ABI` — `CrowdfundFactory` (createCampaign, feed, maxAge)
