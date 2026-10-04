import { useEffect, useState } from "react";
import { Address } from "viem";

export interface CampaignMeta {
  title: string;
  description: string;
}

const MIRROR_BASE = "https://testnet.mirrornode.hedera.com";
const FACTORY_ADDRESS = (
  process.env.NEXT_PUBLIC_FACTORY_ADDRESS ?? "0x0000000000000000000000000000000000000000"
) as Address;

// Keccak256 of "CampaignCreated(address,address,uint256,uint256,string,string)"
const CAMPAIGN_CREATED_TOPIC = "0x71535c0fb2cc0698611e65f99d703fe0e5711fd616b8016ddceaadc134b203d8";

interface MirrorLog {
  data: string;
  topics: string[];
}

/** Decode title and description from a CampaignCreated event log's data field. */
function decodeMeta(data: string): { title: string; description: string } | null {
  try {
    const hex = data.startsWith("0x") ? data.slice(2) : data;
    const slot = (n: number) => hex.slice(n * 64, (n + 1) * 64);

    // data layout:
    // [0] goalUsd, [1] deadline, [2] titleOffset (bytes), [3] descOffset (bytes)
    const titleOffset = Number(BigInt("0x" + slot(2))) / 32;
    const descOffset  = Number(BigInt("0x" + slot(3))) / 32;

    const readStr = (slotIdx: number): string => {
      const len = Number(BigInt("0x" + slot(slotIdx)));
      if (len === 0) return "";
      const strHex = hex.slice((slotIdx + 1) * 64, (slotIdx + 1) * 64 + len * 2);
      const bytes = strHex.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) ?? [];
      return new TextDecoder().decode(new Uint8Array(bytes));
    };

    return {
      title:       readStr(titleOffset),
      description: readStr(descOffset),
    };
  } catch {
    return null;
  }
}

/**
 * Fetches the title and description for a campaign by looking up the
 * CampaignCreated event on the factory contract via the Hedera Mirror Node.
 * Works for any URL — no query params needed.
 */
export function useCampaignMeta(campaignAddress: Address) {
  const [meta, setMeta] = useState<CampaignMeta>({ title: "", description: "" });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (
      !campaignAddress ||
      campaignAddress === "0x0000000000000000000000000000000000000000" ||
      FACTORY_ADDRESS === "0x0000000000000000000000000000000000000000"
    ) {
      setIsLoading(false);
      return;
    }

    async function load() {
      try {
        // Fetch logs from the factory, filter by topic0=CampaignCreated and topic1=campaign address
        // Mirror node pads addresses to 32 bytes for topic matching
        const paddedAddr = "0x000000000000000000000000" + campaignAddress.slice(2).toLowerCase();
        const url = `${MIRROR_BASE}/api/v1/contracts/${FACTORY_ADDRESS}/results/logs?limit=100&order=asc`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Mirror node ${res.status}`);
        const json = await res.json();

        const log = (json.logs as (MirrorLog & { topics: string[] })[]).find(
          l =>
            l.topics[0] === CAMPAIGN_CREATED_TOPIC &&
            l.topics[1]?.toLowerCase() === paddedAddr.toLowerCase()
        );

        if (log) {
          const decoded = decodeMeta(log.data);
          if (decoded) setMeta(decoded);
        }
      } catch (e) {
        console.error("useCampaignMeta: failed", e);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [campaignAddress]);

  return { ...meta, isLoading };
}
