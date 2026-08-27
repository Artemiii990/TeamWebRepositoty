import { ethers } from "ethers";
import { BLOCK_EXPLORER_URL } from "../config";

// Turns a full "0xABCD...1234" address into "0xABCD...1234" (first `chars` hex digits + last `chars`), so tables/cards don't get blown out wide.
export function shortenAddress(address, chars = 4) {
  if (!address) return "";
  return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
}

// Same idea as shortenAddress but for tx hashes, which are longer and conventionally shown with a bit more of the front kept visible.
export function shortenHash(hash, chars = 8) {
  if (!hash) return "";
  return `${hash.slice(0, chars)}...${hash.slice(-6)}`;
}

// Converts a wei amount (string/number/bigint) into a human "0.05" ETH string. 
export function weiToEth(amountWei) {
  if (amountWei === null || amountWei === undefined || amountWei === "") return "0";
  try {
    return ethers.formatEther(BigInt(amountWei));
  } catch {
    return "0";
  }
}

// Converts a human ETH amount (e.g. from a form input) into wei as a BigInt, ready to send to the contract or to be .toString()'d for the API.
export function ethToWei(amountEth) {
  return ethers.parseEther(String(amountEth));
}

// Formats a timestamp for display. 
// Accepts either a Unix seconds number (what the smart contract returns) or an ISO date string (what the backend's `timestamp` field returns) and normalizes both to the same human-readable "Aug 24, 2026, 3:45 PM" style string.
export function formatDate(value) {
  if (!value) return "-";
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Builds a "view this transaction" block explorer link, or null if no explorer URL is configured (e.g. on a local Anvil chain).
export function explorerTxUrl(hash) {
  if (!BLOCK_EXPLORER_URL) return null;
  return `${BLOCK_EXPLORER_URL}/tx/${hash}`;
}

// Same as explorerTxUrl but for an address's page on the explorer.
export function explorerAddressUrl(address) {
  if (!BLOCK_EXPLORER_URL) return null;
  return `${BLOCK_EXPLORER_URL}/address/${address}`;
}

// Checks that a string is a syntactically valid Ethereum address, used to validate the "customer address" field before submitting the invoice form.
export function isValidAddress(address) {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

// Compares two addresses case-insensitively (checksummed vs lowercase addresses refer to the same account, so a plain === would give false
// negatives). Used to check "is the connected wallet the invoice's customer/owner".
export function sameAddress(a, b) {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}
