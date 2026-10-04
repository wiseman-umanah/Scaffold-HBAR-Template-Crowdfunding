"use client";

import { useState } from "react";
import { parseEther, Address } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CROWDFUND_ABI } from "@/config/abi";

interface Props {
  contractAddress: Address;
  isOpen: boolean;
  refetch: () => void;
}

export function ContributeForm({ contractAddress, isOpen, refetch }: Props) {
  const [amount, setAmount] = useState("");

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  function handleContribute() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    writeContract({
      address: contractAddress,
      abi: CROWDFUND_ABI,
      functionName: "contribute",
      value: parseEther(amount),
    });
  }

  // Refresh campaign data once confirmed
  if (isSuccess) {
    refetch();
  }

  return (
    <div className="card">
      <h2>Contribute HBAR</h2>
      <input
        type="number"
        min="0"
        step="0.01"
        placeholder="Amount in HBAR"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        disabled={!isOpen || isPending || isConfirming}
      />
      <button
        className="btn-primary"
        onClick={handleContribute}
        disabled={!isOpen || isPending || isConfirming || !amount}
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
        <p className="success-msg">Contribution confirmed!</p>
      )}
    </div>
  );
}
