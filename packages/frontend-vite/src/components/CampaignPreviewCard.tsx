import { Link } from "react-router-dom";
import { useReadContracts } from "wagmi";
import { Address, formatEther } from "viem";
import { CROWDFUND_ABI } from "@/config/abi";
import { CampaignMeta } from "@/hooks/useFactory";

interface Props {
  meta: CampaignMeta;
  hbarPrice: bigint;
}

function fmt8dec(v: bigint) {
  return `$${(Number(v) / 1e8).toFixed(2)}`;
}

function statusLabel(finalized: boolean, goalMet: boolean, isOpen: boolean) {
  if (!finalized && isOpen)  return { text: "Open",              cls: "badge-blue"  };
  if (!finalized && !isOpen) return { text: "Awaiting finalize", cls: "badge-gray"  };
  if (finalized && goalMet)  return { text: "Goal met ✓",        cls: "badge-green" };
  return                            { text: "Goal not met ✗",    cls: "badge-red"   };
}

export function CampaignPreviewCard({ meta, hbarPrice }: Props) {
  const { data } = useReadContracts({
    contracts: [
      { address: meta.address, abi: CROWDFUND_ABI, functionName: "totalRaised" },
      { address: meta.address, abi: CROWDFUND_ABI, functionName: "finalized"   },
      { address: meta.address, abi: CROWDFUND_ABI, functionName: "goalMet"     },
      { address: meta.address, abi: CROWDFUND_ABI, functionName: "isOpen"      },
    ],
    query: { refetchInterval: 15_000 },
  });

  // Scale by 1e10: HashPack stores tinybars on-chain, restore to wei for display
  const totalRaised = ((data?.[0]?.result as bigint)  ?? 0n) * 10_000_000_000n;
  const finalized   = (data?.[1]?.result as boolean) ?? false;
  const goalMet     = (data?.[2]?.result as boolean) ?? false;
  const isOpen      = (data?.[3]?.result as boolean) ?? false;

  const effectiveUsd =
    totalRaised > 0n && hbarPrice > 0n
      ? (totalRaised * hbarPrice) / BigInt(1e18)
      : 0n;
  const progressPct =
    meta.goalUsd > 0n
      ? Math.min(100, Math.round((Number(effectiveUsd) / Number(meta.goalUsd)) * 100))
      : 0;

  const { text, cls } = statusLabel(finalized, goalMet, isOpen);
  const deadlineDate  = new Date(Number(meta.deadline) * 1000).toLocaleDateString();
  const hbarRaised    = parseFloat(formatEther(totalRaised)).toFixed(2);
  const usdRaised     = hbarPrice > 0n ? `≈ ${fmt8dec(effectiveUsd)}` : "";

  return (
    <Link
      to={`/campaign/${meta.address}`}
      className="preview-card-link"
    >
      <div className="preview-card">
        <div className="preview-card-header">
          <h3 className="preview-card-title">{meta.title}</h3>
          <span className={`badge ${cls}`}>{text}</span>
        </div>

        {meta.description && (
          <p className="preview-card-desc">{meta.description}</p>
        )}

        <div className="preview-card-stats">
          <span>Goal: <strong>{fmt8dec(meta.goalUsd)}</strong></span>
          <span>Raised: <strong>{hbarRaised} HBAR {usdRaised}</strong></span>
          <span>Deadline: {deadlineDate}</span>
        </div>

        <div className="progress-bar-bg" style={{ marginTop: "0.75rem" }}>
          <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#6b7280", marginTop: "0.2rem" }}>
          {progressPct}%
        </div>

        <div className="preview-card-footer">
          <span className="preview-card-organizer">
            by {meta.organizer.slice(0, 6)}…{meta.organizer.slice(-4)}
          </span>
          <span className="preview-card-cta">View →</span>
        </div>
      </div>
    </Link>
  );
}
