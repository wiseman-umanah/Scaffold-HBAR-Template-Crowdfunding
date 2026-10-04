"use client";

import { useReadContracts, useAccount } from "wagmi";
import { Address } from "viem";
import { CROWDFUND_ABI } from "@/config/abi";

export interface CampaignData {
  organizer: Address;
  goalUsd: bigint;
  deadline: bigint;
  totalRaised: bigint;
  finalized: boolean;
  goalMet: boolean;
  withdrawn: boolean;
  myContribution: bigint;
  timeLeft: bigint;
  isOpen: boolean;
  previewUsd: bigint;
  isLoading: boolean;
  refetch: () => void;
}

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as Address;

export function useCampaign(contractAddress: Address): CampaignData {
  const { address: account } = useAccount();

  // All reads batched into a single multicall
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      { address: contractAddress, abi: CROWDFUND_ABI, functionName: "organizer" },
      { address: contractAddress, abi: CROWDFUND_ABI, functionName: "goalUsd" },
      { address: contractAddress, abi: CROWDFUND_ABI, functionName: "deadline" },
      { address: contractAddress, abi: CROWDFUND_ABI, functionName: "totalRaised" },
      { address: contractAddress, abi: CROWDFUND_ABI, functionName: "finalized" },
      { address: contractAddress, abi: CROWDFUND_ABI, functionName: "goalMet" },
      { address: contractAddress, abi: CROWDFUND_ABI, functionName: "withdrawn" },
      {
        address: contractAddress,
        abi: CROWDFUND_ABI,
        functionName: "contributions",
        args: [account ?? ZERO_ADDR],
      },
      { address: contractAddress, abi: CROWDFUND_ABI, functionName: "timeLeft" },
      { address: contractAddress, abi: CROWDFUND_ABI, functionName: "isOpen" },
    ],
    query: { refetchInterval: 10_000 },
  });

  const organizer   = (data?.[0]?.result as Address)  ?? ZERO_ADDR;
  const goalUsd     = (data?.[1]?.result as bigint)   ?? 0n;
  const deadline    = (data?.[2]?.result as bigint)   ?? 0n;
  const totalRaised = (data?.[3]?.result as bigint)   ?? 0n;
  const finalized   = (data?.[4]?.result as boolean)  ?? false;
  const goalMet     = (data?.[5]?.result as boolean)  ?? false;
  const withdrawn   = (data?.[6]?.result as boolean)  ?? false;
  const myContribution = (data?.[7]?.result as bigint) ?? 0n;
  const timeLeft    = (data?.[8]?.result as bigint)   ?? 0n;
  const isOpen      = (data?.[9]?.result as boolean)  ?? false;

  // previewUsd is a separate read that depends on totalRaised
  const { data: previewData } = useReadContracts({
    contracts: [
      {
        address: contractAddress,
        abi: CROWDFUND_ABI,
        functionName: "previewUsdValue",
        args: [totalRaised],
      },
    ],
    query: { refetchInterval: 15_000, enabled: totalRaised > 0n },
  });

  const previewUsd = (previewData?.[0]?.result as bigint) ?? 0n;

  return {
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
    isLoading,
    refetch,
  };
}
