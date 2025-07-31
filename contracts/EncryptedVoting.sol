// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhenix/contracts/FHE.sol";

/// @title Encrypted Voting Contract
/// @notice A privacy-preserving voting system using FHEVM
/// @dev This contract allows users to vote on proposals with encrypted votes
contract EncryptedVoting {
    using FHE for *;

    // Structs
    struct Proposal {
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        euint32 encryptedYesVotes;
        euint32 encryptedNoVotes;
        mapping(address => bool) hasVoted;
    }

    struct VoteResult {
        uint32 yesVotes;
        uint32 noVotes;
        bool isDecrypted;
    }

    // State variables
    address public owner;
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => VoteResult) public voteResults;
    
    // Events
    event ProposalCreated(uint256 indexed proposalId, string title, uint256 startTime, uint256 endTime);
    event VoteCast(uint256 indexed proposalId, address indexed voter);
    event VoteDecrypted(uint256 indexed proposalId, uint32 yesVotes, uint32 noVotes);
    event ProposalEnded(uint256 indexed proposalId);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier proposalExists(uint256 proposalId) {
        require(proposalId < proposalCount, "Proposal does not exist");
        _;
    }

    modifier proposalActive(uint256 proposalId) {
        require(proposals[proposalId].isActive, "Proposal is not active");
        require(block.timestamp >= proposals[proposalId].startTime, "Voting has not started");
        require(block.timestamp <= proposals[proposalId].endTime, "Voting has ended");
        _;
    }

    modifier hasNotVoted(uint256 proposalId) {
        require(!proposals[proposalId].hasVoted[msg.sender], "Already voted on this proposal");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Create a new voting proposal
    /// @param title The title of the proposal
    /// @param description The description of the proposal
    /// @param startTime When voting starts (timestamp)
    /// @param duration Duration of voting in seconds
    function createProposal(
        string memory title,
        string memory description,
        uint256 startTime,
        uint256 duration
    ) external onlyOwner {
        require(startTime > block.timestamp, "Start time must be in the future");
        require(duration > 0, "Duration must be greater than 0");

        uint256 proposalId = proposalCount;
        Proposal storage proposal = proposals[proposalId];
        
        proposal.title = title;
        proposal.description = description;
        proposal.startTime = startTime;
        proposal.endTime = startTime + duration;
        proposal.isActive = true;
        proposal.encryptedYesVotes = FHE.asEuint32(0);
        proposal.encryptedNoVotes = FHE.asEuint32(0);

        proposalCount++;

        emit ProposalCreated(proposalId, title, startTime, proposal.endTime);
    }

    /// @notice Cast an encrypted vote on a proposal
    /// @param proposalId The ID of the proposal to vote on
    /// @param encryptedVote The encrypted vote (1 for yes, 0 for no)
    /// @param voteProof The proof for the encrypted vote
    function castVote(
        uint256 proposalId,
        bytes calldata encryptedVote,
        bytes calldata voteProof
    ) external proposalExists(proposalId) proposalActive(proposalId) hasNotVoted(proposalId) {
        Proposal storage proposal = proposals[proposalId];
        
        // Mark that this user has voted
        proposal.hasVoted[msg.sender] = true;

        // Convert the encrypted vote to euint32
        euint32 vote = FHE.fromExternal(encryptedVote, voteProof);

        // Add the vote to the appropriate counter
        // If vote == 1, add to yes votes, otherwise add to no votes
        euint32 one = FHE.asEuint32(1);
        euint32 zero = FHE.asEuint32(0);
        
        // Check if vote is 1 (yes) or 0 (no)
        ebool isYes = FHE.eq(vote, one);
        ebool isNo = FHE.eq(vote, zero);
        
        // Add to yes votes if vote is 1
        proposal.encryptedYesVotes = FHE.add(
            proposal.encryptedYesVotes,
            FHE.select(isYes, one, zero)
        );
        
        // Add to no votes if vote is 0
        proposal.encryptedNoVotes = FHE.add(
            proposal.encryptedNoVotes,
            FHE.select(isNo, one, zero)
        );

        // Allow the contract to access the encrypted vote counts
        FHE.allowThis(proposal.encryptedYesVotes);
        FHE.allowThis(proposal.encryptedNoVotes);
        
        // Allow the voter to access the encrypted vote counts
        FHE.allow(proposal.encryptedYesVotes, msg.sender);
        FHE.allow(proposal.encryptedNoVotes, msg.sender);

        emit VoteCast(proposalId, msg.sender);
    }

    /// @notice End a proposal and decrypt the results (only owner)
    /// @param proposalId The ID of the proposal to end
    function endProposal(uint256 proposalId) external onlyOwner proposalExists(proposalId) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.isActive, "Proposal is already ended");
        require(block.timestamp > proposal.endTime, "Voting period has not ended");

        proposal.isActive = false;

        // Decrypt the vote counts
        uint32 yesVotes = FHE.decrypt(proposal.encryptedYesVotes);
        uint32 noVotes = FHE.decrypt(proposal.encryptedNoVotes);

        // Store the decrypted results
        voteResults[proposalId] = VoteResult({
            yesVotes: yesVotes,
            noVotes: noVotes,
            isDecrypted: true
        });

        emit VoteDecrypted(proposalId, yesVotes, noVotes);
        emit ProposalEnded(proposalId);
    }

    /// @notice Get proposal information
    /// @param proposalId The ID of the proposal
    /// @return title The title of the proposal
    /// @return description The description of the proposal
    /// @return startTime When voting starts
    /// @return endTime When voting ends
    /// @return isActive Whether the proposal is active
    function getProposal(uint256 proposalId) 
        external 
        view 
        proposalExists(proposalId) 
        returns (
            string memory title,
            string memory description,
            uint256 startTime,
            uint256 endTime,
            bool isActive
        ) 
    {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.title,
            proposal.description,
            proposal.startTime,
            proposal.endTime,
            proposal.isActive
        );
    }

    /// @notice Get vote results for a proposal
    /// @param proposalId The ID of the proposal
    /// @return yesVotes Number of yes votes
    /// @return noVotes Number of no votes
    /// @return isDecrypted Whether the results have been decrypted
    function getVoteResults(uint256 proposalId) 
        external 
        view 
        proposalExists(proposalId) 
        returns (uint32 yesVotes, uint32 noVotes, bool isDecrypted) 
    {
        VoteResult storage result = voteResults[proposalId];
        return (result.yesVotes, result.noVotes, result.isDecrypted);
    }

    /// @notice Check if a user has voted on a proposal
    /// @param proposalId The ID of the proposal
    /// @param voter The address of the voter
    /// @return hasVoted Whether the user has voted
    function hasVoted(uint256 proposalId, address voter) 
        external 
        view 
        proposalExists(proposalId) 
        returns (bool hasVoted) 
    {
        return proposals[proposalId].hasVoted[voter];
    }

    /// @notice Get the total number of proposals
    /// @return count The total number of proposals
    function getProposalCount() external view returns (uint256 count) {
        return proposalCount;
    }

    /// @notice Get encrypted vote counts for a proposal (for verification)
    /// @param proposalId The ID of the proposal
    /// @return encryptedYesVotes The encrypted yes vote count
    /// @return encryptedNoVotes The encrypted no vote count
    function getEncryptedVoteCounts(uint256 proposalId) 
        external 
        view 
        proposalExists(proposalId) 
        returns (euint32 encryptedYesVotes, euint32 encryptedNoVotes) 
    {
        Proposal storage proposal = proposals[proposalId];
        return (proposal.encryptedYesVotes, proposal.encryptedNoVotes);
    }
} 