import { ethers } from "hardhat";
import { getInstance } from "@fhenix/fhevm";
import chalk from "chalk";

async function main() {
  console.log(chalk.blue("🎬 FHEVM Voting dApp Demo"));
  console.log(chalk.gray("=".repeat(50)));

  // Get signers
  const [owner, alice, bob, charlie] = await ethers.getSigners();
  
  console.log(chalk.green("👥 Demo Participants:"));
  console.log(`Owner: ${owner.address}`);
  console.log(`Alice: ${alice.address}`);
  console.log(`Bob: ${bob.address}`);
  console.log(`Charlie: ${charlie.address}\n`);

  // Deploy contract
  console.log(chalk.yellow("📦 Deploying EncryptedVoting contract..."));
  const EncryptedVoting = await ethers.getContractFactory("EncryptedVoting");
  const votingContract = await EncryptedVoting.deploy();
  await votingContract.waitForDeployment();
  
  const contractAddress = await votingContract.getAddress();
  console.log(chalk.green(`✅ Contract deployed at: ${contractAddress}\n`));

  // Create a proposal
  console.log(chalk.yellow("📝 Creating a demo proposal..."));
  const startTime = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
  const duration = 3600; // 1 hour
  
  const createTx = await votingContract.connect(owner).createProposal(
    "Demo Proposal: Should we implement FHEVM in our dApp?",
    "This is a demonstration proposal to showcase encrypted voting capabilities using Zama.ai's FHEVM technology.",
    startTime,
    duration
  );
  await createTx.wait();
  
  console.log(chalk.green("✅ Proposal created successfully!"));
  console.log(`Proposal ID: 0`);
  console.log(`Start Time: ${new Date(startTime * 1000).toLocaleString()}`);
  console.log(`End Time: ${new Date((startTime + duration) * 1000).toLocaleString()}\n`);

  // Wait for voting to start
  console.log(chalk.yellow("⏳ Waiting for voting to start..."));
  await ethers.provider.send("evm_increaseTime", [70]); // Wait 70 seconds
  await ethers.provider.send("evm_mine", []);
  console.log(chalk.green("✅ Voting period is now active!\n"));

  // Alice votes Yes (1)
  console.log(chalk.blue("🗳️ Alice is voting YES..."));
  const instance = getInstance();
  const aliceVote = instance.encrypt32(1);
  const aliceProof = instance.generateProof(aliceVote);
  
  const aliceTx = await votingContract.connect(alice).castVote(0, aliceVote, aliceProof);
  await aliceTx.wait();
  console.log(chalk.green("✅ Alice's encrypted vote submitted!"));

  // Bob votes No (0)
  console.log(chalk.blue("🗳️ Bob is voting NO..."));
  const bobVote = instance.encrypt32(0);
  const bobProof = instance.generateProof(bobVote);
  
  const bobTx = await votingContract.connect(bob).castVote(0, bobVote, bobProof);
  await bobTx.wait();
  console.log(chalk.green("✅ Bob's encrypted vote submitted!"));

  // Charlie votes Yes (1)
  console.log(chalk.blue("🗳️ Charlie is voting YES..."));
  const charlieVote = instance.encrypt32(1);
  const charlieProof = instance.generateProof(charlieVote);
  
  const charlieTx = await votingContract.connect(charlie).castVote(0, charlieVote, charlieProof);
  await charlieTx.wait();
  console.log(chalk.green("✅ Charlie's encrypted vote submitted!\n"));

  // Check voting status
  console.log(chalk.blue("🔍 Checking voting status..."));
  const aliceVoted = await votingContract.hasVoted(0, alice.address);
  const bobVoted = await votingContract.hasVoted(0, bob.address);
  const charlieVoted = await votingContract.hasVoted(0, charlie.address);
  
  console.log(`Alice voted: ${aliceVoted ? chalk.green("Yes") : chalk.red("No")}`);
  console.log(`Bob voted: ${bobVoted ? chalk.green("Yes") : chalk.red("No")}`);
  console.log(`Charlie voted: ${charlieVoted ? chalk.green("Yes") : chalk.red("No")}\n`);

  // Wait for voting period to end
  console.log(chalk.yellow("⏳ Waiting for voting period to end..."));
  await ethers.provider.send("evm_increaseTime", [duration + 100]); // Wait for end + buffer
  await ethers.provider.send("evm_mine", []);
  console.log(chalk.green("✅ Voting period has ended!\n"));

  // End proposal and decrypt results
  console.log(chalk.yellow("🔓 Ending proposal and decrypting results..."));
  const endTx = await votingContract.connect(owner).endProposal(0);
  await endTx.wait();
  console.log(chalk.green("✅ Proposal ended and results decrypted!\n"));

  // Display final results
  console.log(chalk.blue("📊 Final Voting Results:"));
  console.log(chalk.gray("=".repeat(30)));
  
  const [yesVotes, noVotes, isDecrypted] = await votingContract.getVoteResults(0);
  
  console.log(`Yes votes: ${yesVotes}`);
  console.log(`No votes: ${noVotes}`);
  console.log(`Total votes: ${Number(yesVotes) + Number(noVotes)}`);
  
  const total = Number(yesVotes) + Number(noVotes);
  if (total > 0) {
    const yesPercentage = ((Number(yesVotes) / total) * 100).toFixed(1);
    const noPercentage = ((Number(noVotes) / total) * 100).toFixed(1);
    console.log(`Yes: ${yesPercentage}% | No: ${noPercentage}%`);
  }
  
  console.log(`\n${Number(yesVotes) > Number(noVotes) ? chalk.green("🎉 Proposal PASSED!") : chalk.red("❌ Proposal FAILED!")}`);

  // Show proposal details
  console.log(chalk.blue("\n📄 Proposal Details:"));
  console.log(chalk.gray("=".repeat(30)));
  
  const [title, description, propStartTime, propEndTime, isActive] = 
    await votingContract.getProposal(0);
  
  console.log(`Title: ${title}`);
  console.log(`Description: ${description}`);
  console.log(`Status: ${isActive ? chalk.green("Active") : chalk.red("Ended")}`);
  console.log(`Start: ${new Date(Number(propStartTime) * 1000).toLocaleString()}`);
  console.log(`End: ${new Date(Number(propEndTime) * 1000).toLocaleString()}`);

  console.log(chalk.green("\n🎉 Demo completed successfully!"));
  console.log(chalk.blue("This demonstrates a complete privacy-preserving voting system using FHEVM."));
  console.log(chalk.gray("All votes were encrypted and remained private until the final decryption."));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(chalk.red("❌ Demo failed:"), error);
    process.exit(1);
  }); 