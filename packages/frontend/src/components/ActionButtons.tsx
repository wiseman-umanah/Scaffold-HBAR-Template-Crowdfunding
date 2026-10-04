"use client";

import { useEffect } from "react";
import { Address } from "viem";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { CROWDFUND_ABI } from "@/config/abi";
import { CampaignData } from "@/hooks/useCampaign";

interface Props {
  contractAddress: Address;
  data: CampaignData;
}

type Action = "finalize" | "withdraw" | "refund";

function ActionButton({
  label,
  action,
  disabled,
  className,
  contractAddress,
  refetch,
}: {
  label: string;
  action: Action;
  disabled: boolean;
  className: string;
  contractAddress: Address;
  refetch: () => void;
}) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) refetch();
  }, [isSuccess, refetch]);

  return (
    <div>
      <button
        className={className}
        disabled={disabled || isPending || isConfirming}
        onClick={() =>
          writeContract({
            address: contractAddress,
            abi: CROWDFUND_ABI,
            functionName: action,
          })
        }
      >
        {isPending || isConfirming ? `${label}…` : label}
      </button>
      {error && (
        <p className="error-msg" style={{ marginTop: "0.25rem" }}>
          {error.message.split("\n")[0]}
        </p>
      )}
      {isSuccess && (
        <p className="success-msg" style={{ marginTop: "0.25rem" }}>
          {label} confirmed!
        </p>
      )}
    </div>
  );
}

export function ActionButtons({ contractAddress, data }: Props) {
  const { address: account } = useAccount();

  const { finalized, goalMet, withdrawn, isOpen, myContribution, organizer, refetch } = data;

  const canFinalize = !isOpen && !finalized;
  const canWithdraw = finalized && goalMet && !withdrawn && account?.toLowerCase() === organizer.toLowerCase();
  const canRefund   = finalized && !goalMet && myContribution > 0n;

  const showAny = canFinalize || canWithdraw || canRefund;
  if (!showAny) return null;

  return (
    <div className="card">
      <h2>Actions</h2>
      <div className="action-row">
        {canFinalize && (
          <ActionButton
            label="Finalize"
            action="finalize"
            disabled={false}
            className="btn-secondary"
            contractAddress={contractAddress}
            refetch={refetch}
          />
        )}
        {canWithdraw && (
          <ActionButton
            label="Withdraw"
            action="withdraw"
            disabled={false}
            className="btn-success"
            contractAddress={contractAddress}
            refetch={refetch}
          />
        )}
        {canRefund && (
          <ActionButton
            label="Refund"
            action="refund"
            disabled={false}
            className="btn-danger"
            contractAddress={contractAddress}
            refetch={refetch}
          />
        )}
      </div>
    </div>
  );
}
