import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  connectWallet as connectWalletService,
  getConnectedAccount,
  isCorrectNetwork,
  switchToConfiguredNetwork,
} from "../services/blockchain";
import { CHAIN_NAME } from "../config";

const WalletContext = createContext(null);

// Shared MetaMask connection state for the whole app. 
// Wraps the whole tree once (see App.jsx) so MerchantPage, PaymentPage, and AdminPage
// all see the same connected wallet without each having to re-connect. This is *just* the wallet plug 
// - it doesn't know or care about Merchant/Customer/Admin roles, see context/IdentityContext.jsx for that.
export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState("");

  // Pick up an already-authorized account on load, without prompting.
  useEffect(() => {
    let cancelled = false;

    getConnectedAccount()
      .then((account) => {
        if (!cancelled && account) {
          setAddress(account.address);
          setChainId(account.chainId);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // Stay in sync with account/network changes made inside MetaMask itself.
  useEffect(() => {
    if (!window.ethereum) return undefined;

    function handleAccountsChanged(accounts) {
      setAddress(accounts?.[0] || null);
    }

    function handleChainChanged(hexChainId) {
      setChainId(parseInt(hexChainId, 16));
    }

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  // Opens the MetaMask popup and asks the person to pick/authorize an account. 
  // Throws (and stores) a friendly error if they reject it or MetaMask isn't installed
  const connect = useCallback(async () => {
    setError("");
    setIsConnecting(true);
    try {
      const account = await connectWalletService();
      setAddress(account.address);
      setChainId(account.chainId);
      return account;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    // MetaMask doesn't support programmatic disconnect - this just clears local UI state. 
    // The user stays authorized in the extension itself.
    setAddress(null);
  }, []);

  // Asks MetaMask to switch (or add, if unknown) the network configured in config.js. 
  // Used by the "Switch network" button that appears when isOnCorrectNetwork is false.
  const switchNetwork = useCallback(async () => {
    setError("");
    setIsSwitching(true);
    try {
      await switchToConfiguredNetwork();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsSwitching(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      address,
      chainId,
      isConnected: Boolean(address),
      isOnCorrectNetwork: chainId !== null && isCorrectNetwork(chainId),
      expectedNetworkName: CHAIN_NAME,
      isConnecting,
      isSwitching,
      error,
      connect,
      disconnect,
      switchNetwork,
      clearError: () => setError(""),
    }),
    [address, chainId, isConnecting, isSwitching, error, connect, disconnect, switchNetwork]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

// Convenience hook - `const { address, isConnected, connect } = useWallet()`
export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside a WalletProvider");
  return ctx;
}