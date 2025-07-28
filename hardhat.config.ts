// hardhat.config.ts

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "@fhevm/hardhat-plugin";
import "dotenv/config";

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY !== "" ? [PRIVATE_KEY] : [],
      fhevm: {
        network: "sepolia",
      },
    },
    hardhat: {
      fhevm: {
        network: "dev",
      },
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;