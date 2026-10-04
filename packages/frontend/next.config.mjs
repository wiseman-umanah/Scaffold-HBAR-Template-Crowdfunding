/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@rainbow-me/rainbowkit"],

  experimental: {
    // Prevent Next.js 14 from trying to bundle node-only deps pulled in
    // transitively by @wagmi/connectors → @base-org/account → @coinbase/cdp-sdk
    serverComponentsExternalPackages: [
      "@coinbase/cdp-sdk",
      "@base-org/account",
    ],
  },

  webpack(config) {
    // The @x402/* sub-packages don't ship in this install; stub them out so
    // Next.js doesn't fail when it scans transitive imports.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/evm/upto/client":                    false,
      "@x402/evm/exact/client":                   false,
      "@x402/core/client":                        false,
      "@x402/svm/exact/client":                   false,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty":                               false,
    };
    return config;
  },
};

export default nextConfig;
