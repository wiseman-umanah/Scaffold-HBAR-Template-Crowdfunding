import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Address } from "viem";
import { useFactory } from "@/hooks/useFactory";
import { useHbarPrice } from "@/hooks/useCampaign";
import { CampaignPreviewCard } from "@/components/CampaignPreviewCard";
import { CreateCampaignForm } from "@/components/CreateCampaignForm";

export default function Home() {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const { campaigns, isLoading, factoryAddress, refetch } = useFactory();
  const hbarPrice = useHbarPrice();
  const [showCreate, setShowCreate] = useState(false);

  const factoryDeployed = factoryAddress !== "0x0000000000000000000000000000000000000000";

  function handleCreated(addr: Address, title: string, description: string) {
    refetch();
    setShowCreate(false);
    const params = new URLSearchParams({ title });
    if (description) params.set("description", description);
    navigate(`/campaign/${addr}?${params.toString()}`);
  }

  return (
    <div className="container">
      <div className="header">
        <h1>HBAR Crowdfund</h1>
        <ConnectButton />
      </div>

      {!factoryDeployed ? (
        <div className="card">
          <p style={{ color: "#dc2626" }}>
            Factory not deployed. Set{" "}
            <code>VITE_FACTORY_ADDRESS</code> in{" "}
            <code>packages/frontend/.env.local</code>.
          </p>
        </div>
      ) : (
        <>
          {isConnected ? (
            showCreate ? (
              <>
                <CreateCampaignForm
                  factoryAddress={factoryAddress}
                  onCreated={handleCreated}
                />
                <button
                  className="btn-secondary"
                  style={{ width: "100%", marginBottom: "1rem" }}
                  onClick={() => setShowCreate(false)}
                >
                  ✕ Cancel
                </button>
              </>
            ) : (
              <button
                className="btn-primary contribute-btn"
                style={{ marginBottom: "1.5rem" }}
                onClick={() => setShowCreate(true)}
              >
                + Create Campaign
              </button>
            )
          ) : (
            <div className="card" style={{ textAlign: "center", padding: "1rem" }}>
              <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                Connect your wallet to create a campaign.
              </p>
            </div>
          )}

          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem", color: "#374151" }}>
            {isLoading ? "Loading campaigns…" : `${campaigns.length} Campaign${campaigns.length !== 1 ? "s" : ""}`}
          </h2>

          {!isLoading && campaigns.length === 0 && (
            <div className="card" style={{ textAlign: "center" }}>
              <p className="empty-msg">No campaigns yet. Create the first one!</p>
            </div>
          )}

          <div className="campaign-grid">
            {campaigns.map((meta) => (
              <CampaignPreviewCard key={meta.address} meta={meta} hbarPrice={hbarPrice} />
            ))}
          </div>
        </>
      )}

      <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#9ca3af", marginTop: "2rem" }}>
        Hedera Testnet · Chain ID 296 · Chainlink HBAR/USD oracle
      </p>
    </div>
  );
}
