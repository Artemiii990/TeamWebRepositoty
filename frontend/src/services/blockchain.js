import { ethers } from "ethers";
import gatewayArtifact from "../contracts/CryptoPaymentGateway.json";
import registryArtifact from "../contracts/UserRegistry.json";
import {
  CONTRACT_ADDRESS,
  REGISTRY_ADDRESS,
  CHAIN_ID,
  CHAIN_ID_HEX,
  CHAIN_NAME,
  NATIVE_CURRENCY_SYMBOL,
  RPC_URL,
  isContractConfigured,
  isRegistryConfigured,
} from "../config";

// All direct MetaMask + ethers.js calls live in this one file, 
// so every other file talks to the chain through these functions instead of touching window.ethereum or ethers.Contract directly.

export const GATEWAY_ABI = gatewayArtifact.abi;
export const REGISTRY_ABI = registryArtifact.abi;

export const OnChainInvoiceStatus = {
  0: "WAITING_PAYMENT",
  1: "PAID",
};

// Mirrors `enum UserRole` in User.sol.
export const OnChainUserRole = {
  0: "NONE",
  1: "MERCHANT",
  2: "CUSTOMER",
};
export const UserRoleValue = { MERCHANT: 1, CUSTOMER: 2 };

export class WalletError extends Error {}

// Throws a friendly error early if the MetaMask extension isn't present
function assertMetaMask() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new WalletError(
      "MetaMask was not detected. Install the MetaMask extension and reload the page."
    );
  }
}

/** Opens the MetaMask account picker and returns the connected address. */
export async function connectWallet() {
  assertMetaMask();

  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);

  if (!accounts || accounts.length === 0) {
    throw new WalletError("No account was authorized in MetaMask.");
  }

  const network = await provider.getNetwork();

  return {
    address: ethers.getAddress(accounts[0]),
    chainId: Number(network.chainId),
  };
}

/** Reads the currently authorized account without opening a popup. */
export async function getConnectedAccount() {
  if (typeof window === "undefined" || !window.ethereum) return null;

  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_accounts", []);

  if (!accounts || accounts.length === 0) return null;

  const network = await provider.getNetwork();

  return {
    address: ethers.getAddress(accounts[0]),
    chainId: Number(network.chainId),
  };
}

export function isCorrectNetwork(chainId) {
  return Number(chainId) === CHAIN_ID;
}

/** Asks MetaMask to switch to the configured chain, adding it first if needed. */
export async function switchToConfiguredNetwork() {
  assertMetaMask();

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (switchError) {
    // 4902 = chain not yet added to this wallet
    if (switchError?.code === 4902) {
      if (!RPC_URL) {
        throw new WalletError(
          `Switch MetaMask to ${CHAIN_NAME} (chain id ${CHAIN_ID}) manually - no RPC URL is configured to add it automatically.`
        );
      }

      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_ID_HEX,
            chainName: CHAIN_NAME,
            nativeCurrency: {
              name: NATIVE_CURRENCY_SYMBOL,
              symbol: NATIVE_CURRENCY_SYMBOL,
              decimals: 18,
            },
            rpcUrls: [RPC_URL],
          },
        ],
      });
    } else if (switchError?.code === 4001) {
      throw new WalletError("Network switch was rejected in MetaMask.");
    } else {
      throw switchError;
    }
  }
}

// Grabs a signer (the account that will pay gas + sign the transaction)
// from whichever account MetaMask currently has connected.
async function getSigner() {
  assertMetaMask();
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

// Read-only provider used for view calls that should work even before a wallet is connected 
// (falls back to a plain RPC connection if there's no injected wallet at all).
function getReadProvider() {
  if (window.ethereum) return new ethers.BrowserProvider(window.ethereum);
  if (RPC_URL) return new ethers.JsonRpcProvider(RPC_URL);
  return null;
}

function friendlyEthersError(error) {
  if (error?.code === "ACTION_REJECTED") {
    return new WalletError("Transaction was rejected in MetaMask.");
  }
  if (error?.code === "INSUFFICIENT_FUNDS") {
    return new WalletError("Wallet does not have enough ETH to cover the amount + gas.");
  }
  const reason = error?.shortMessage || error?.reason || error?.message;
  return new WalletError(reason || "The transaction failed.");
}

// CryptoPaymentGateway (invoices + admin controls) 

function assertGatewayConfigured() {
  if (!isContractConfigured()) {
    throw new WalletError(
      "Gateway contract address is not configured yet (VITE_CONTRACT_ADDRESS is empty)."
    );
  }
}

// Builds a contract instance that can send transactions (createInvoice,
// payInvoice, pause, unpause, transferAdmin, emergencyWithdraw) - anything
// that costs gas needs this instead of the read-only version below.
async function getGatewayWithSigner() {
  assertGatewayConfigured();
  const signer = await getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, GATEWAY_ABI, signer);
}

// Read-only version for view calls (getInvoice, admin(), paused(), etc.) -
// works without a connected wallet as long as an RPC URL is configured.
function getGatewayReadOnly() {
  assertGatewayConfigured();
  const provider = getReadProvider();
  if (!provider) throw new WalletError("No wallet or RPC URL available to read from the chain.");
  return new ethers.Contract(CONTRACT_ADDRESS, GATEWAY_ABI, provider);
}

// Finds a named event log inside a transaction receipt. 
function findEventInReceipt(receipt, iface, eventName) {
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === eventName) return parsed;
    } catch {
      // Not a log this ABI recognizes (could belong to another contract) - skip it.
    }
  }
  return null;
}

//Creates the invoice on-chain
export async function createInvoiceOnChain(amountWei, description) {
  try {
    const contract = await getGatewayWithSigner();
    const tx = await contract.createInvoice(amountWei, description);
    const receipt = await tx.wait();

    if (receipt.status !== 1) throw new WalletError("Transaction was mined but reverted.");

    const event = findEventInReceipt(receipt, contract.interface, "InvoiceCreated");
    const blockchainInvoiceId = event ? event.args.invoiceId.toString() : null;

    return { hash: receipt.hash, blockchainInvoiceId };
  } catch (error) {
    if (error instanceof WalletError) throw error;
    throw friendlyEthersError(error);
  }
}

// Pays an invoice on-chain. Requires the connected wallet to already be a registered, active CUSTOMER.
export async function payInvoiceOnChain(blockchainInvoiceId, amountWei) {
  try {
    const contract = await getGatewayWithSigner();
    const tx = await contract.payInvoice(blockchainInvoiceId, { value: amountWei });
    const receipt = await tx.wait();

    if (receipt.status !== 1) throw new WalletError("Transaction was mined but reverted.");

    return { hash: receipt.hash, receipt };
  } catch (error) {
    if (error instanceof WalletError) throw error;
    throw friendlyEthersError(error);
  }
}

/** Read-only lookup straight from the chain, used as a cross-check / fallback. */
export async function getInvoiceOnChain(blockchainInvoiceId) {
  const contract = getGatewayReadOnly();
  const result = await contract.getInvoice(blockchainInvoiceId);

  // Field order matters here - it matches the *current* struct layout
  // (invoiceId, merchant, customer, amount, description, timestamp, status).
  return {
    invoiceId: result.invoiceId.toString(),
    merchant: result.merchant,
    customer: result.customer,
    amount: result.amount.toString(),
    description: result.description,
    timestamp: Number(result.timestamp),
    status: OnChainInvoiceStatus[Number(result.status)] || "UNKNOWN",
  };
}

/** Who currently holds admin rights on the gateway contract. */
export async function getContractAdmin() {
  return getGatewayReadOnly().admin();
}

/** Whether createInvoice()/payInvoice() are currently frozen. */
export async function getContractPaused() {
  return getGatewayReadOnly().paused();
}

/** Current ETH balance sitting in the contract (should normally be ~0, since payments forward straight to the merchant). */
export async function getContractBalance() {
  return (await getGatewayReadOnly().getContractBalance()).toString();
}

/** Admin-only: freezes createInvoice()/payInvoice(). */
export async function pauseContract() {
  try {
    const contract = await getGatewayWithSigner();
    const receipt = await (await contract.pause()).wait();
    if (receipt.status !== 1) throw new WalletError("Transaction was mined but reverted.");
    return receipt.hash;
  } catch (error) {
    if (error instanceof WalletError) throw error;
    throw friendlyEthersError(error);
  }
}

/** Admin-only: unfreezes the contract again. */
export async function unpauseContract() {
  try {
    const contract = await getGatewayWithSigner();
    const receipt = await (await contract.unpause()).wait();
    if (receipt.status !== 1) throw new WalletError("Transaction was mined but reverted.");
    return receipt.hash;
  } catch (error) {
    if (error instanceof WalletError) throw error;
    throw friendlyEthersError(error);
  }
}

/** Admin-only: hands admin rights to a different wallet. */
export async function transferAdminOnChain(newAdminAddress) {
  try {
    const contract = await getGatewayWithSigner();
    const receipt = await (await contract.transferAdmin(newAdminAddress)).wait();
    if (receipt.status !== 1) throw new WalletError("Transaction was mined but reverted.");
    return receipt.hash;
  } catch (error) {
    if (error instanceof WalletError) throw error;
    throw friendlyEthersError(error);
  }
}

/** Admin-only: pulls ETH that's stuck in the contract back to the admin wallet. */
export async function emergencyWithdrawOnChain(amountWei) {
  try {
    const contract = await getGatewayWithSigner();
    const receipt = await (await contract.emergencyWithdraw(amountWei)).wait();
    if (receipt.status !== 1) throw new WalletError("Transaction was mined but reverted.");
    return receipt.hash;
  } catch (error) {
    if (error instanceof WalletError) throw error;
    throw friendlyEthersError(error);
  }
}

// UserRegistry (on-chain identity: who is a Merchant/Customer)

function assertRegistryConfigured() {
  if (!isRegistryConfigured()) {
    throw new WalletError(
      "UserRegistry address is not configured yet (VITE_REGISTRY_ADDRESS is empty)."
    );
  }
}

async function getRegistryWithSigner() {
  assertRegistryConfigured();
  const signer = await getSigner();
  return new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
}

function getRegistryReadOnly() {
  assertRegistryConfigured();
  const provider = getReadProvider();
  if (!provider) throw new WalletError("No wallet or RPC URL available to read from the chain.");
  return new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
}

/**
 * Registers the connected wallet as a Merchant or Customer. `role` must be
 * UserRoleValue.MERCHANT or UserRoleValue.CUSTOMER. This is the "sign up"
 * step of the whole app - after this transaction is mined, the wallet is
 * allowed to call createInvoice()/payInvoice() on the gateway contract.
 */
export async function registerUserOnChain(name, role) {
  try {
    const contract = await getRegistryWithSigner();
    const tx = await contract.registerUser(name, role);
    const receipt = await tx.wait();
    if (receipt.status !== 1) throw new WalletError("Transaction was mined but reverted.");
    return receipt.hash;
  } catch (error) {
    if (error instanceof WalletError) throw error;
    throw friendlyEthersError(error);
  }
}

/** Read-only lookup of a wallet's on-chain registration, straight from the registry. */
export async function getUserFromChain(wallet) {
  const contract = getRegistryReadOnly();
  const exists = await contract.userExists(wallet);
  if (!exists) return null;

  const result = await contract.getUser(wallet);
  return {
    wallet: result.wallet,
    name: result.name,
    role: OnChainUserRole[Number(result.role)] || "NONE",
    active: result.active,
  };
}

/** Admin-only: deactivates a Merchant/Customer, blocking their onlyMerchant/onlyCustomer calls. */
export async function deactivateUserOnChain(wallet) {
  try {
    const contract = await getRegistryWithSigner();
    const receipt = await (await contract.deactivateUser(wallet)).wait();
    if (receipt.status !== 1) throw new WalletError("Transaction was mined but reverted.");
    return receipt.hash;
  } catch (error) {
    if (error instanceof WalletError) throw error;
    throw friendlyEthersError(error);
  }
}

/** Admin-only: re-activates a previously deactivated Merchant/Customer. */
export async function activateUserOnChain(wallet) {
  try {
    const contract = await getRegistryWithSigner();
    const receipt = await (await contract.activateUser(wallet)).wait();
    if (receipt.status !== 1) throw new WalletError("Transaction was mined but reverted.");
    return receipt.hash;
  } catch (error) {
    if (error instanceof WalletError) throw error;
    throw friendlyEthersError(error);
  }
}

export { ethers };