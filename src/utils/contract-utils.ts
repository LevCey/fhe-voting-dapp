import { ethers } from "ethers";
import { getInstance } from "@fhenix/fhevm";
import * as fs from "fs";

export interface ContractConfig {
  address: string;
  abi: any[];
  network: string;
}

export class ContractUtils {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private config: ContractConfig;

  constructor(provider: ethers.JsonRpcProvider, config: ContractConfig) {
    this.provider = provider;
    this.config = config;
    this.contract = new ethers.Contract(config.address, config.abi, provider);
  }

  /**
   * Load contract configuration from deployment file
   */
  static loadContractConfig(): ContractConfig | null {
    try {
      if (fs.existsSync("./deployment.json")) {
        const deploymentInfo = JSON.parse(fs.readFileSync("./deployment.json", "utf8"));
        const contractArtifact = JSON.parse(
          fs.readFileSync("./artifacts/contracts/EncryptedVoting.sol/EncryptedVoting.json", "utf8")
        );

        return {
          address: deploymentInfo.contractAddress,
          abi: contractArtifact.abi,
          network: deploymentInfo.network
        };
      }
    } catch (error) {
      console.error("Error loading contract config:", error);
    }
    return null;
  }

  /**
   * Create encrypted vote using FHEVM
   */
  static encryptVote(vote: number): { encryptedVote: any; proof: any } {
    if (vote !== 0 && vote !== 1) {
      throw new Error("Vote must be 0 or 1");
    }

    const instance = getInstance();
    const encryptedVote = instance.encrypt32(vote);
    const proof = instance.generateProof(encryptedVote);

    return { encryptedVote, proof };
  }

  /**
   * Get all proposals with their details
   */
  async getAllProposals(): Promise<any[]> {
    const proposalCount = await this.contract.getProposalCount();
    const proposals = [];

    for (let i = 0; i < Number(proposalCount); i++) {
      const [title, description, startTime, endTime, isActive] = 
        await this.contract.getProposal(i);
      
      proposals.push({
        id: i,
        title,
        description,
        startTime: Number(startTime),
        endTime: Number(endTime),
        isActive
      });
    }

    return proposals;
  }

  /**
   * Get proposal details by ID
   */
  async getProposal(proposalId: number): Promise<any> {
    const [title, description, startTime, endTime, isActive] = 
      await this.contract.getProposal(proposalId);
    
    return {
      id: proposalId,
      title,
      description,
      startTime: Number(startTime),
      endTime: Number(endTime),
      isActive
    };
  }

  /**
   * Get vote results for a proposal
   */
  async getVoteResults(proposalId: number): Promise<any> {
    const [yesVotes, noVotes, isDecrypted] = 
      await this.contract.getVoteResults(proposalId);
    
    return {
      yesVotes: Number(yesVotes),
      noVotes: Number(noVotes),
      isDecrypted,
      total: Number(yesVotes) + Number(noVotes)
    };
  }

  /**
   * Check if an address has voted on a proposal
   */
  async hasVoted(proposalId: number, address: string): Promise<boolean> {
    return await this.contract.hasVoted(proposalId, address);
  }

  /**
   * Get contract instance for direct interaction
   */
  getContract(): ethers.Contract {
    return this.contract;
  }

  /**
   * Get contract address
   */
  getAddress(): string {
    return this.config.address;
  }

  /**
   * Get network name
   */
  getNetwork(): string {
    return this.config.network;
  }
}

export class VotingManager {
  private contractUtils: ContractUtils;
  private signer: ethers.Wallet;

  constructor(contractUtils: ContractUtils, signer: ethers.Wallet) {
    this.contractUtils = contractUtils;
    this.signer = signer;
  }

  /**
   * Create a new proposal
   */
  async createProposal(
    title: string,
    description: string,
    startTime: number,
    duration: number
  ): Promise<ethers.ContractTransactionResponse> {
    const contract = this.contractUtils.getContract().connect(this.signer);
    return await contract.createProposal(title, description, startTime, duration);
  }

  /**
   * Cast an encrypted vote
   */
  async castVote(
    proposalId: number,
    vote: number
  ): Promise<ethers.ContractTransactionResponse> {
    const { encryptedVote, proof } = ContractUtils.encryptVote(vote);
    const contract = this.contractUtils.getContract().connect(this.signer);
    
    return await contract.castVote(proposalId, encryptedVote, proof);
  }

  /**
   * End a proposal and decrypt results
   */
  async endProposal(proposalId: number): Promise<ethers.ContractTransactionResponse> {
    const contract = this.contractUtils.getContract().connect(this.signer);
    return await contract.endProposal(proposalId);
  }

  /**
   * Check if the signer is the contract owner
   */
  async isOwner(): Promise<boolean> {
    const contract = this.contractUtils.getContract();
    const owner = await contract.owner();
    return this.signer.address.toLowerCase() === owner.toLowerCase();
  }
}

export class VoteValidator {
  /**
   * Validate vote input
   */
  static validateVote(vote: number): boolean {
    return vote === 0 || vote === 1;
  }

  /**
   * Validate proposal timing
   */
  static validateProposalTiming(startTime: number, duration: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    return startTime > now && duration > 0;
  }

  /**
   * Check if proposal is active
   */
  static isProposalActive(startTime: number, endTime: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    return now >= startTime && now <= endTime;
  }

  /**
   * Format timestamp to readable date
   */
  static formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }

  /**
   * Calculate time remaining for a proposal
   */
  static getTimeRemaining(endTime: number): string {
    const now = Math.floor(Date.now() / 1000);
    const remaining = endTime - now;
    
    if (remaining <= 0) {
      return "Ended";
    }
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  }
} 