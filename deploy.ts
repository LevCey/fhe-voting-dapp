import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

async function main() {
  const Voting = await ethers.getContractFactory("Voting");
  const voting = await Voting.deploy();
  await voting.waitForDeployment();

  const contractAddress = await voting.getAddress();
  console.log(`Voting contract deployed to: ${contractAddress}`);

  // Kontrat adresini frontend'in erişebileceği bir dosyaya yaz
  const config = `export const CONTRACT_ADDRESS = "${contractAddress}";\n`;
  writeFileSync(join(__dirname, "..", "frontend", "contract-address.ts"), config);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});