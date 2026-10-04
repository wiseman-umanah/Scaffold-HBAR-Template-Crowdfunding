import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy CrowdfundFactory to Hedera Testnet.
 * Run once — the factory address is written to deployments/hedera_testnet.json
 * and consumed by the frontend. Users then call factory.createCampaign() from the UI.
 *
 *   pnpm hardhat run scripts/deployFactory.ts --network hedera_testnet
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "HBAR\n"
  );

  const FEED    = "0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a";
  const MAX_AGE = 3600n;

  console.log("Deploying CrowdfundFactory…");
  const Factory = await ethers.getContractFactory("CrowdfundFactory");
  const factory = await Factory.deploy(FEED, MAX_AGE, { gasLimit: 3_000_000 });
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();

  // Get the deploy block number so the frontend can use it as fromBlock for getLogs
  const deployBlock = await ethers.provider.getBlockNumber();

  console.log("CrowdfundFactory deployed:", factoryAddr);
  console.log("HashScan:", `https://hashscan.io/testnet/contract/${factoryAddr}`);
  console.log(`\nAdd to packages/frontend/.env.local:`);
  console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${factoryAddr}`);
  console.log(`NEXT_PUBLIC_FACTORY_DEPLOY_BLOCK=${deployBlock}`);

  // ── Write deployments file ────────────────────────────────────────────
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const outPath = path.join(deploymentsDir, "hedera_testnet.json");
  const data = {
    network: "hedera_testnet",
    chainId: 296,
    factory: factoryAddr,
    deployBlock,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`\nDeployments written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
