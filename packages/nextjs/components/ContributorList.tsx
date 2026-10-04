"use client";

import { formatEther } from "viem";
import { Contributor } from "@/hooks/useContributors";

interface Props {
  contributors: Contributor[];
  isLoading: boolean;
  hbarPrice: bigint;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function fmtHbarWithUsd(wei: bigint, price8dec: bigint): string {
  const hbar = parseFloat(formatEther(wei));
  if (price8dec === 0n) return `${hbar.toFixed(4)} HBAR`;
  const usd = (hbar * Number(price8dec)) / 1e8;
  return `${hbar.toFixed(4)} HBAR (≈ $${usd.toFixed(2)})`;
}

export function ContributorList({ contributors, isLoading, hbarPrice }: Props) {
  if (isLoading) {
    return (
      <div className="card">
        <h2>Contributors</h2>
        <p className="loading-msg">Loading contributor list…</p>
      </div>
    );
  }

  if (contributors.length === 0) {
    return (
      <div className="card">
        <h2>Contributors</h2>
        <p className="empty-msg">No contributions yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>
        Contributors
        <span className="contributor-count">{contributors.length}</span>
      </h2>
      <div className="contributor-list">
        {contributors.map((c, i) => (
          <div key={c.address} className="contributor-row">
            <div className="contributor-rank">#{i + 1}</div>
            <div className="contributor-info">
              <a
                href={`https://hashscan.io/testnet/account/${c.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="contributor-addr"
                title={c.address}
              >
                {shortAddr(c.address)}
              </a>
            </div>
            <div className="contributor-amount">
              {fmtHbarWithUsd(c.totalContributed, hbarPrice)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
