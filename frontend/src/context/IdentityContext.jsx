import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useWallet } from "./WalletContext";
import { getUserByWallet } from "../services/api";
import { getContractAdmin } from "../services/blockchain";
import { sameAddress } from "../utils/format";
import { isContractConfigured } from "../config";

const IdentityContext = createContext(null);

// This is the app's whole "login system": there is no separate account
// database with a password. Whoever controls a wallet address IS that
// identity. This context takes the connected wallet from WalletContext
// and looks up two independent facts about it:
//
//   1. Is it registered as a Merchant/Customer? (backend's mirror of
//      UserRegistry.sol - see services/api.js:getUserByWallet)
//   2. Is it the current on-chain admin? (CryptoPaymentGateway.admin(),
//      inherited from Admin.sol - a wallet can be BOTH admin AND a
//      registered merchant/customer at the same time, they're unrelated)
//
// Every page that needs to know "who is this" reads from here instead of re-implementing these lookups.
export function IdentityProvider({ children }) {
  const { address, isConnected } = useWallet();

  const [profile, setProfile] = useState(null); // { wallet, name, role, active } | null
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Re-checks both facts above for the currently connected wallet.
  // Exported as `refresh` so pages can call it right after a registration transaction is confirmed, 
  // instead of waiting for a re-render.
  const refresh = useCallback(async () => {
    if (!isConnected || !address) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const [backendUser, adminAddress] = await Promise.all([
        getUserByWallet(address),
        isContractConfigured() ? getContractAdmin().catch(() => null) : Promise.resolve(null),
      ]);
      setProfile(backendUser);
      setIsAdmin(Boolean(adminAddress) && sameAddress(adminAddress, address));
    } catch (err) {
      setError(err.message || "Could not check this wallet's registration status.");
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    // Re-run the lookup every time the connected wallet changes. eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const value = {
    profile, // null until registered on-chain
    role: profile?.role || null, // "MERCHANT" | "CUSTOMER" | null
    isRegistered: Boolean(profile),
    isActive: Boolean(profile?.active),
    isAdmin,
    isLoading,
    error,
    refresh,
  };

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}

// Convenience hook - `const { role, isAdmin } = useIdentity()`.
export function useIdentity() {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error("useIdentity must be used inside an IdentityProvider");
  return ctx;
}