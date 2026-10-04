# packages/frontend

Next.js 14 App Router frontend for the USD-HBAR Crowdfunding template.

Connects to the `CrowdfundFactory` contract on Hedera Testnet via wagmi + viem. Reads all event history from the Hedera Mirror Node REST API (not `eth_getLogs`). Wallet connection handled by RainbowKit (MetaMask, HashPack, WalletConnect).

---

## Setup

### 1. Copy the env file

```bash
cp .env.example .env.local
```

### 2. Fill in the three variables

```env
# Printed by: cd packages/hardhat && pnpm run deploy:factory
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_FACTORY_DEPLOY_BLOCK=...

# Free at https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

`NEXT_PUBLIC_FACTORY_ADDRESS` and `NEXT_PUBLIC_FACTORY_DEPLOY_BLOCK` are printed by the deploy script automatically. See the root [`README.md`](../../README.md) for the full deploy walkthrough.

### 3. Run

```bash
pnpm dev      # development — http://localhost:3000
pnpm build    # production build
pnpm start    # serve the production build
pnpm lint     # ESLint
```

---

## Project structure

```
src/
├── app/
│   ├── layout.tsx                 ← root layout, mounts Providers
│   ├── globals.css                ← all styles (single CSS file, no CSS modules)
│   ├── providers.tsx              ← wagmi + RainbowKit singleton providers
│   ├── page.tsx                   ← "/" — campaign gallery + CreateCampaignForm
│   └── campaign/
│       └── [address]/
│           └── page.tsx           ← "/campaign/:address" — campaign detail page
├── components/
│   ├── ActionButtons.tsx          ← Finalize / Withdraw / Refund action buttons
│   ├── CampaignCard.tsx           ← campaign stats card (goal, raised, deadline, progress)
│   ├── CampaignPreviewCard.tsx    ← gallery preview tile with live on-chain data
│   ├── ContributeForm.tsx         ← HBAR/USD dual-input form with live price conversion
│   ├── ContributorList.tsx        ← ranked contributor leaderboard
│   └── CreateCampaignForm.tsx     ← title, description, USD goal, duration inputs
├── hooks/
│   ├── useCampaign.ts             ← all campaign contract reads; exports useHbarPrice
│   ├── useCampaignMeta.ts         ← fetches title/description from Mirror Node
│   ├── useFactory.ts              ← fetches all CampaignCreated events from Mirror Node
│   └── useContributors.ts         ← fetches Contributed events, builds leaderboard
└── config/
    ├── chains.ts                  ← Hedera Testnet viem chain definition (id: 296)
    └── abi.ts                     ← CROWDFUND_ABI + FACTORY_ABI
```

---

## Key design decisions

### Mirror Node instead of eth_getLogs

Hedera block "numbers" are packed nanosecond timestamps — arithmetic subtraction is meaningless, and Hashio rejects any `eth_getLogs` range wider than ~7 days. Both `useFactory` and `useContributors` use the Hedera Mirror Node REST API instead:

```
GET https://testnet.mirrornode.hedera.com/api/v1/contracts/{addr}/results/logs?limit=100&order=asc
```

Responses are paginated via `links.next`. topic0 filtering without a timestamp range is not supported by the mirror node, so topic filtering is done client-side.

### HashPack tinybar scaling

HashPack divides `msg.value` by `1e10` before writing it on-chain. All stored HBAR amounts (`totalRaised`, `contributions`) are in tinybars (8-decimal). Every on-chain HBAR read is multiplied by `10_000_000_000n` before display. Sending (ContributeForm) uses `parseEther(hbarInput)` unchanged — HashPack handles the conversion on the way in.

### Singleton providers

`providers.tsx` declares `wagmiConfig` and `queryClient` at **module level**, not inside the component. This ensures wallet connection state survives all client-side navigations without reinitialising.

### Campaign metadata from Mirror Node

Title and description are stored only in `CampaignCreated` event logs — not in contract storage. `useCampaignMeta` fetches the factory's logs from the mirror node and decodes the ABI-encoded `data` field. Campaign URLs are self-contained (`/campaign/0x…`) — no query params needed.

### Chainlink HBAR/USD price

`useCampaign` reads `latestRoundData()` from the Chainlink feed (`0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a`) on every poll. The price is used for display and USD ↔ HBAR conversion only. It does **not** affect `goalMet` — that is determined solely by `finalize()` on-chain.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_FACTORY_ADDRESS` | Yes | EVM address of the deployed `CrowdfundFactory` |
| `NEXT_PUBLIC_FACTORY_DEPLOY_BLOCK` | No | Deploy block (informational only — mirror node used for logs) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect Cloud project ID |

---

## Wallet support

| Wallet | Notes |
|---|---|
| MetaMask | Add Hedera Testnet manually: RPC `https://testnet.hashio.io/api`, Chain ID `296`, symbol `HBAR` |
| HashPack | Select "Hedera Testnet" in network switcher; note the 1e10 tinybar scaling above |
| Any WalletConnect-compatible wallet | Use WalletConnect option in the connect modal |

---

## Network config

| Field | Value |
|---|---|
| Chain ID | `296` |
| RPC | `https://testnet.hashio.io/api` |
| Explorer | `https://hashscan.io/testnet` |
| Native currency | `HBAR` (18 decimals via Hashio) |
| Chainlink HBAR/USD feed | `0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a` |
