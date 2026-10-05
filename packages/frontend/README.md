# packages/frontend

Next.js 14 App Router frontend for the USD-HBAR Crowdfunding template.

Connects to the `CrowdfundFactory` contract on Hedera Testnet via wagmi + viem. Reads all event history from the Hedera Mirror Node REST API, not `eth_getLogs`.

Wallet connection is handled by RainbowKit with support for MetaMask, HashPack, and WalletConnect.

---

## Setup

### 1. Copy the env file

#### macOS / Linux

```bash id="n8q7yt"
cp .env.example .env.local
```

#### Windows CMD

```cmd id="zjv1es"
copy .env.example .env.local
```

#### Windows PowerShell

```powershell id="2ayb3s"
Copy-Item .env.example .env.local
```

### 2. Fill in the three variables

```env id="x72flkq"
# Printed by: cd packages/hardhat && npm run deploy:factory
# Or: cd packages/hardhat && yarn deploy:factory

NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_FACTORY_DEPLOY_BLOCK=...

# Free at https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

`NEXT_PUBLIC_FACTORY_ADDRESS` and `NEXT_PUBLIC_FACTORY_DEPLOY_BLOCK` are printed automatically by the factory deployment script.

See the root [`README.md`](../../README.md) for the full deployment walkthrough.

### 3. Run

Using npm:

```bash id="8l7p2q"
npm run dev      # development — http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint
```

Using Yarn:

```bash id="4v3s8m"
yarn dev         # development — http://localhost:3000
yarn build       # production build
yarn start       # serve the production build
yarn lint        # ESLint
```

---

## Project Structure

```text id="9q0r5u"
src/

├── app/
│   ├── layout.tsx                ← root layout, mounts Providers
│   ├── globals.css               ← all styles (single CSS file, no CSS modules)
│   ├── providers.tsx             ← wagmi + RainbowKit singleton providers
│   ├── page.tsx                  ← "/" — campaign gallery + CreateCampaignForm
│   └── campaign/
│       └── [address]/
│           └── page.tsx           ← "/campaign/:address" — campaign detail page
│
├── components/
│   ├── ActionButtons.tsx         ← Finalize / Withdraw / Refund action buttons
│   ├── CampaignCard.tsx          ← campaign stats card (goal, raised, deadline, progress)
│   ├── CampaignPreviewCard.tsx   ← gallery preview tile with live on-chain data
│   ├── ContributeForm.tsx        ← HBAR/USD dual-input form with live price conversion
│   ├── ContributorList.tsx       ← ranked contributor leaderboard
│   └── CreateCampaignForm.tsx    ← title, description, USD goal, duration inputs
│
├── hooks/
│   ├── useCampaign.ts            ← all campaign contract reads; exports useHbarPrice
│   ├── useCampaignMeta.ts        ← fetches title/description from Mirror Node
│   ├── useFactory.ts             ← fetches all CampaignCreated events from Mirror Node
│   └── useContributors.ts        ← fetches Contributed events, builds leaderboard
│
└── config/
    ├── chains.ts                 ← Hedera Testnet viem chain definition (id: 296)
    └── abi.ts                    ← CROWDFUND_ABI + FACTORY_ABI
```

---

## Key Design Decisions

### Mirror Node instead of `eth_getLogs`

Hedera block "numbers" are packed nanosecond timestamps, so arithmetic subtraction between them is not meaningful. Hashio also rejects `eth_getLogs` requests spanning more than approximately 7 days.

Both `useFactory` and `useContributors` therefore use the Hedera Mirror Node REST API:

```text
GET https://testnet.mirrornode.hedera.com/api/v1/contracts/{addr}/results/logs?limit=100&order=asc
```

Responses are paginated through `links.next`.

Topic0 filtering without a timestamp range is not supported by the Mirror Node, so topic filtering is performed client-side.

---

### HashPack tinybar scaling

HashPack divides `msg.value` by `1e10` before writing it on-chain.

All stored HBAR amounts such as `totalRaised` and `contributions` are therefore represented in tinybars (8-decimal units).

Every on-chain HBAR read is multiplied by:

```text
10_000_000_000
```

before being displayed as an HBAR amount.

For contributions, `ContributeForm` uses:

```text
parseEther(hbarInput)
```

unchanged. HashPack handles the conversion on the way to the chain.

---

### Singleton providers

`providers.tsx` declares `wagmiConfig` and `queryClient` at **module level**, rather than inside the component.

This ensures wallet connection state survives client-side navigation without reinitializing the providers.

---

### Campaign metadata from Mirror Node

Title and description are stored only in `CampaignCreated` event logs, not in contract storage.

`useCampaignMeta` fetches the factory's logs from the Mirror Node and decodes the ABI-encoded `data` field.

Campaign URLs are self-contained:

```text
/campaign/0x...
```

No query parameters are required.

---

### Chainlink HBAR/USD price

`useCampaign` reads `latestRoundData()` from the Chainlink HBAR/USD feed:

```text
0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a
```

The price is used for:

* HBAR/USD display
* USD ↔ HBAR conversion
* Campaign progress estimates

It does **not** determine `goalMet`.

The final campaign outcome is determined solely by the oracle read performed by `finalize()` on-chain.

---

## Environment Variables

| Variable                               | Required | Description                                                                                 |
| -------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_FACTORY_ADDRESS`          | Yes      | EVM address of the deployed `CrowdfundFactory`                                              |
| `NEXT_PUBLIC_FACTORY_DEPLOY_BLOCK`     | No       | Factory deployment block; informational only because the Mirror Node is used for event logs |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Yes      | WalletConnect Cloud project ID                                                              |

---

## Wallet Support

| Wallet                              | Notes                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| MetaMask                            | Add Hedera Testnet manually using RPC `https://testnet.hashio.io/api`, Chain ID `296`, and symbol `HBAR` |
| HashPack                            | Select **Hedera Testnet** in the network switcher; see the tinybar scaling note above                    |
| Any WalletConnect-compatible wallet | Select the WalletConnect option in the connect modal                                                     |

---

## Network Configuration

| Field                   | Value                                        |
| ----------------------- | -------------------------------------------- |
| Chain ID                | `296`                                        |
| RPC                     | `https://testnet.hashio.io/api`              |
| Explorer                | `https://hashscan.io/testnet`                |
| Native currency         | `HBAR` (18 decimals via Hashio)              |
| Chainlink HBAR/USD feed | `0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a` |

---

## Troubleshooting

### Frontend environment variables not detected

Make sure the file is named exactly:

```text
.env.local
```

and is located inside:

```text
packages/frontend/
```

The file should contain:

```env id="1d8n2a"
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_FACTORY_DEPLOY_BLOCK=...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

After changing environment variables, restart the development server.

Using npm:

```bash id="p4q2cs"
npm run dev
```

Using Yarn:

```bash id="2a6w9d"
yarn dev
```

### Wallet cannot connect

Make sure your wallet is connected to **Hedera Testnet**:

```text
Chain ID: 296
RPC: https://testnet.hashio.io/api
Currency: HBAR
```

If using WalletConnect, make sure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set correctly.

### Campaigns are not appearing

Make sure:

1. `NEXT_PUBLIC_FACTORY_ADDRESS` points to the deployed factory.
2. The factory was deployed successfully to Hedera Testnet.
3. The frontend is using the same Hedera Testnet configuration.
4. The Mirror Node is reachable.
5. At least one campaign has been created through the factory.

The frontend reads campaign history from the Hedera Mirror Node rather than relying on `eth_getLogs`.
