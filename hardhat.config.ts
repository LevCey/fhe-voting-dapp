import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "fhevm-hardhat-plugin"; // FHEVM eklentisini içe aktar
import "dotenv/config";

// Ortam değişkenlerinin yüklendiğinden emin olalım.
const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL;
if (!sepoliaRpcUrl) {
  throw new Error("Please set your SEPOLIA_RPC_URL in a .env file");
}

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  throw new Error("Please set your PRIVATE_KEY in a .env file");
}

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: sepoliaRpcUrl,
      accounts: [privateKey],
    },
    "zama-devnet": {
      url: "https://devnet.zama.ai/",
      accounts: [privateKey],
    },
  },
};

export default config;