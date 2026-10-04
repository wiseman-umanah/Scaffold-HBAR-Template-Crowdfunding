import { formatEther } from "viem";
import { CampaignData } from "@/hooks/useCampaign";

function fmt8dec(value: bigint): string {
  const usd = Number(value) / 1e8;
  return `$${usd.toFixed(2)}`;
}

function fmtHbarWithUsd(wei: bigint, price8dec: bigint): string {
  const hbar = parseFloat(formatEther(wei));
  const hbarStr = hbar.toFixed(4);
  if (price8dec === 0n || wei === 0n) return `${hbarStr} HBAR`;
  const usd = (hbar * Number(price8dec)) / 1e8;
  return `${hbarStr} HBAR (≈ $${usd.toFixed(2)})`;
}

function formatTimeLeft(seconds: bigint): string | null {
  if (seconds === 0n) return null;
  const s = Number(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

export function CampaignCard({ data }: { data: CampaignData }) {
  const {
    organizer,
    goalUsd,
    deadline,
    totalRaised,
    finalized,
    goalMet,
    withdrawn,
    myContribution,
    timeLeft,
    isOpen,
    previewUsd,
    hbarPrice,
    isLoading,
  } = data;

  if (isLoading) {
    return (
      <div className="card">
        <p className="loading-msg">Loading campaign data…</p>
      </div>
    );
  }

  // Progress: use previewUsd when available, otherwise estimate from HBAR * hbarPrice
  const effectiveUsd =
    previewUsd > 0n
      ? previewUsd
      : totalRaised > 0n && hbarPrice > 0n
      ? (totalRaised * hbarPrice) / BigInt(1e18)
      : 0n;
  const progressPct =
    goalUsd > 0n
      ? Math.min(100, Math.round((Number(effectiveUsd) / Number(goalUsd)) * 100))
      : 0;

  const deadlineDate = new Date(Number(deadline) * 1000).toLocaleString();

  const statusBadge = () => {
    if (!finalized) {
      if (isOpen) return <span className="badge badge-blue">Open</span>;
      return <span className="badge badge-gray">Awaiting finalize</span>;
    }
    if (goalMet) return <span className="badge badge-green">Goal met ✓</span>;
    return <span className="badge badge-red">Goal not met ✗</span>;
  };

  const timeDisplay = () => {
    if (finalized) return "Finalized";
    if (!isOpen) return "Awaiting finalize";
    const tl = formatTimeLeft(timeLeft);
    return tl ?? "—";
  };

  return (
    <div className="card">
      <h2>
        Campaign
        {statusBadge()}
        {withdrawn && <span className="badge badge-gray">Withdrawn</span>}
      </h2>

      <div className="stat-row">
        <span>Goal (USD)</span>
        <span>{fmt8dec(goalUsd)}</span>
      </div>
      <div className="stat-row">
        <span>Total raised</span>
        <span>{fmtHbarWithUsd(totalRaised, hbarPrice)}</span>
      </div>
      {myContribution > 0n && (
        <div className="stat-row">
          <span>Your contribution</span>
          <span>{fmtHbarWithUsd(myContribution, hbarPrice)}</span>
        </div>
      )}
      <div className="stat-row">
        <span>Deadline</span>
        <span>{deadlineDate}</span>
      </div>
      <div className="stat-row">
        <span>Time left</span>
        <span>{timeDisplay()}</span>
      </div>
      <div className="stat-row">
        <span>Organizer</span>
        <span style={{ fontSize: "0.8rem" }}>{organizer}</span>
      </div>

      <div className="progress-bar-bg">
        <div
          className="progress-bar-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div style={{ textAlign: "right", fontSize: "0.8rem", color: "#6b7280" }}>
        {progressPct}% of goal
      </div>
    </div>
  );
}
