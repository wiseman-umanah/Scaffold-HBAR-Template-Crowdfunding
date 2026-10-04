"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { Address, parseAbiItem } from "viem";
import { FACTORY_ABI } from "@/config/abi";

export interface CampaignMeta {
  address: Address;
  organizer: Address;
  goalUsd: bigint;
  deadline: bigint;
  title: string;
  description: string;
}

const FACTORY_ADDRESS = (
  process.env.NEXT_PUBLIC_FACTORY_ADDRESS ?? "0x0000000000000000000000000000000000000000"
) as Address;

export function useFactory() {
  const client = usePublicClient();
  const [campaigns, setCampaigns] = useState<CampaignMeta[]>([]);
  const [isLoading, setIsLoading]  = useState(true);

  async function fetchCampaigns() {
    if (!client || FACTORY_ADDRESS === "0x0000000000000000000000000000000000000000") {
      setIsLoading(false);
      return;
    }
    try {
      const logs = await client.getLogs({
        address: FACTORY_ADDRESS,
        event: parseAbiItem(
          "event CampaignCreated(address indexed campaign, address indexed organizer, uint256 goalUsd, uint256 deadline, string title, string description)"
        ),
        fromBlock: 0n,
        toBlock: "latest",
      });

      const metas: CampaignMeta[] = logs.map((log) => ({
        address:     log.args.campaign!   as Address,
        organizer:   log.args.organizer!  as Address,
        goalUsd:     log.args.goalUsd!    as bigint,
        deadline:    log.args.deadline!   as bigint,
        title:       log.args.title!      as string,
        description: log.args.description! as string,
      }));

      // Most recent first
      setCampaigns(metas.reverse());
    } catch (e) {
      console.error("useFactory: getLogs failed", e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchCampaigns();
  }, [client]);

  return { campaigns, isLoading, factoryAddress: FACTORY_ADDRESS, refetch: fetchCampaigns };
}
