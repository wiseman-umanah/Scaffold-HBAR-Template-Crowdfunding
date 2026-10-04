"use client";

import { useState, useEffect } from "react";
import { parseEther, Address } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CROWDFUND_ABI } from "@/config/abi";

interface Props {
  contractAddress: Address;
  isOpen: boolean;
  /** Live Chainlink HBAR/USD price — 8 decimals. 0n if unavailable. */
  hbarPrice: bigint;
  refetch: () => void;
}

function hbarToUsd(hbarStr: string, price8dec: bigint): string {
  const hbar = parseFloat(hbarStr);
  if (!hbarStr || isNaN(hbar) || hbar <= 0 || price8dec === 0n) return "";
  const usd = (hbar * Number(price8dec)) / 1e8;
  return usd.toFixed(4);
}

function usdToHbar(usdStr: string, price8dec: bigint): string {
  const usd = parseFloat(usdStr);
  if (!usdStr || isNaN(usd) || usd <= 0 || price8dec === 0n) return "";
  const hbar = (usd * 1e8) / Number(price8dec);
  return hbar.toFixed(6);
}

export function ContributeForm({ contractAddress, isOpen, hbarPrice, refetch }: Props) {
  const [mode, setMode] = useState<"hbar" | "usd">("hbar");
  const [hbarInput, setHbarInput] = useState("");
  const [usdInput, setUsdInput]   = useState("");

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Refetch immediately for contract state (totalRaised, progress bar), then
  // again after 5s to catch the Contributed event in getLogs (Hedera Hashio
  // has a ~3-5s lag between tx receipt and log indexing).
  useEffect(() => {
    if (isSuccess) {
      refetch();
      setHbarInput("");
      setUsdInput("");
      const t = setTimeout(() => { refetch(); }, 5_000);
      return () => { clearTimeout(t); reset(); };
    }
  }, [isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  function onHbarChange(val: string) {
    setHbarInput(val);
    setUsdInput(hbarToUsd(val, hbarPrice));
  }

  function onUsdChange(val: string) {
    setUsdInput(val);
    setHbarInput(usdToHbar(val, hbarPrice));
  }

  const hbarValue = parseFloat(hbarInput);
  const canSubmit = isOpen && !isPending && !isConfirming && hbarValue > 0;

  function handleContribute() {
    if (!canSubmit) return;
    writeContract({
      address: contractAddress,
      abi: CROWDFUND_ABI,
      functionName: "contribute",
      value: parseEther(hbarInput),
    });
  }

  const priceAvailable = hbarPrice > 0n;
  const priceDisplay   = priceAvailable
    ? `$${(Number(hbarPrice) / 1e8).toFixed(4)} / HBAR`
    : "price loading…";

  return (
    <div className="card">
      <div className="contribute-header">
        <h2>Contribute HBAR</h2>
        {priceAvailable && (
          <span className="price-pill">Live: {priceDisplay}</span>
        )}
      </div>

      {priceAvailable && (
        <div className="mode-toggle">
          <button
            type="button"
            className={mode === "hbar" ? "toggle-btn active" : "toggle-btn"}
            onClick={() => setMode("hbar")}
          >
            Enter HBAR
          </button>
          <button
            type="button"
            className={mode === "usd" ? "toggle-btn active" : "toggle-btn"}
            onClick={() => setMode("usd")}
          >
            Enter USD
          </button>
        </div>
      )}

      {mode === "hbar" ? (
        <div className="input-group">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount in HBAR"
            value={hbarInput}
            onChange={(e) => onHbarChange(e.target.value)}
            disabled={!isOpen || isPending || isConfirming}
          />
          {priceAvailable && usdInput && (
            <span className="conversion-hint">≈ ${usdInput} USD</span>
          )}
        </div>
      ) : (
        <div className="input-group">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount in USD"
            value={usdInput}
            onChange={(e) => onUsdChange(e.target.value)}
            disabled={!isOpen || isPending || isConfirming}
          />
          {hbarInput && (
            <span className="conversion-hint">≈ {hbarInput} HBAR</span>
          )}
        </div>
      )}

      {hbarInput && usdInput && priceAvailable && (
        <div className="contribute-summary">
          <span>You&apos;ll send</span>
          <span>
            <strong>{parseFloat(hbarInput).toFixed(4)} HBAR</strong>
            {" "}
            <span className="muted">(≈ ${parseFloat(usdInput).toFixed(2)} USD)</span>
          </span>
        </div>
      )}

      <button
        className="btn-primary contribute-btn"
        onClick={handleContribute}
        disabled={!canSubmit}
      >
        {isPending || isConfirming ? "Sending…" : "Contribute"}
      </button>

      {!isOpen && (
        <p className="error-msg">Campaign is closed — contributions are no longer accepted.</p>
      )}
      {error && (
        <p className="error-msg">Error: {error.message.split("\n")[0]}</p>
      )}
      {isSuccess && (
        <p className="success-msg">Contribution confirmed! ✓</p>
      )}
    </div>
  );
}
