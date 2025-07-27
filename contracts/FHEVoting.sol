// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title A FHE-enabled Voting contract
/// @dev This contract allows users to vote privately using FHE.
/// The votes are encrypted on-chain, and only the final result can be decrypted by authorized parties.
contract FHEVoting is SepoliaConfig {
    address public immutable owner; // Sözleşme sahibi
    string[] public candidates; // Adayların isimleri
    mapping(uint256 => euint32) public candidateVotes; // Aday ID'sine göre şifreli oylar
    mapping(address => bool) public hasVoted; // Bir kullanıcının oy kullanıp kullanmadığını kontrol eder

    bool public votingOpen; // Oylama açık mı kapalı mı?

    // Etkinlikler
    event VotingStarted();
    event VotingEnded();
    event Voted(address voter, uint256 candidateId);
    event CandidateAdded(uint256 candidateId, string name);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function.");
        _;
    }

    modifier onlyDuringVoting() {
        require(votingOpen, "Voting is not open.");
        _;
    }

    modifier onlyWhenVotingClosed() {
        require(!votingOpen, "Voting is still open.");
        _;
    }

    constructor(string[] memory _candidates) {
        owner = msg.sender;
        candidates = _candidates;
        votingOpen = false; // Başlangıçta oylama kapalı
        // Her aday için oy sayısını başlangıçta 0x0 (uninitialized) olarak bırakırız.
        // İlk oy geldiğinde initialize edilecek.
    }

    /// @notice Adayları ekler. Sadece sahip yapabilir.
    function addCandidate(string memory _name) external onlyOwner {
        candidates.push(_name);
        emit CandidateAdded(candidates.length - 1, _name);
    }

    /// @notice Oylamayı başlatır. Sadece sahip yapabilir.
    function startVoting() external onlyOwner {
        require(!votingOpen, "Voting is already open.");
        votingOpen = true;
        emit VotingStarted();
    }

    /// @notice Oylamayı bitirir. Sadece sahip yapabilir.
    function endVoting() external onlyOwner {
        require(votingOpen, "Voting is not open.");
        votingOpen = false;
        emit VotingEnded();
    }

    /// @notice Kullanıcının şifreli bir oyu belirli bir adaya vermesini sağlar.
    /// @param _candidateId Oy verilecek adayın ID'si.
    /// @param _encryptedVote Şifreli oy değeri (genellikle 1).
    /// @param _inputProof Şifreli değerin geçerliliğini kanıtlayan ZKProof.
    function vote(
        uint256 _candidateId,
        externalEuint32 _encryptedVote,
        bytes calldata _inputProof
    ) external onlyDuringVoting {
        require(_candidateId < candidates.length, "Invalid candidate ID.");
        require(!hasVoted[msg.sender], "You have already voted.");

        // Şifreli oyu externalEuint32'den euint32'ye dönüştür
        euint32 voteValue = FHE.fromExternal(_encryptedVote, _inputProof);

        // Eğer aday için oy sayacı başlatılmamışsa, şimdi başlat.
        // Başlatılmamış bir euint32'ye doğrudan euint32 atayabiliriz.
        if (!FHE.isInitialized(candidateVotes[_candidateId])) {
                candidateVotes[_candidateId] = voteValue; // Doğrudan atama yapın
        } else {
                // Mevcut şifreli oyu artır
                candidateVotes[_candidateId] = FHE.add(candidateVotes[_candidateId], voteValue);
        }

        hasVoted[msg.sender] = true;

        // Oy sayacına hem sözleşmenin hem de oy verenin erişim izni vermesini sağlar.
        // Bu, oy verenin daha sonra kendi oy sonucunu (eğer izin verilirse) deşifre etmesini sağlar.
        // Genellikle sadece sözleşme sahibine nihai sonucu deşifre etme izni verilir.
        FHE.allowThis(candidateVotes[_candidateId]);
        FHE.allow(candidateVotes[_candidateId], msg.sender); // Kullanıcının oyuna erişim izni

        emit Voted(msg.sender, _candidateId);
    }

    /// @notice Bir adayın mevcut şifreli oy sayısını döndürür.
    /// @param _candidateId Oyları alınacak adayın ID'si.
    /// @return Belirli adayın şifreli oy sayısı.
    function getEncryptedVotes(uint256 _candidateId) external view returns (euint32) {
        require(_candidateId < candidates.length, "Invalid candidate ID.");
        return candidateVotes[_candidateId];
    }

    /// @notice Toplam aday sayısını döndürür.
    function getCandidatesCount() external view returns (uint256) {
        return candidates.length;
    }

    /// @notice Bir adayın ismini döndürür.
    function getCandidateName(uint256 _candidateId) external view returns (string memory) {
        require(_candidateId < candidates.length, "Invalid candidate ID.");
        return candidates[_candidateId];
    }

    /// @notice Kullanıcının oy kullanıp kullanmadığını döndürür.
    function getHasVoted(address _user) external view returns (bool) {
        return hasVoted[_user];
    }
}