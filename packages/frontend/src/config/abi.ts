export const CROWDFUND_ABI = [
  // ── Immutables & state ─────────────────────────────────────────────────
  {
    type: "function",
    name: "organizer",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "goalUsd",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "deadline",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "feed",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "maxAge",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "contributions",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalRaised",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "finalized",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "goalMet",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "withdrawn",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  // ── View helpers ───────────────────────────────────────────────────────
  {
    type: "function",
    name: "timeLeft",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "isOpen",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "previewUsdValue",
    stateMutability: "view",
    inputs: [{ name: "hbarAmount", type: "uint256" }],
    outputs: [{ name: "usd8", type: "uint256" }],
  },
  // ── Mutators ───────────────────────────────────────────────────────────
  {
    type: "function",
    name: "contribute",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "finalize",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "refund",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  // ── Events ─────────────────────────────────────────────────────────────
  {
    type: "event",
    name: "Contributed",
    inputs: [
      { name: "contributor", type: "address", indexed: true },
      { name: "amount",      type: "uint256", indexed: false },
      { name: "totalRaised", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Finalized",
    inputs: [
      { name: "goalMet",     type: "bool",    indexed: false },
      { name: "priceAnswer", type: "int256",  indexed: false },
      { name: "updatedAt",   type: "uint256", indexed: false },
      { name: "totalRaised", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "organizer", type: "address", indexed: true },
      { name: "amount",    type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Refunded",
    inputs: [
      { name: "contributor", type: "address", indexed: true },
      { name: "amount",      type: "uint256", indexed: false },
    ],
  },
  // ── Constructor ────────────────────────────────────────────────────────
  {
    type: "constructor",
    inputs: [
      { name: "goalUsd_",    type: "uint256" },
      { name: "deadline_",   type: "uint256" },
      { name: "feed_",       type: "address" },
      { name: "maxAge_",     type: "uint256" },
      { name: "organizer_",  type: "address" },
    ],
  },
] as const;

// ── Factory ABI ────────────────────────────────────────────────────────────
export const FACTORY_ABI = [
  {
    type: "function",
    name: "createCampaign",
    stateMutability: "nonpayable",
    inputs: [
      { name: "goalUsd_",      type: "uint256" },
      { name: "deadline_",     type: "uint256" },
      { name: "title_",        type: "string"  },
      { name: "description_",  type: "string"  },
    ],
    outputs: [{ name: "campaign", type: "address" }],
  },
  {
    type: "function",
    name: "campaigns",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "campaignCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getCampaigns",
    stateMutability: "view",
    inputs: [
      { name: "from", type: "uint256" },
      { name: "to",   type: "uint256" },
    ],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "feed",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "maxAge",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "CampaignCreated",
    inputs: [
      { name: "campaign",     type: "address", indexed: true  },
      { name: "organizer",    type: "address", indexed: true  },
      { name: "goalUsd",      type: "uint256", indexed: false },
      { name: "deadline",     type: "uint256", indexed: false },
      { name: "title",        type: "string",  indexed: false },
      { name: "description",  type: "string",  indexed: false },
    ],
  },
] as const;
