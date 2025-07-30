import { BrowserProvider, Contract, getAddress, JsonRpcSigner } from "ethers";
import { createInstance, FhevmInstance } from "fhevmjs";
import { CONTRACT_ADDRESS } from "./contract-address"; // Bu dosya deploy script'i tarafından oluşturulacak
import VotingABI from "../artifacts/contracts/Voting.sol/Voting.json";

let instance: FhevmInstance;
let provider: BrowserProvider;
let signer: JsonRpcSigner;
let contract: Contract;

// UI Elements
const connectButton = document.getElementById("connectButton")!;
const dappDiv = document.getElementById("dapp")!;
const walletAddressSpan = document.getElementById("walletAddress")!;
const voteButton = document.getElementById("voteButton")!;
const ownerSection = document.getElementById("ownerSection")!;
const revealButtonA = document.getElementById("revealButtonA")!;
const revealButtonB = document.getElementById("revealButtonB")!;
const statusDiv = document.getElementById("status")!;
const resultsDiv = document.getElementById("results")!;

const initFhevm = async () => {
  const network = await provider.getNetwork();
  const chainId = +network.chainId.toString();

  // FHEVM instance'ını başlat
  const publicKey = await provider.call({
    to: "0x000000000000000000000000000000000000005d",
    data: "0xd9d47bb0",
  });
  instance = await createInstance({ chainId, publicKey });
  console.log("FHEVM instance initialized.");
};

const connectWallet = async () => {
  if (!(window as any).ethereum) {
    alert("Please install MetaMask!");
    return;
  }
  provider = new BrowserProvider((window as any).ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  const userAddress = await signer.getAddress();

  await initFhevm();

  contract = new Contract(CONTRACT_ADDRESS, VotingABI.abi, signer);

  // FHE için izin token'ı oluştur ve imzala
  const { token } = instance.generateToken({
    verifyingContract: getAddress(CONTRACT_ADDRESS),
  });
  const signature = await signer.signTypedData(token.domain, { Reencrypt: token.types.Reencrypt }, token.message);
  instance.setTokenSignature(CONTRACT_ADDRESS, signature);
  console.log("FHE token signature set.");

  // UI'ı güncelle
  connectButton.classList.add("hidden");
  dappDiv.classList.remove("hidden");
  walletAddressSpan.innerText = `Connected: ${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`;

  // Kullanıcı kontrat sahibi mi kontrol et
  const owner = await contract.owner();
  if (owner.toLowerCase() === userAddress.toLowerCase()) {
    ownerSection.classList.remove("hidden");
  }

  await updateResultsDisplay();
};

const updateStatus = (text: string, isError = false) => {
  statusDiv.innerText = `Status: ${text}`;
  statusDiv.style.color = isError ? 'red' : 'black';
};

const updateResultsDisplay = async () => {
  try {
    // Kontrattaki deşifre edilmiş sonuçları oku
    const resultA = await contract.results(0);
    const resultB = await contract.results(1);
    resultsDiv.innerHTML = `
      <strong>Current Results:</strong><br>
      Candidate A: ${resultA.toString()}<br>
      Candidate B: ${resultB.toString()}
    `;
  } catch (e) {
    console.error("Error updating results display", e);
    resultsDiv.innerText = "Could not fetch results.";
  }
};

const vote = async () => {
  const selectedCandidateInput = document.querySelector<HTMLInputElement>('input[name="candidate"]:checked');
  if (!selectedCandidateInput) {
    alert("Please select a candidate!");
    return;
  }
  const candidateId = parseInt(selectedCandidateInput.value, 10);

  try {
    updateStatus("Encrypting your vote...");
    voteButton.setAttribute("disabled", "true");

    // 1 değerini 32-bit'lik şifreli bir sayıya dönüştür
    const encryptedVote = instance.encrypt32(1);

    updateStatus("Sending transaction...");
    // Şifreli oyu kontrata gönder
    const tx = await contract.vote(candidateId, encryptedVote);
    
    updateStatus("Waiting for transaction confirmation...");
    await tx.wait();

    updateStatus("Vote cast successfully!");
    (document.getElementById("votingSection") as HTMLElement).innerHTML = "<h3>Thank you for voting!</h3>";

  } catch (e) {
    console.error(e);
    updateStatus(`Error: ${(e as Error).message}`, true);
    voteButton.removeAttribute("disabled");
  }
};

const revealResult = async (candidateId: number) => {
  const button = candidateId === 0 ? revealButtonA : revealButtonB;
  try {
    updateStatus(`Revealing results for Candidate ${candidateId === 0 ? 'A' : 'B'}...`);
    button.setAttribute("disabled", "true");

    const tx = await contract.revealResult(candidateId);
    
    updateStatus("Waiting for transaction confirmation...");
    await tx.wait();

    updateStatus(`Results for Candidate ${candidateId === 0 ? 'A' : 'B'} revealed!`);
    await updateResultsDisplay();
    button.removeAttribute("disabled");

  } catch (e) {
    console.error(e);
    updateStatus(`Error revealing results: ${(e as Error).message}`, true);
    button.removeAttribute("disabled");
  }
};

// Ana olay dinleyicileri
document.addEventListener("DOMContentLoaded", () => {
  connectButton.addEventListener("click", connectWallet);
  voteButton.addEventListener("click", vote);
  revealButtonA.addEventListener("click", () => revealResult(0));
  revealButtonB.addEventListener("click", () => revealResult(1));
});