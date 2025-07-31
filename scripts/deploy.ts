import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Deploying EncryptedVoting contract...");

  // Get the contract factory
  const EncryptedVoting = await ethers.getContractFactory("EncryptedVoting");
  
  // Deploy the contract
  const encryptedVoting = await EncryptedVoting.deploy();
  
  // Wait for deployment to complete
  await encryptedVoting.waitForDeployment();
  
  const address = await encryptedVoting.getAddress();
  
  console.log("EncryptedVoting deployed to:", address);
  console.log("Contract owner:", await encryptedVoting.owner());
  
  // Verify the deployment
  console.log("Verifying deployment...");
  const proposalCount = await encryptedVoting.getProposalCount();
  console.log("Initial proposal count:", proposalCount.toString());
  
  console.log("Deployment completed successfully!");
  console.log("Contract address:", address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  
  // Save the contract address to a file for the frontend
  const fs = require('fs');
  const deploymentInfo = {
    contractAddress: address,
    network: (await ethers.provider.getNetwork()).name,
    deployer: (await ethers.getSigners())[0].address,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    'deployment.json', 
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 