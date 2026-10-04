"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Address, isAddress } from "viem";
import { useCampaign } from "@/hooks/useCampaign";
import { useContributors } from "@/hooks/useContributors";
import { useCampaignMeta } from "@/hooks/useCampaignMeta";
import { CampaignCard } from "@/components/CampaignCard";
import { ContributeForm } from "@/components/ContributeForm";
import { ActionButtons } from "@/components/ActionButtons";
import { ContributorList } from "@/components/ContributorList";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as Address;

export default function CampaignPage() {
  const params = useParams();
  const pathname = usePathname();
  const address = params?.address as string | undefined;

  const isValid = !!address && isAddress(address);
  const contractAddress = isValid ? (address as Address) : ZERO_ADDR;

  // Title and description are fetched from the mirror node using the campaign address.
  // This works for any URL — direct links, shared links, no query params needed.
  const { title, description, isLoading: metaLoading } = useCampaignMeta(contractAddress);

  const campaign = useCampaign(contractAddress);
  const { contributors, isLoading: contribLoading, refetch: refetchContribs } =
    useContributors(contractAddress);

  function handleTxSuccess() {
    campaign.refetch();
    refetchContribs();
  }

  // Shareable clean URL — just the address, no fragile query params
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${origin}${pathname}`;

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

      <div className="campaign-meta-banner">
        {metaLoading ? (
          <p className="loading-msg">Loading campaign info…</p>
        ) : (
          <>
            {title && <h2 className="campaign-detail-title">{title}</h2>}
            {description && <p className="campaign-detail-desc">{description}</p>}
          </>
        )}
        <div className="share-row">
          <span className="share-label">Share:</span>
          <code className="share-url">{shareUrl}</code>
          <button
            className="btn-copy"
            onClick={() => navigator.clipboard.writeText(shareUrl)}
          >
            Copy link
          </button>
        </div>
      </div>

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
