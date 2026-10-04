import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy UsdGoalCrowdfund to Hedera Testnet.
 *
 * By default deploys ONE campaign — the main one with a 1-hour deadline.
 * Pass --short as an extra arg to deploy a second instance with a 5-minute
 * deadline for the refund-path demo:
 *
 *   pnpm hardhat run scripts/deploy.ts --network hedera_testnet
 *   pnpm hardhat run scripts/deploy.ts --network hedera_testnet -- --short
 *
 * Writes the deployed address to deployments/hedera_testnet.json.
 * Prints HashScan URL.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "HBAR\n"
  );

  const Factory = await ethers.getContractFactory("UsdGoalCrowdfund");

  // Fixed testnet feed address (Chainlink HBAR/USD, Hedera Testnet)
  const feed = "0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a";
  const goalUsd = 10n * 10n ** 8n; // $10.00 (8 dec)
  const maxAge = 3600n;             // 1-hour oracle freshness tolerance

  // ── Short-deadline mode (refund-path demo) ─────────────────────────────
  const shortMode = process.argv.includes("--short");
  const deadlineOffset = shortMode ? 300 : 3600; // 5 min vs 1 hour
  const label = shortMode ? "short-deadline (refund demo)" : "main";

  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineOffset);

  console.log(`Deploying ${label} campaign…`);
  const contract = await Factory.deploy(goalUsd, deadline, feed, maxAge, {
    gasLimit: 2_500_000,
  });
  await contract.waitForDeployment();
  const addr = await contract.getAddress();

  console.log(`Campaign deployed: ${addr}`);
  console.log(`HashScan: https://hashscan.io/testnet/contract/${addr}`);
  console.log(`\nSet in packages/nextjs/.env.local:`);
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${addr}`);

  // ── Write deployments file ────────────────────────────────────────────
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const outPath = path.join(deploymentsDir, "hedera_testnet.json");
  const data = {
    network: "hedera_testnet",
    chainId: 296,
    address: addr,
    deployedAt: new Date().toISOString(),
    shortDeadline: shortMode,
  };
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`\nDeployments written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
