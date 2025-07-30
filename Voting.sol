// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/FHE.sol";

contract Voting {
    address public owner;

    // Aday ID'sinden şifreli oy sayısına eşleme
    mapping(uint256 => euint32) private encryptedVotes;
    // Deşifre edilmiş sonuçları saklamak için eşleme
    mapping(uint256 => uint32) public results;
    // Herkesin bir kez oy kullanmasını sağlamak için
    mapping(address => bool) public hasVoted;

    // Bu demo için iki aday
    uint256 public constant CANDIDATE_A = 0;
    uint256 public constant CANDIDATE_B = 1;

    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event ResultsRevealed(uint256 indexed candidateId, uint32 count);

    constructor() {
        owner = msg.sender;
        // Başlangıçta şifreli oy sayılarını 0'ın şifrelenmiş haline ayarla
        encryptedVotes[CANDIDATE_A] = FHE.asEuint32(0);
        encryptedVotes[CANDIDATE_B] = FHE.asEuint32(0);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    // Belirli bir adaya oy vermek için fonksiyon
    // Girdi, 1'in şifrelenmiş halidir (euint32)
    function vote(uint256 candidateId, bytes calldata encryptedVote) public {
        require(candidateId == CANDIDATE_A || candidateId == CANDIDATE_B, "Invalid candidate");
        require(!hasVoted[msg.sender], "You have already voted");

        // Girdiyi bir euint32'ye dönüştür
        euint32 encryptedValue = TFHE.asEuint32(encryptedVote);

        // Şifreli oyu (1) adayın toplamına homomorfik olarak ekle
        encryptedVotes[candidateId] = FHE.add(encryptedVotes[candidateId], encryptedValue);

        hasVoted[msg.sender] = true;
        emit VoteCast(msg.sender, candidateId);
    }

    // Belirli bir adayın oylarını açıklamak için fonksiyon
    // Sadece kontrat sahibi tarafından çağrılabilir
    function revealResult(uint256 candidateId) public onlyOwner {
        require(candidateId == CANDIDATE_A || candidateId == CANDIDATE_B, "Invalid candidate");

        // Adayın toplam oylarını deşifre et ve sakla
        uint32 decryptedResult = TFHE.decrypt(encryptedVotes[candidateId]);
        results[candidateId] = decryptedResult;

        emit ResultsRevealed(candidateId, decryptedResult);
    }
}