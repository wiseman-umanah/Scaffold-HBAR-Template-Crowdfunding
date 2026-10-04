"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { Address, parseAbiItem } from "viem";

export interface CampaignMeta {
  address: Address;
  organizer: Address;
  goalUsd: bigint;
  deadline: bigint;
  title: string;
  description: string;
  blockNumber: bigint;
}

const FACTORY_ADDRESS = (
  process.env.NEXT_PUBLIC_FACTORY_ADDRESS ?? "0x0000000000000000000000000000000000000000"
) as Address;

/**
 * The block the factory was deployed at.
 * Set NEXT_PUBLIC_FACTORY_DEPLOY_BLOCK in .env.local to the block printed by deployFactory.ts.
 * REQUIRED: Hedera Hashio block numbers are packed consensus timestamps — arithmetic
 * subtraction does not yield a valid range. Without this env var, fromBlock defaults
 * to 0n (genesis) which is always correct but may be slow on large histories.
 */
const FACTORY_DEPLOY_BLOCK: bigint | null =
  process.env.NEXT_PUBLIC_FACTORY_DEPLOY_BLOCK
    ? BigInt(process.env.NEXT_PUBLIC_FACTORY_DEPLOY_BLOCK)
    : null;

const CAMPAIGN_CREATED_EVENT = parseAbiItem(
  "event CampaignCreated(address indexed campaign, address indexed organizer, uint256 goalUsd, uint256 deadline, string title, string description)"
);

export function useFactory() {
  const client = usePublicClient();
  const [campaigns, setCampaigns] = useState<CampaignMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchCampaigns() {
    if (!client || FACTORY_ADDRESS === "0x0000000000000000000000000000000000000000") {
      setIsLoading(false);
      return;
    }
    try {
      const latestBlock = await client.getBlockNumber();

      // Hedera block numbers are packed consensus timestamps — never subtract offsets.
      // Use exact factory deploy block when set; otherwise scan from genesis.
      const fromBlock = FACTORY_DEPLOY_BLOCK ?? 0n;

      const logs = await client.getLogs({
        address: FACTORY_ADDRESS,
        event: CAMPAIGN_CREATED_EVENT,
        fromBlock,
        toBlock: latestBlock,
      });

      const metas: CampaignMeta[] = logs.map((log) => ({
        address:     log.args.campaign!    as Address,
        organizer:   log.args.organizer!   as Address,
        goalUsd:     log.args.goalUsd!     as bigint,
        deadline:    log.args.deadline!    as bigint,
        title:       log.args.title!       as string,
        description: log.args.description! as string,
        blockNumber: log.blockNumber ?? 0n,
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
