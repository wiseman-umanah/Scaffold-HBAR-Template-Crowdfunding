"use client";

import dynamic from "next/dynamic";

// RainbowKit and wagmi use browser-only APIs (localStorage, window, etc.).
// Wrapping with ssr:false ensures they never run on the server.
const ProvidersInner = dynamic(
  () => import("@/app/providers-inner").then((m) => m.ProvidersInner),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return <ProvidersInner>{children}</ProvidersInner>;
}
