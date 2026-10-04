import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy UsdGoalCrowdfund to Hedera Testnet.
 *
 * Deploys two instances:
 *   1. Main campaign — $10 goal, 1-hour deadline (goal-met / withdraw path)
 *   2. Short-deadline campaign — $10 goal, 5-minute deadline (refund-path demo)
 *
 * Writes deployed addresses to deployments/hedera_testnet.json for frontend consumption.
 * Prints HashScan URLs.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "HBAR\n");

  const Factory = await ethers.getContractFactory("UsdGoalCrowdfund");

  // Fixed testnet feed address (Chainlink HBAR/USD, Hedera Testnet)
  const feed = "0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a";

  // ── Deploy 1: main campaign ($10, 1-hour deadline) ──────────────────────
  const goalUsd   = 10n * 10n ** 8n;                                // $10.00 (8 dec)
  const deadline  = BigInt(Math.floor(Date.now() / 1000) + 3600);  // now + 1 hour
  const maxAge    = 3600n;                                          // 1-hour oracle tolerance

  console.log("Deploying main campaign…");
  const c1 = await Factory.deploy(goalUsd, deadline, feed, maxAge, {
    gasLimit: 2_500_000,
  });
  await c1.waitForDeployment();
  const addr1 = await c1.getAddress();
  console.log("Main campaign deployed:", addr1);
  console.log("HashScan:", `https://hashscan.io/testnet/contract/${addr1}`);

  // ── Deploy 2: short-deadline campaign ($10, 5-minute deadline) ──────────
  const shortDeadline = BigInt(Math.floor(Date.now() / 1000) + 300); // now + 5 min
  console.log("\nDeploying short-deadline campaign (refund-path demo)…");
  const c2 = await Factory.deploy(goalUsd, shortDeadline, feed, maxAge, {
    gasLimit: 2_500_000,
  });
  await c2.waitForDeployment();
  const addr2 = await c2.getAddress();
  console.log("Short-deadline campaign deployed:", addr2);
  console.log("HashScan:", `https://hashscan.io/testnet/contract/${addr2}`);

  // ── Write deployments file ───────────────────────────────────────────────
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const outPath = path.join(deploymentsDir, "hedera_testnet.json");
  const data = {
    network: "hedera_testnet",
    chainId: 296,
    contracts: {
      UsdGoalCrowdfund: addr1,
      UsdGoalCrowdfundShortDeadline: addr2,
    },
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`\nDeployments written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
