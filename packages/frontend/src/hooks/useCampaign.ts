import { useReadContracts, useReadContract, useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
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
  /** Live Chainlink HBAR/USD price — 8 decimals (e.g. 10150000 = $0.1015). 0n if unavailable. */
  hbarPrice: bigint;
  isLoading: boolean;
  refetch: () => void;
}

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as Address;

// Minimal ABI for reading the Chainlink feed directly
const FEED_ABI = [
  {
    name: "latestRoundData",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId",         type: "uint80"  },
      { name: "answer",          type: "int256"  },
      { name: "startedAt",       type: "uint256" },
      { name: "updatedAt",       type: "uint256" },
      { name: "answeredInRound", type: "uint80"  },
    ],
  },
] as const;

const FEED_ADDRESS = "0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a" as Address;

export function useCampaign(contractAddress: Address): CampaignData {
  const { address: account } = useAccount();
  const queryClient = useQueryClient();

  // Disable all contract reads when address is zero
  const enabled = contractAddress !== ZERO_ADDR;

  const { data, isLoading, refetch: refetchMain } = useReadContracts({
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
    query: { refetchInterval: 10_000, enabled },
  });

  const organizer      = (data?.[0]?.result as Address)  ?? ZERO_ADDR;
  const goalUsd        = (data?.[1]?.result as bigint)   ?? 0n;
  const deadline       = (data?.[2]?.result as bigint)   ?? 0n;
  const totalRaised    = (data?.[3]?.result as bigint)   ?? 0n;
  const finalized      = (data?.[4]?.result as boolean)  ?? false;
  const goalMet        = (data?.[5]?.result as boolean)  ?? false;
  const withdrawn      = (data?.[6]?.result as boolean)  ?? false;
  const myContribution = (data?.[7]?.result as bigint)   ?? 0n;
  const timeLeft       = (data?.[8]?.result as bigint)   ?? 0n;
  const isOpen         = (data?.[9]?.result as boolean)  ?? false;

  // USD preview of total raised (depends on totalRaised)
  const { data: previewData, refetch: refetchPreview } = useReadContracts({
    contracts: [
      {
        address: contractAddress,
        abi: CROWDFUND_ABI,
        functionName: "previewUsdValue",
        args: [totalRaised],
      },
    ],
    query: { refetchInterval: 15_000, enabled: enabled && totalRaised > 0n },
  });
  const previewUsd = (previewData?.[0]?.result as bigint) ?? 0n;

  function refetch() {
    // Invalidate wagmi cache first so refetch returns fresh chain data, not stale cache
    queryClient.invalidateQueries({ queryKey: ["readContracts"] });
    refetchMain();
    refetchPreview();
  }

  // Live Chainlink HBAR/USD price — always enabled
  const { data: feedData } = useReadContract({
    address: FEED_ADDRESS,
    abi: FEED_ABI,
    functionName: "latestRoundData",
    query: { refetchInterval: 15_000 },
  });
  const hbarPrice =
    feedData && (feedData as readonly [bigint, bigint, bigint, bigint, bigint])[1] > 0n
      ? (feedData as readonly [bigint, bigint, bigint, bigint, bigint])[1]
      : 0n;

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
    hbarPrice,
    isLoading,
    refetch,
  };
}

/**
 * Lightweight hook — only reads the live HBAR/USD price from Chainlink.
 * Use on pages that need the price but don't have a campaign contract address.
 */
export function useHbarPrice(): bigint {
  const FEED_ABI_PRICE = [
    {
      name: "latestRoundData",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [
        { name: "roundId",         type: "uint80"  },
        { name: "answer",          type: "int256"  },
        { name: "startedAt",       type: "uint256" },
        { name: "updatedAt",       type: "uint256" },
        { name: "answeredInRound", type: "uint80"  },
      ],
    },
  ] as const;

  const { data } = useReadContract({
    address: FEED_ADDRESS,
    abi: FEED_ABI_PRICE,
    functionName: "latestRoundData",
    query: { refetchInterval: 15_000 },
  });

  return data && (data as readonly [bigint, bigint, bigint, bigint, bigint])[1] > 0n
    ? (data as readonly [bigint, bigint, bigint, bigint, bigint])[1]
    : 0n;
}
