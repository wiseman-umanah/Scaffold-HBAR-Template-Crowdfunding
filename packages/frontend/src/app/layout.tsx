import type { Metadata } from "next";
import { Providers } from "@/app/providers";
import "@/app/globals.css";
import "@rainbow-me/rainbowkit/styles.css";

export const metadata: Metadata = {
  title: "HBAR Crowdfund",
  description: "USD-denominated crowdfunding on Hedera with Chainlink HBAR/USD oracle",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
