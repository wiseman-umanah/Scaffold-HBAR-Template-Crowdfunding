"use client";

import { use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Address, isAddress } from "viem";
import { useCampaign } from "@/hooks/useCampaign";
import { useContributors } from "@/hooks/useContributors";
import { CampaignCard } from "@/components/CampaignCard";
import { ContributeForm } from "@/components/ContributeForm";
import { ActionButtons } from "@/components/ActionButtons";
import { ContributorList } from "@/components/ContributorList";

interface PageProps {
  params: Promise<{ address: string }>;
}

export default function CampaignPage({ params }: PageProps) {
  const { address } = use(params);
  const searchParams = useSearchParams();

  const isValid = isAddress(address);
  const contractAddress = isValid
    ? (address as Address)
    : ("0x0000000000000000000000000000000000000000" as Address);

  // Title + description are passed as query params from the gallery to avoid
  // a second getLogs call on this page (Hedera Hashio getLogs range limit).
  const title       = searchParams.get("title")       ?? "";
  const description = searchParams.get("description") ?? "";

  const campaign = useCampaign(contractAddress);
  const { contributors, isLoading: contribLoading, refetch: refetchContribs } =
    useContributors(contractAddress);

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

  return (
    <div className="container">
      <div className="header">
        <Link href="/" className="back-link">← All campaigns</Link>
        <ConnectButton />
      </div>

      {/* Title + description banner — shown when navigating from the gallery */}
      {title && (
        <div className="campaign-meta-banner">
          <h2 className="campaign-detail-title">{title}</h2>
          {description && (
            <p className="campaign-detail-desc">{description}</p>
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

      {/* When accessed directly via address (no query params), show a minimal share row */}
      {!title && (
        <div className="campaign-meta-banner">
          <div className="share-row" style={{ paddingTop: 0, borderTop: "none" }}>
            <span className="share-label">Campaign:</span>
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
