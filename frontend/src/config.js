const env = import.meta.env;

export const API_BASE_URL = env.VITE_API_BASE_URL || "http://localhost:8000";

export const CONTRACT_ADDRESS = env.VITE_CONTRACT_ADDRESS || "";

// User.sol's UserRegistry - a separate deployed contract where merchants and customers register their role.
export const REGISTRY_ADDRESS = env.VITE_REGISTRY_ADDRESS || "";

export const CHAIN_ID = env.VITE_CHAIN_ID ? Number(env.VITE_CHAIN_ID) : 31337;
export const CHAIN_ID_HEX = "0x" + CHAIN_ID.toString(16);
export const CHAIN_NAME = env.VITE_CHAIN_NAME || "Localhost 8545";
export const NATIVE_CURRENCY_SYMBOL = env.VITE_NATIVE_CURRENCY_SYMBOL || "ETH";
export const BLOCK_EXPLORER_URL = (env.VITE_BLOCK_EXPLORER_URL || "").replace(/\/$/, "");
export const RPC_URL = env.VITE_RPC_URL || "";

export const isContractConfigured = () => Boolean(CONTRACT_ADDRESS);
export const isRegistryConfigured = () => Boolean(REGISTRY_ADDRESS);
