// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@fhenixprotocol/contracts/FHE.sol";
import "@fhenixprotocol/contracts/FHEUser.sol";

contract Voting is FHEUser {
    // Şifreli toplam oylar
    euint32 private yesVotes;
    euint32 private noVotes;

    // Oy kullananları takip etmek için
    mapping(address => bool) public hasVoted;

    // Oy kullanma fonksiyonu
    function vote(ebool memory encryptedVote) public {
        require(!hasVoted[msg.sender], "You have already voted.");

        // encryptedVote == true ise yesVotes++; değilse noVotes++;
        ebool memory isYes = encryptedVote;
        ebool memory isNo = FHE.not(encryptedVote);

        yesVotes = FHE.add(yesVotes, FHE.asEuint32(isYes));
        noVotes = FHE.add(noVotes, FHE.asEuint32(isNo));

        hasVoted[msg.sender] = true;
    }

    // Şifreli oyları getirme (sadece frontend decrypt edebilir)
    function getEncryptedYesVotes() public view returns (euint32 memory) {
        return yesVotes;
    }

    function getEncryptedNoVotes() public view returns (euint32 memory) {
        return noVotes;
    }
}
