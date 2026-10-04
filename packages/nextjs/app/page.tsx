"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Address } from "viem";
import { useCampaign } from "@/hooks/useCampaign";
import { CampaignCard } from "@/components/CampaignCard";
import { ContributeForm } from "@/components/ContributeForm";
import { ActionButtons } from "@/components/ActionButtons";

// Resolve contract address from env var (set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local).
// The deploy script writes the address to packages/hardhat/deployments/hedera_testnet.json
// for reference, but the frontend reads it exclusively from the env var at build time.
function getContractAddress(): Address {
  const addr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (addr && addr.startsWith("0x") && addr.length === 42) {
    return addr as Address;
  }
  return "0x0000000000000000000000000000000000000000";
}

const CONTRACT_ADDRESS = getContractAddress();

export default function Home() {
  const campaign = useCampaign(CONTRACT_ADDRESS);

  const isDeployed =
    CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";

  return (
    <div className="container">
      <div className="header">
        <h1>USD-Goal Crowdfund</h1>
        <ConnectButton />
      </div>

      {!isDeployed ? (
        <div className="card">
          <p style={{ color: "#dc2626" }}>
            No contract address found. Deploy the contract first and set{" "}
            <code>NEXT_PUBLIC_CONTRACT_ADDRESS</code> in{" "}
            <code>packages/nextjs/.env.local</code>.
          </p>
        </div>
      ) : (
        <>
          <CampaignCard data={campaign} />
          <ContributeForm
            contractAddress={CONTRACT_ADDRESS}
            isOpen={campaign.isOpen}
            refetch={campaign.refetch}
          />
          <ActionButtons contractAddress={CONTRACT_ADDRESS} data={campaign} />
        </>
      )}

      <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#9ca3af", marginTop: "2rem" }}>
        Hedera Testnet · Chain ID 296 · Chainlink HBAR/USD oracle
      </p>
    </div>
  );
}
