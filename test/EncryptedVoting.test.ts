import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FHE, getInstance } from "@fhenix/fhevm";
import { EncryptedVoting, EncryptedVoting__factory } from "../types";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
};

describe("EncryptedVoting", function () {
  let signers: Signers;
  let encryptedVoting: EncryptedVoting;
  let encryptedVotingAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      owner: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      charlie: ethSigners[3]
    };
  });

  beforeEach(async function () {
    // Deploy a new instance of the contract before each test
    const EncryptedVotingFactory = await ethers.getContractFactory("EncryptedVoting") as EncryptedVoting__factory;
    encryptedVoting = await EncryptedVotingFactory.deploy() as EncryptedVoting;
    encryptedVotingAddress = await encryptedVoting.getAddress();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await encryptedVoting.owner()).to.equal(signers.owner.address);
    });

    it("Should start with zero proposals", async function () {
      expect(await encryptedVoting.getProposalCount()).to.equal(0n);
    });
  });

  describe("Proposal Creation", function () {
    it("Should allow owner to create a proposal", async function () {
      const startTime = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
      const duration = 3600; // 1 hour

      await expect(
        encryptedVoting.connect(signers.owner).createProposal(
          "Test Proposal",
          "This is a test proposal",
          startTime,
          duration
        )
      ).to.emit(encryptedVoting, "ProposalCreated");

      expect(await encryptedVoting.getProposalCount()).to.equal(1n);
    });

    it("Should not allow non-owner to create a proposal", async function () {
      const startTime = Math.floor(Date.now() / 1000) + 60;
      const duration = 3600;

      await expect(
        encryptedVoting.connect(signers.alice).createProposal(
          "Test Proposal",
          "This is a test proposal",
          startTime,
          duration
        )
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should not allow creating proposal with past start time", async function () {
      const startTime = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
      const duration = 3600;

      await expect(
        encryptedVoting.connect(signers.owner).createProposal(
          "Test Proposal",
          "This is a test proposal",
          startTime,
          duration
        )
      ).to.be.revertedWith("Start time must be in the future");
    });
  });

  describe("Voting", function () {
    let proposalId: bigint;
    let startTime: number;

    beforeEach(async function () {
      startTime = Math.floor(Date.now() / 1000) + 10; // 10 seconds from now
      const duration = 3600;

      await encryptedVoting.connect(signers.owner).createProposal(
        "Test Proposal",
        "This is a test proposal",
        startTime,
        duration
      );

      proposalId = 0n;
    });

    it("Should not allow voting before start time", async function () {
      const instance = getInstance();
      const encryptedVote = instance.encrypt32(1);
      const voteProof = instance.generateProof(encryptedVote);

      await expect(
        encryptedVoting.connect(signers.alice).castVote(
          proposalId,
          encryptedVote,
          voteProof
        )
      ).to.be.revertedWith("Voting has not started");
    });

    it("Should allow voting after start time", async function () {
      // Wait for voting to start
      await ethers.provider.send("evm_increaseTime", [20]);
      await ethers.provider.send("evm_mine", []);

      const instance = getInstance();
      const encryptedVote = instance.encrypt32(1);
      const voteProof = instance.generateProof(encryptedVote);

      await expect(
        encryptedVoting.connect(signers.alice).castVote(
          proposalId,
          encryptedVote,
          voteProof
        )
      ).to.emit(encryptedVoting, "VoteCast");

      expect(await encryptedVoting.hasVoted(proposalId, signers.alice.address)).to.be.true;
    });

    it("Should not allow voting twice on the same proposal", async function () {
      // Wait for voting to start
      await ethers.provider.send("evm_increaseTime", [20]);
      await ethers.provider.send("evm_mine", []);

      const instance = getInstance();
      const encryptedVote = instance.encrypt32(1);
      const voteProof = instance.generateProof(encryptedVote);

      await encryptedVoting.connect(signers.alice).castVote(
        proposalId,
        encryptedVote,
        voteProof
      );

      await expect(
        encryptedVoting.connect(signers.alice).castVote(
          proposalId,
          encryptedVote,
          voteProof
        )
      ).to.be.revertedWith("Already voted on this proposal");
    });

    it("Should handle multiple votes correctly", async function () {
      // Wait for voting to start
      await ethers.provider.send("evm_increaseTime", [20]);
      await ethers.provider.send("evm_mine", []);

      const instance = getInstance();
      
      // Alice votes yes (1)
      const aliceVote = instance.encrypt32(1);
      const aliceProof = instance.generateProof(aliceVote);
      await encryptedVoting.connect(signers.alice).castVote(
        proposalId,
        aliceVote,
        aliceProof
      );

      // Bob votes no (0)
      const bobVote = instance.encrypt32(0);
      const bobProof = instance.generateProof(bobVote);
      await encryptedVoting.connect(signers.bob).castVote(
        proposalId,
        bobVote,
        bobProof
      );

      // Charlie votes yes (1)
      const charlieVote = instance.encrypt32(1);
      const charlieProof = instance.generateProof(charlieVote);
      await encryptedVoting.connect(signers.charlie).castVote(
        proposalId,
        charlieVote,
        charlieProof
      );

      expect(await encryptedVoting.hasVoted(proposalId, signers.alice.address)).to.be.true;
      expect(await encryptedVoting.hasVoted(proposalId, signers.bob.address)).to.be.true;
      expect(await encryptedVoting.hasVoted(proposalId, signers.charlie.address)).to.be.true;
    });
  });

  describe("Proposal Ending and Results", function () {
    let proposalId: bigint;
    let startTime: number;
    let endTime: number;

    beforeEach(async function () {
      startTime = Math.floor(Date.now() / 1000) + 10;
      const duration = 3600;
      endTime = startTime + duration;

      await encryptedVoting.connect(signers.owner).createProposal(
        "Test Proposal",
        "This is a test proposal",
        startTime,
        duration
      );

      proposalId = 0n;
    });

    it("Should not allow ending proposal before voting period ends", async function () {
      await expect(
        encryptedVoting.connect(signers.owner).endProposal(proposalId)
      ).to.be.revertedWith("Voting period has not ended");
    });

    it("Should allow ending proposal after voting period ends", async function () {
      // Wait for voting period to end
      await ethers.provider.send("evm_increaseTime", [endTime + 100]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        encryptedVoting.connect(signers.owner).endProposal(proposalId)
      ).to.emit(encryptedVoting, "ProposalEnded");
    });

    it("Should decrypt vote results correctly", async function () {
      // Wait for voting to start
      await ethers.provider.send("evm_increaseTime", [20]);
      await ethers.provider.send("evm_mine", []);

      const instance = getInstance();
      
      // Alice votes yes (1)
      const aliceVote = instance.encrypt32(1);
      const aliceProof = instance.generateProof(aliceVote);
      await encryptedVoting.connect(signers.alice).castVote(
        proposalId,
        aliceVote,
        aliceProof
      );

      // Bob votes no (0)
      const bobVote = instance.encrypt32(0);
      const bobProof = instance.generateProof(bobVote);
      await encryptedVoting.connect(signers.bob).castVote(
        proposalId,
        bobVote,
        bobProof
      );

      // Wait for voting period to end
      await ethers.provider.send("evm_increaseTime", [endTime + 100]);
      await ethers.provider.send("evm_mine", []);

      // End the proposal
      await encryptedVoting.connect(signers.owner).endProposal(proposalId);

      // Check results
      const [yesVotes, noVotes, isDecrypted] = await encryptedVoting.getVoteResults(proposalId);
      expect(isDecrypted).to.be.true;
      expect(yesVotes).to.equal(1n);
      expect(noVotes).to.equal(1n);
    });

    it("Should not allow non-owner to end proposal", async function () {
      // Wait for voting period to end
      await ethers.provider.send("evm_increaseTime", [endTime + 100]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        encryptedVoting.connect(signers.alice).endProposal(proposalId)
      ).to.be.revertedWith("Only owner can call this function");
    });
  });

  describe("Proposal Information", function () {
    it("Should return correct proposal information", async function () {
      const startTime = Math.floor(Date.now() / 1000) + 60;
      const duration = 3600;
      const endTime = startTime + duration;

      await encryptedVoting.connect(signers.owner).createProposal(
        "Test Proposal",
        "This is a test proposal",
        startTime,
        duration
      );

      const [title, description, propStartTime, propEndTime, isActive] = 
        await encryptedVoting.getProposal(0n);

      expect(title).to.equal("Test Proposal");
      expect(description).to.equal("This is a test proposal");
      expect(propStartTime).to.equal(BigInt(startTime));
      expect(propEndTime).to.equal(BigInt(endTime));
      expect(isActive).to.be.true;
    });

    it("Should revert for non-existent proposal", async function () {
      await expect(
        encryptedVoting.getProposal(999n)
      ).to.be.revertedWith("Proposal does not exist");
    });
  });
}); 