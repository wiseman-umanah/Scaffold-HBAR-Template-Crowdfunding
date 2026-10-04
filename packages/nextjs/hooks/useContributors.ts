"use client";

import { useCallback, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { Address, parseAbiItem } from "viem";

export interface Contributor {
  address: Address;
  totalContributed: bigint;
  lastSeen: bigint;
}

// Hedera Hashio: max log range measured by block timestamps, not block count.
// 500_000 blocks ≈ 5.8 days — keeps us safely under the 7-day limit.
const HEDERA_MAX_BLOCK_RANGE = 500_000n;

const CONTRIBUTED_EVENT = parseAbiItem(
  "event Contributed(address indexed contributor, uint256 amount, uint256 totalRaised)"
);

export function useContributors(contractAddress: Address, deployBlock?: bigint) {
  const client = usePublicClient();
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!client || contractAddress === "0x0000000000000000000000000000000000000000") {
      setIsLoading(false);
      return;
    }
    try {
      const latestBlock = await client.getBlockNumber();

      // Hedera block numbers are packed consensus timestamps — never subtract offsets.
      // Use exact deploy block when available; otherwise scan from genesis.
      const fromBlock = deployBlock ?? 0n;

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

      const list: Contributor[] = Array.from(map.entries()).map(([addr, d]) => ({
        address:          addr as Address,
        totalContributed: d.total,
        lastSeen:         d.lastBlock,
      }));

      // Sort by total contributed descending
      list.sort((a, b) => (b.totalContributed > a.totalContributed ? 1 : -1));
      setContributors(list);
    } catch (e) {
      console.error("useContributors: getLogs failed", e);
    } finally {
      setIsLoading(false);
    }
  }, [client, contractAddress, deployBlock]);

  useEffect(() => {
    fetch();
    // Re-poll every 15s so contributors update even without a manual refetch
    const interval = setInterval(fetch, 15_000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { contributors, isLoading, refetch: fetch };
}
