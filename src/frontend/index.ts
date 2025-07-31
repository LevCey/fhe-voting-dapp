#!/usr/bin/env ts-node

import { ethers } from "ethers";
import { getInstance } from "@fhenix/fhevm";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as readline from "readline";
import chalk from "chalk";

dotenv.config();

interface DeploymentInfo {
  contractAddress: string;
  network: string;
  deployer: string;
  timestamp: string;
}

interface Proposal {
  id: number;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  yesVotes?: number;
  noVotes?: number;
  isDecrypted?: boolean;
}

class FHEVotingDApp {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private contract: ethers.Contract;
  private contractAddress: string;
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async initialize() {
    console.log(chalk.blue("🔐 FHEVM Voting dApp - Privacy-Preserving Voting System"));
    console.log(chalk.gray("Powered by Zama.ai FHEVM\n"));

    // Load deployment info
    const deploymentInfo = this.loadDeploymentInfo();
    if (!deploymentInfo) {
      console.log(chalk.red("❌ No deployment info found. Please deploy the contract first."));
      console.log(chalk.yellow("Run: npm run deploy"));
      process.exit(1);
    }

    this.contractAddress = deploymentInfo.contractAddress;
    console.log(chalk.green(`✅ Contract Address: ${this.contractAddress}`));
    console.log(chalk.green(`✅ Network: ${deploymentInfo.network}\n`));

    // Setup provider and signer
    const rpcUrl = process.env.SEPOLIA_URL;
    const privateKey = process.env.PRIVATE_KEY;

    if (!rpcUrl || !privateKey) {
      console.log(chalk.red("❌ Missing environment variables. Please check your .env file."));
      process.exit(1);
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);

    // Load contract ABI
    const contractArtifact = JSON.parse(
      fs.readFileSync("./artifacts/contracts/EncryptedVoting.sol/EncryptedVoting.json", "utf8")
    );

    this.contract = new ethers.Contract(
      this.contractAddress,
      contractArtifact.abi,
      this.signer
    );

    console.log(chalk.green(`✅ Connected to wallet: ${this.signer.address}\n`));
  }

  private loadDeploymentInfo(): DeploymentInfo | null {
    try {
      if (fs.existsSync("./deployment.json")) {
        return JSON.parse(fs.readFileSync("./deployment.json", "utf8"));
      }
    } catch (error) {
      console.log(chalk.red("Error loading deployment info:", error));
    }
    return null;
  }

  async showMainMenu() {
    while (true) {
      console.log(chalk.cyan("\n=== FHEVM Voting dApp Menu ==="));
      console.log("1. View all proposals");
      console.log("2. Create new proposal");
      console.log("3. Vote on proposal");
      console.log("4. View proposal details");
      console.log("5. End proposal (Owner only)");
      console.log("6. View vote results");
      console.log("7. Check if you've voted");
      console.log("8. Exit");

      const choice = await this.question(chalk.yellow("\nSelect an option (1-8): "));

      switch (choice) {
        case "1":
          await this.viewAllProposals();
          break;
        case "2":
          await this.createProposal();
          break;
        case "3":
          await this.voteOnProposal();
          break;
        case "4":
          await this.viewProposalDetails();
          break;
        case "5":
          await this.endProposal();
          break;
        case "6":
          await this.viewVoteResults();
          break;
        case "7":
          await this.checkVoteStatus();
          break;
        case "8":
          console.log(chalk.green("👋 Goodbye!"));
          this.rl.close();
          process.exit(0);
        default:
          console.log(chalk.red("❌ Invalid option. Please try again."));
      }
    }
  }

  async viewAllProposals() {
    console.log(chalk.blue("\n📋 All Proposals:"));
    console.log(chalk.gray("=".repeat(50)));

    try {
      const proposalCount = await this.contract.getProposalCount();
      
      if (proposalCount === 0n) {
        console.log(chalk.yellow("No proposals found."));
        return;
      }

      for (let i = 0; i < Number(proposalCount); i++) {
        const [title, description, startTime, endTime, isActive] = 
          await this.contract.getProposal(i);
        
        const status = isActive ? chalk.green("🟢 Active") : chalk.red("🔴 Ended");
        const startDate = new Date(Number(startTime) * 1000).toLocaleString();
        const endDate = new Date(Number(endTime) * 1000).toLocaleString();

        console.log(chalk.cyan(`\nProposal #${i}:`));
        console.log(`Title: ${title}`);
        console.log(`Description: ${description}`);
        console.log(`Status: ${status}`);
        console.log(`Start: ${startDate}`);
        console.log(`End: ${endDate}`);
      }
    } catch (error) {
      console.log(chalk.red("❌ Error fetching proposals:", error));
    }
  }

  async createProposal() {
    console.log(chalk.blue("\n📝 Create New Proposal:"));
    console.log(chalk.gray("=".repeat(50)));

    try {
      const title = await this.question("Enter proposal title: ");
      const description = await this.question("Enter proposal description: ");
      
      const startTimeInput = await this.question("Enter start time (minutes from now): ");
      const startTime = Math.floor(Date.now() / 1000) + (parseInt(startTimeInput) * 60);
      
      const durationInput = await this.question("Enter duration (hours): ");
      const duration = parseInt(durationInput) * 3600;

      console.log(chalk.yellow("\nCreating proposal..."));
      
      const tx = await this.contract.createProposal(title, description, startTime, duration);
      await tx.wait();

      console.log(chalk.green("✅ Proposal created successfully!"));
      console.log(chalk.gray(`Transaction hash: ${tx.hash}`));
    } catch (error) {
      console.log(chalk.red("❌ Error creating proposal:", error));
    }
  }

  async voteOnProposal() {
    console.log(chalk.blue("\n🗳️ Vote on Proposal:"));
    console.log(chalk.gray("=".repeat(50)));

    try {
      const proposalId = await this.question("Enter proposal ID: ");
      const voteChoice = await this.question("Enter your vote (1 for Yes, 0 for No): ");
      
      const vote = parseInt(voteChoice);
      if (vote !== 0 && vote !== 1) {
        console.log(chalk.red("❌ Invalid vote. Must be 0 or 1."));
        return;
      }

      // Check if user has already voted
      const hasVoted = await this.contract.hasVoted(proposalId, this.signer.address);
      if (hasVoted) {
        console.log(chalk.red("❌ You have already voted on this proposal."));
        return;
      }

      console.log(chalk.yellow("\nEncrypting vote..."));
      
      // Encrypt the vote using FHEVM
      const instance = getInstance();
      const encryptedVote = instance.encrypt32(vote);
      const voteProof = instance.generateProof(encryptedVote);

      console.log(chalk.yellow("Casting encrypted vote..."));
      
      const tx = await this.contract.castVote(proposalId, encryptedVote, voteProof);
      await tx.wait();

      console.log(chalk.green("✅ Vote cast successfully!"));
      console.log(chalk.gray(`Transaction hash: ${tx.hash}`));
      console.log(chalk.blue(`Your encrypted vote: ${vote === 1 ? "Yes" : "No"}`));
    } catch (error) {
      console.log(chalk.red("❌ Error casting vote:", error));
    }
  }

  async viewProposalDetails() {
    console.log(chalk.blue("\n📄 Proposal Details:"));
    console.log(chalk.gray("=".repeat(50)));

    try {
      const proposalId = await this.question("Enter proposal ID: ");
      
      const [title, description, startTime, endTime, isActive] = 
        await this.contract.getProposal(proposalId);
      
      const startDate = new Date(Number(startTime) * 1000).toLocaleString();
      const endDate = new Date(Number(endTime) * 1000).toLocaleString();
      const status = isActive ? chalk.green("🟢 Active") : chalk.red("🔴 Ended");

      console.log(chalk.cyan(`\nProposal #${proposalId}:`));
      console.log(`Title: ${title}`);
      console.log(`Description: ${description}`);
      console.log(`Status: ${status}`);
      console.log(`Start: ${startDate}`);
      console.log(`End: ${endDate}`);

      // Check if user has voted
      const hasVoted = await this.contract.hasVoted(proposalId, this.signer.address);
      console.log(`You voted: ${hasVoted ? chalk.green("Yes") : chalk.red("No")}`);
    } catch (error) {
      console.log(chalk.red("❌ Error fetching proposal details:", error));
    }
  }

  async endProposal() {
    console.log(chalk.blue("\n🔚 End Proposal:"));
    console.log(chalk.gray("=".repeat(50)));

    try {
      const proposalId = await this.question("Enter proposal ID: ");
      
      console.log(chalk.yellow("Ending proposal and decrypting results..."));
      
      const tx = await this.contract.endProposal(proposalId);
      await tx.wait();

      console.log(chalk.green("✅ Proposal ended successfully!"));
      console.log(chalk.gray(`Transaction hash: ${tx.hash}`));
      
      // Show results
      const [yesVotes, noVotes, isDecrypted] = await this.contract.getVoteResults(proposalId);
      console.log(chalk.blue("\n📊 Final Results:"));
      console.log(`Yes votes: ${yesVotes}`);
      console.log(`No votes: ${noVotes}`);
      console.log(`Total votes: ${Number(yesVotes) + Number(noVotes)}`);
    } catch (error) {
      console.log(chalk.red("❌ Error ending proposal:", error));
    }
  }

  async viewVoteResults() {
    console.log(chalk.blue("\n📊 Vote Results:"));
    console.log(chalk.gray("=".repeat(50)));

    try {
      const proposalId = await this.question("Enter proposal ID: ");
      
      const [yesVotes, noVotes, isDecrypted] = await this.contract.getVoteResults(proposalId);
      
      if (isDecrypted) {
        console.log(chalk.blue(`\nResults for Proposal #${proposalId}:`));
        console.log(`Yes votes: ${yesVotes}`);
        console.log(`No votes: ${noVotes}`);
        console.log(`Total votes: ${Number(yesVotes) + Number(noVotes)}`);
        
        const total = Number(yesVotes) + Number(noVotes);
        if (total > 0) {
          const yesPercentage = ((Number(yesVotes) / total) * 100).toFixed(1);
          const noPercentage = ((Number(noVotes) / total) * 100).toFixed(1);
          console.log(`Yes: ${yesPercentage}% | No: ${noPercentage}%`);
        }
      } else {
        console.log(chalk.yellow("Results not yet decrypted. Proposal may still be active."));
      }
    } catch (error) {
      console.log(chalk.red("❌ Error fetching vote results:", error));
    }
  }

  async checkVoteStatus() {
    console.log(chalk.blue("\n🔍 Check Vote Status:"));
    console.log(chalk.gray("=".repeat(50)));

    try {
      const proposalId = await this.question("Enter proposal ID: ");
      
      const hasVoted = await this.contract.hasVoted(proposalId, this.signer.address);
      
      if (hasVoted) {
        console.log(chalk.green("✅ You have voted on this proposal."));
      } else {
        console.log(chalk.red("❌ You have not voted on this proposal yet."));
      }
    } catch (error) {
      console.log(chalk.red("❌ Error checking vote status:", error));
    }
  }

  private question(query: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(query, resolve);
    });
  }
}

async function main() {
  const app = new FHEVotingDApp();
  
  try {
    await app.initialize();
    await app.showMainMenu();
  } catch (error) {
    console.log(chalk.red("❌ Application error:", error));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 