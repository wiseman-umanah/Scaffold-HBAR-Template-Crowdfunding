# Project Coding Rules (Non-Obvious Only)

## Contract — exact interface, do not deviate

Implement exactly these public members in `UsdGoalCrowdfund.sol` — no extra public mutators:
- `contribute()`, `finalize()`, `withdraw()`, `refund()` — mutators
- `timeLeft()`, `isOpen()`, `previewUsdValue(uint256)` — view helpers
- `AggregatorV3Interface` lives in `contracts/interfaces/AggregatorV3Interface.sol`

## Hardhat network config gotchas

```ts
// hardhat.config.ts — hedera_testnet network block
networks: {
  hedera_testnet: {
    url: process.env.HASHIO_RPC_URL ?? "https://testnet.hashio.io/api",
    chainId: 296,
    accounts: [process.env.HARDHAT_PRIVATE_KEY!],
  },
}
```
`chainId: 296` is required — wagmi/viem frontend must also use 296.

## Deploy script must do all of these

1. Pass `{ gasLimit: 2_500_000 }` (minimum) in deploy options — Hedera silently rejects low gas.
2. Call `await c.waitForDeployment()` before reading address.
3. Write the deployed address to a file (e.g. `deployments/hedera_testnet.json`) so the frontend can import it without manual copy-paste.
4. Print `https://hashscan.io/testnet/contract/<addr>` — this link is required for the README acceptance criterion.

## Frontend chain config

```ts
// config/chains.ts
import { defineChain } from "viem";
export const hederaTestnet = defineChain({
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet.hashio.io/api"] } },
  blockExplorers: { default: { name: "HashScan", url: "https://hashscan.io/testnet" } },
});
```
HBAR `decimals: 18` in the viem chain definition — this is what makes `msg.value` wei-compatible.

## useCampaign hook must read

`organizer`, `goalUsd`, `deadline`, `totalRaised`, `finalized`, `goalMet`, `withdrawn`, `contributions[account]`, `timeLeft()`, `isOpen()`, `previewUsdValue(totalRaised)` — all needed for correct button enablement.

## Button enable/disable rules (map exactly from PRD)

| Button | Condition |
|---|---|
| Contribute | `isOpen()` is true (wraps `!finalized && block.timestamp < deadline`) |
| Finalize | past deadline AND `!finalized` — callable by anyone |
| Withdraw | `finalized && goalMet && !withdrawn && account == organizer` |
| Refund | `finalized && !goalMet && contributions[account] > 0` |

## Testing — mock feed pattern

Tests use a mock `AggregatorV3Interface` deployed inline. Use `network.provider.send("evm_increaseTime", [seconds])` + `evm_mine` to warp past deadline. Must cover:
- `usdRaised == goalUsd` boundary → `goalMet = true`
- second `refund()` call reverts (contribution zeroed)
- `contribute()` after deadline reverts
- `finalize()` before deadline reverts
- double `finalize()` reverts
- stale oracle (updatedAt too old) reverts in `finalize()`

## Solidity pragma

`^0.8.20` — do not use 0.8.19 or lower; no OpenZeppelin unless already in the stack (PRD says prefer CEI without heavy frameworks).
