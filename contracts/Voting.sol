// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@fhenixprotocol/contracts/FHE.sol";

contract Voting {
    // Şifreli toplam oylar
    euint32 private yesVotes;
    euint32 private noVotes;

    mapping(address => bool) public hasVoted;

    function vote(ebool encryptedVote) public {
        require(!hasVoted[msg.sender], "Already voted");

        ebool isYes = encryptedVote;
        ebool isNo = FHE.not(encryptedVote);

        yesVotes = FHE.add(yesVotes, FHE.asEuint32(isYes));
        noVotes = FHE.add(noVotes, FHE.asEuint32(isNo));

        hasVoted[msg.sender] = true;
    }

    function getEncryptedYesVotes() public view returns (euint32) {
        return yesVotes;
    }

    function getEncryptedNoVotes() public view returns (euint32) {
        return noVotes;
    }
}
