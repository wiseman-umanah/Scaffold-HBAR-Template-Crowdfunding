"use client";

import { use } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Address, isAddress } from "viem";
import { useCampaign } from "@/hooks/useCampaign";
import { useContributors } from "@/hooks/useContributors";
import { useFactory } from "@/hooks/useFactory";
import { CampaignCard } from "@/components/CampaignCard";
import { ContributeForm } from "@/components/ContributeForm";
import { ActionButtons } from "@/components/ActionButtons";
import { ContributorList } from "@/components/ContributorList";

interface PageProps {
  params: Promise<{ address: string }>;
}

export default function CampaignPage({ params }: PageProps) {
  const { address } = use(params);

  const isValid = isAddress(address);
  const contractAddress = isValid ? (address as Address) : ("0x0000000000000000000000000000000000000000" as Address);

  const campaign      = useCampaign(contractAddress);
  const { contributors, isLoading: contribLoading, refetch: refetchContribs } = useContributors(contractAddress);
  const { campaigns }  = useFactory();

  // Look up title + description from factory events
  const meta = campaigns.find(
    (c) => c.address.toLowerCase() === contractAddress.toLowerCase()
  );

  function handleTxSuccess() {
    campaign.refetch();
    refetchContribs();
  }

  if (!isValid) {
    return (
      <div className="container">
        <div className="header">
          <Link href="/" className="back-link">← All campaigns</Link>
          <ConnectButton />
        </div>
        <div className="card">
          <p style={{ color: "#dc2626" }}>Invalid campaign address.</p>
        </div>
      </div>
    );
  }

  // Share URL is just the current page URL
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="container">
      <div className="header">
        <Link href="/" className="back-link">← All campaigns</Link>
        <ConnectButton />
      </div>

      {/* Campaign title + description from factory metadata */}
      {meta && (
        <div className="campaign-meta-banner">
          <h2 className="campaign-detail-title">{meta.title}</h2>
          {meta.description && (
            <p className="campaign-detail-desc">{meta.description}</p>
          )}
          <div className="share-row">
            <span className="share-label">Share:</span>
            <code className="share-url">{contractAddress}</code>
            <button
              className="btn-copy"
              onClick={() => navigator.clipboard.writeText(window.location.href)}
            >
              Copy link
            </button>
          </div>
        </div>
      )}

      <CampaignCard data={campaign} />
      <ContributeForm
        contractAddress={contractAddress}
        isOpen={campaign.isOpen}
        hbarPrice={campaign.hbarPrice}
        refetch={handleTxSuccess}
      />
      <ActionButtons contractAddress={contractAddress} data={campaign} />
      <ContributorList
        contributors={contributors}
        isLoading={contribLoading}
        hbarPrice={campaign.hbarPrice}
      />

      <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#9ca3af", marginTop: "2rem" }}>
        Hedera Testnet · Chain ID 296 · Chainlink HBAR/USD oracle
      </p>
    </div>
  );
}
