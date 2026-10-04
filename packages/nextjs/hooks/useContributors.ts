"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { Address, parseAbiItem } from "viem";

export interface Contributor {
  address: Address;
  totalContributed: bigint;
  lastSeen: bigint;
}

// Hedera Hashio: max log range = 7 days (~604800 blocks at ~1 block/sec)
const HEDERA_MAX_BLOCK_RANGE = 600_000n;

const CONTRIBUTED_EVENT = parseAbiItem(
  "event Contributed(address indexed contributor, uint256 amount, uint256 totalRaised)"
);

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
      const latestBlock = await client.getBlockNumber();

      // Campaigns are recent by design — only look back 7 days max (Hashio limit)
      const fromBlock = latestBlock > HEDERA_MAX_BLOCK_RANGE
        ? latestBlock - HEDERA_MAX_BLOCK_RANGE
        : 0n;

      const logs = await client.getLogs({
        address: contractAddress,
        event: CONTRIBUTED_EVENT,
        fromBlock,
        toBlock: latestBlock,
      });

      // Aggregate per contributor
      const map = new Map<string, { total: bigint; lastBlock: bigint }>();
      for (const log of logs) {
        const addr   = (log.args.contributor! as Address).toLowerCase();
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
