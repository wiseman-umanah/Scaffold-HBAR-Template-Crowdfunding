import { useEffect, useState } from "react";
import { Address } from "viem";

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
  import.meta.env.VITE_FACTORY_ADDRESS ?? "0x0000000000000000000000000000000000000000"
) as Address;

// Hedera Mirror Node REST API — no eth_getLogs range restriction
const MIRROR_BASE = "https://testnet.mirrornode.hedera.com";

// Keccak256 of "CampaignCreated(address,address,uint256,uint256,string,string)"
const CAMPAIGN_CREATED_TOPIC = "0x71535c0fb2cc0698611e65f99d703fe0e5711fd616b8016ddceaadc134b203d8";

interface MirrorLog {
  data: string;
  topics: string[];
  block_number: number;
}

interface MirrorLogsResponse {
  logs: MirrorLog[];
  links?: { next?: string };
}

/** Decode a CampaignCreated event from the mirror node.
 *  topics[1] = campaign address (indexed)
 *  topics[2] = organizer address (indexed)
 *  data      = abi-encoded (uint256 goalUsd, uint256 deadline, string title, string description)
 */
function decodeCampaignCreated(log: MirrorLog): CampaignMeta | null {
  try {
    const campaign  = ("0x" + log.topics[1].slice(-40)) as Address;
    const organizer = ("0x" + log.topics[2].slice(-40)) as Address;

    // data layout (each slot = 32 bytes, no 0x prefix after slice):
    // [0]   goalUsd    (uint256)
    // [1]   deadline   (uint256)
    // [2]   offset to title string data
    // [3]   offset to description string data
    // [4]   title length
    // [5+]  title bytes (padded)
    // then description length + bytes
    const hex = log.data.startsWith("0x") ? log.data.slice(2) : log.data;
    const slot = (n: number) => hex.slice(n * 64, (n + 1) * 64);

    const goalUsd  = BigInt("0x" + slot(0));
    const deadline = BigInt("0x" + slot(1));

    // Dynamic string offsets are in bytes; divide by 32 to get slot index
    const titleOffset = Number(BigInt("0x" + slot(2))) / 32;
    const descOffset  = Number(BigInt("0x" + slot(3))) / 32;

    const titleLen = Number(BigInt("0x" + slot(titleOffset)));
    const titleHex = hex.slice((titleOffset + 1) * 64, (titleOffset + 1) * 64 + titleLen * 2);
    const title    = decodeURIComponent(escape(titleHex.match(/.{1,2}/g)!.map(b => String.fromCharCode(parseInt(b, 16))).join("")));

    const descLen = Number(BigInt("0x" + slot(descOffset)));
    let description = "";
    if (descLen > 0) {
      const descHex = hex.slice((descOffset + 1) * 64, (descOffset + 1) * 64 + descLen * 2);
      description = decodeURIComponent(escape(descHex.match(/.{1,2}/g)!.map(b => String.fromCharCode(parseInt(b, 16))).join("")));
    }

    return {
      address: campaign,
      organizer,
      goalUsd,
      deadline,
      title,
      description,
      blockNumber: BigInt(log.block_number),
    };
  } catch {
    return null;
  }
}

async function fetchAllCampaignLogs(): Promise<MirrorLog[]> {
  const all: MirrorLog[] = [];
  let url = `${MIRROR_BASE}/api/v1/contracts/${FACTORY_ADDRESS}/results/logs?limit=100&order=asc`;

  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Mirror node ${res.status}: ${await res.text()}`);
    const json: MirrorLogsResponse = await res.json();
    // Filter to only CampaignCreated events (topic0 filter not supported without timestamp)
    all.push(...json.logs.filter(l => l.topics[0] === CAMPAIGN_CREATED_TOPIC));
    url = json.links?.next ? `${MIRROR_BASE}${json.links.next}` : "";
  }
  return all;
}

export function useFactory() {
  const [campaigns, setCampaigns] = useState<CampaignMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchCampaigns() {
    if (FACTORY_ADDRESS === "0x0000000000000000000000000000000000000000") {
      setIsLoading(false);
      return;
    }
    try {
      const logs  = await fetchAllCampaignLogs();
      const metas = logs.map(decodeCampaignCreated).filter((m): m is CampaignMeta => m !== null);
      // Most recent first
      setCampaigns([...metas].reverse());
    } catch (e) {
      console.error("useFactory: mirror node failed", e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return { campaigns, isLoading, factoryAddress: FACTORY_ADDRESS, refetch: fetchCampaigns };
}
