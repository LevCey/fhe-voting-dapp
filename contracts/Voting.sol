// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { euint32, FHE, SepoliaConfig } from "@fhevm/solidity/contracts/FHE.sol";
import { Permissions } from "@fhevm/solidity/contracts/Permissions.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract Voting is SepoliaConfig {
    mapping(string => euint32) private votes;
    string[] public candidates;

    constructor(string[] memory _candidates) {
        for (uint i = 0; i < _candidates.length; i++) {
            candidates.push(_candidates[i]);
            votes[_candidates[i]] = FHE.asEuint32(0);
        }
    }

    function vote(string memory candidate, euint32 encryptedVote) public {
        votes[candidate] = votes[candidate].add(encryptedVote);
    }

    function getEncryptedVote(string memory candidate) public view returns (euint32) {
        return votes[candidate];
    }
}
