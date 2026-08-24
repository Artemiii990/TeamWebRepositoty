import { ethers } from "ethers";

// Поки що адреса контракту порожня. У майбутньому треба вставити сюди його адресу.
export const CONTRACT_ADDRESS = "";

// Поки що ABI мінімальний.
// Після отримання готового контракту треба замінити його на справжній ABI.
export const CONTRACT_ABI = [
  "function createInvoice(uint256 amount) external",
  "function payInvoice(uint256 invoiceId) external payable",
  "function getInvoice(uint256 invoiceId) external view returns (uint256 invoiceId, address merchant, address customer, uint256 amount, uint256 timestamp, uint8 status)",
];


// Підключення MetaMask
export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  await provider.send("eth_requestAccounts", []);

  const signer = await provider.getSigner();

  const address = await signer.getAddress();

  return {
    provider,
    signer,
    address,
  };
}


// Отримання contract instance
export async function getContract() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  if (!CONTRACT_ADDRESS) {
    throw new Error("Contract address is not set yet");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  const signer = await provider.getSigner();

  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    signer
  );

  return contract;
}


// Оплата invoice
export async function payInvoice(invoiceId, amount) {
  const contract = await getContract();

  const transaction = await contract.payInvoice(invoiceId, {
    value: ethers.parseEther(amount.toString()),
  });

  return transaction;
}