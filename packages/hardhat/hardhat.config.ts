import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hedera_testnet: {
      url: process.env.HASHIO_RPC_URL ?? "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: process.env.HARDHAT_PRIVATE_KEY
        ? [process.env.HARDHAT_PRIVATE_KEY]
        : [],
    },
  },
};

export default config;
