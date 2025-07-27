import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const Voting = await ethers.getContractFactory("Voting");
  const contract = await Voting.deploy(["Alice", "Bob"]);
  await contract.waitForDeployment();

  console.log("Voting deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
