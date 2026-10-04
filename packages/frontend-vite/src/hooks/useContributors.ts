import { useEffect, useState } from "react";
import { Address } from "viem";

export interface Contributor {
  address: Address;
  totalContributed: bigint;
  lastSeen: bigint;
}

// Hedera Mirror Node REST API — no eth_getLogs range restriction
const MIRROR_BASE = "https://testnet.mirrornode.hedera.com";

// Keccak256 of "Contributed(address,uint256,uint256)"
const CONTRIBUTED_TOPIC = "0xfa35a310d7113dddce1c275da946348e9aaebf9050b00b372033c4d84b0bd6eb";

interface MirrorLog {
  contract_id: string;
  data: string;
  topics: string[];
  block_number: number;
}

interface MirrorLogsResponse {
  logs: MirrorLog[];
  links?: { next?: string };
}

/** Decode a Contributed event log from the mirror node response.
 *  topics[1] = contributor (address, padded to 32 bytes)
 *  data      = abi-encoded (uint256 amount, uint256 totalRaised)
 */
function decodeContributed(log: MirrorLog): { contributor: Address; amount: bigint } | null {
  try {
    const contributor = ("0x" + log.topics[1].slice(-40)) as Address;
    // data is 0x + 32-byte amount + 32-byte totalRaised
    // Scale by 1e10: HashPack stores tinybars on-chain, restore to wei for display
    const amount = BigInt("0x" + log.data.slice(2, 66)) * 10_000_000_000n;
    return { contributor, amount };
  } catch {
    return null;
  }
}

/** Fetch all pages of logs from the mirror node for a given topic + contract. */
async function fetchAllLogs(contractAddress: string): Promise<MirrorLog[]> {
  const all: MirrorLog[] = [];
  let url = `${MIRROR_BASE}/api/v1/contracts/${contractAddress}/results/logs?limit=100&order=asc`;

  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Mirror node ${res.status}: ${await res.text()}`);
    const json: MirrorLogsResponse = await res.json();
    // Filter to only Contributed events (topic0 filter not supported without timestamp)
    all.push(...json.logs.filter((l: MirrorLog) => l.topics[0] === CONTRIBUTED_TOPIC));
    url = json.links?.next ? `${MIRROR_BASE}${json.links.next}` : "";
  }
  return all;
}

export function useContributors(contractAddress: Address, _deployBlock?: bigint) {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function fetch() {
    if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
      setIsLoading(false);
      return;
    }
    try {
      const logs = await fetchAllLogs(contractAddress);

      const map = new Map<string, { total: bigint; lastBlock: bigint }>();
      for (const log of logs) {
        const decoded = decodeContributed(log);
        if (!decoded) continue;
        const addr = decoded.contributor.toLowerCase();
        const prev = map.get(addr) ?? { total: 0n, lastBlock: 0n };
        const block = BigInt(log.block_number);
        map.set(addr, {
          total:     prev.total + decoded.amount,
          lastBlock: block > prev.lastBlock ? block : prev.lastBlock,
        });
      }

      const list: Contributor[] = Array.from(map.entries()).map(([addr, d]) => ({
        address:          addr as Address,
        totalContributed: d.total,
        lastSeen:         d.lastBlock,
      }));

      list.sort((a, b) => (b.totalContributed > a.totalContributed ? 1 : -1));
      setContributors(list);
    } catch (e) {
      console.error("useContributors: mirror node failed", e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 15_000);
    return () => clearInterval(interval);
  }, [contractAddress]);

  return { contributors, isLoading, refetch: fetch };
}
