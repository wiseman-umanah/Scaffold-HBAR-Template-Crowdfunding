/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Stub out optional/missing peer dependencies that appear in transitive deps
    // of @rainbow-me/rainbowkit → wagmi → @wagmi/connectors but are never used
    // by this app (no Coinbase Smart Wallet, no React Native, no pino-pretty).
    const stubs = [
      // @coinbase/cdp-sdk → @x402/* (not published)
      "@x402/evm",
      "@x402/evm/upto/client",
      "@x402/evm/exact/client",
      "@x402/svm/exact/client",
      "@x402/core/client",
      // @metamask/sdk → React Native storage (not needed in browser)
      "@react-native-async-storage/async-storage",
      // pino (WalletConnect logger) optional pretty-printer
      "pino-pretty",
    ];
    for (const stub of stubs) {
      config.resolve.alias[stub] = false;
    }
    return config;
  },
};

export default nextConfig;
