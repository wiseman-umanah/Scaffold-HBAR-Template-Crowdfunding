"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { Address, formatEther, parseAbiItem } from "viem";
import { CROWDFUND_ABI } from "@/config/abi";

export interface Contributor {
  address: Address;
  totalContributed: bigint; // sum of all contributions from this address
  lastSeen: bigint;          // block number of last Contributed event
}

export function useContributors(contractAddress: Address) {
  const client = usePublicClient();
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function fetch() {
    if (!client || contractAddress === "0x0000000000000000000000000000000000000000") {
      setIsLoading(false);
      return;
    }
    try {
      const logs = await client.getLogs({
        address: contractAddress,
        event: parseAbiItem(
          "event Contributed(address indexed contributor, uint256 amount, uint256 totalRaised)"
        ),
        fromBlock: 0n,
        toBlock: "latest",
      });

      // Aggregate per contributor
      const map = new Map<string, { total: bigint; lastBlock: bigint }>();
      for (const log of logs) {
        const addr  = (log.args.contributor! as Address).toLowerCase();
        const amount = log.args.amount! as bigint;
        const block  = log.blockNumber ?? 0n;
        const prev   = map.get(addr) ?? { total: 0n, lastBlock: 0n };
        map.set(addr, {
          total:     prev.total + amount,
          lastBlock: block > prev.lastBlock ? block : prev.lastBlock,
        });
      }

      const list: Contributor[] = Array.from(map.entries()).map(([addr, data]) => ({
        address:          addr as Address,
        totalContributed: data.total,
        lastSeen:         data.lastBlock,
      }));

      // Sort by total contributed descending
      list.sort((a, b) => (b.totalContributed > a.totalContributed ? 1 : -1));
      setContributors(list);
    } catch (e) {
      console.error("useContributors: getLogs failed", e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetch();
  }, [client, contractAddress]);

  return { contributors, isLoading, refetch: fetch };
}
