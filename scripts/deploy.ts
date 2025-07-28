// scripts/deploy.ts

// import { ethers } from "hardhat"; // BU SATIRI SİLİNDİ

async function main() {
  // Oylama adaylarını burada tanımlayın
  const candidateNames = ["Alice", "Bob", "Charlie"];

  // FHEVoting sözleşme factory'sini al
  // ethers objesine Hardhat ortamında global olarak erişilebilir olmalıdır
  const FHEVoting = await ethers.getContractFactory("FHEVoting"); // ethers burada global olarak kullanılacak

  // Sözleşmeyi aday isimleriyle dağıt
  const fheVoting = await FHEVoting.deploy(candidateNames);
  await fheVoting.waitForDeployment(); // Dağıtımın tamamlanmasını bekle

  const contractAddress = await fheVoting.getAddress();
  console.log(`FHEVoting contract deployed to: ${contractAddress}`);

  // Dağıtılan sözleşme adresini not alın.
  // Bu adres, frontend'de kullanılacaktır.
}

// async fonksiyonunu çağır ve hataları yakala
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});