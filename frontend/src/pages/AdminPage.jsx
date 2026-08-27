import { useCallback, useEffect, useState } from "react";
import { useWallet } from "../context/WalletContext";
import { useToast } from "../context/ToastContext";
import {
  getContractPaused,
  getContractBalance,
  pauseContract,
  unpauseContract,
  transferAdminOnChain,
  emergencyWithdrawOnChain,
  deactivateUserOnChain,
  activateUserOnChain,
  WalletError,
} from "../services/blockchain";
import { reportPause, reportUnpause, reportTransferAdmin, deactivateUser as reportDeactivate } from "../services/api";
import { isContractConfigured, isRegistryConfigured } from "../config";
import { isValidAddress, weiToEth, ethToWei } from "../utils/format";

// Admin's page ("/admin") - only reachable by whichever wallet is currently CryptoPaymentGateway's on-chain `admin`. 
// Every action here is a real transaction signed by that wallet
function AdminPage() {
  const { isConnected } = useWallet();
  const toast = useToast();

  const [paused, setPaused] = useState(null);
  const [balanceWei, setBalanceWei] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isPausing, setIsPausing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [newAdmin, setNewAdmin] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [targetWallet, setTargetWallet] = useState("");
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const [error, setError] = useState("");

  // Reads paused state + contract balance straight from the chain.
  const loadState = useCallback(async () => {
    if (!isContractConfigured()) return;
    setIsLoading(true);
    setError("");
    try {
      const [isPaused, balance] = await Promise.all([getContractPaused(), getContractBalance()]);
      setPaused(isPaused);
      setBalanceWei(balance);
    } catch (err) {
      setError(err.message || "Could not read contract state.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  async function handleTogglePause() {
    setIsPausing(true);
    setError("");
    try {
      if (paused) {
        const hash = await unpauseContract();
        await reportUnpause(hash).catch(() => {}); 
        toast.success("Contract unpaused.");
      } else {
        const hash = await pauseContract();
        await reportPause(hash).catch(() => {});
        toast.success("Contract paused - createInvoice/payInvoice will revert until unpaused.");
      }
      await loadState();
    } catch (err) {
      setError(err instanceof WalletError ? err.message : "The transaction failed.");
    } finally {
      setIsPausing(false);
    }
  }

  // Pulls stuck ETH out of the contract back to the admin wallet.
  async function handleWithdraw(event) {
    event.preventDefault();
    setError("");
    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setIsWithdrawing(true);
    try {
      await emergencyWithdrawOnChain(ethToWei(withdrawAmount));
      toast.success(`Withdrew ${withdrawAmount} ETH from the contract.`);
      setWithdrawAmount("");
      await loadState();
    } catch (err) {
      setError(err instanceof WalletError ? err.message : "The withdrawal failed.");
    } finally {
      setIsWithdrawing(false);
    }
  }

  // Hands admin rights to a different wallet. This is one-way from this wallet's perspective - once mined, 
  // this page becomes unreachable here until reconnecting with the new admin's wallet.
  async function handleTransferAdmin(event) {
    event.preventDefault();
    setError("");
    if (!isValidAddress(newAdmin)) {
      setError("Enter a valid wallet address.");
      return;
    }
    setIsTransferring(true);
    try {
      const hash = await transferAdminOnChain(newAdmin);
      await reportTransferAdmin(newAdmin, hash).catch(() => {});
      toast.success("Admin rights transferred.");
      setNewAdmin("");
    } catch (err) {
      setError(err instanceof WalletError ? err.message : "The transfer failed.");
    } finally {
      setIsTransferring(false);
    }
  }

  // Deactivates a Merchant/Customer wallet on-chain (blocks their onlyMerchant/onlyCustomer calls) and mirrors it to the backend.
  async function handleDeactivate() {
    if (!isValidAddress(targetWallet)) {
      setError("Enter a valid wallet address.");
      return;
    }
    setIsUpdatingUser(true);
    setError("");
    try {
      const hash = await deactivateUserOnChain(targetWallet);
      await reportDeactivate(hash);
      toast.success("User deactivated.");
    } catch (err) {
      setError(err instanceof WalletError ? err.message : "Could not deactivate that user.");
    } finally {
      setIsUpdatingUser(false);
    }
  }

  // Re-activates a wallet on-chain
  async function handleActivate() {
    if (!isValidAddress(targetWallet)) {
      setError("Enter a valid wallet address.");
      return;
    }
    setIsUpdatingUser(true);
    setError("");
    try {
      await activateUserOnChain(targetWallet);
      toast.success("User re-activated on-chain (backend has no /user/activate endpoint yet - ask Participant 2 to add one).");
    } catch (err) {
      setError(err instanceof WalletError ? err.message : "Could not activate that user.");
    } finally {
      setIsUpdatingUser(false);
    }
  }

  if (!isContractConfigured() || !isRegistryConfigured()) {
    return (
      <div className="page">
        <header className="page-head">
          <h1>Admin</h1>
        </header>
        <p className="hint">
          Contract and/or registry address isn't configured yet (VITE_CONTRACT_ADDRESS / VITE_REGISTRY_ADDRESS in
          .env). Ask the Solidity team for the deployed addresses.
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Admin</h1>
        <p className="subtitle">Owner-only controls from the deployed contracts.</p>
      </header>

      <div className="admin-grid">
        <div className="panel">
          <h2>Contract status</h2>
          <div className="receipt-row">
            <span>Status</span>
            <strong>{isLoading ? "Loading\u2026" : paused ? "Paused" : "Active"}</strong>
          </div>
          <div className="receipt-row">
            <span>Contract balance</span>
            <strong className="mono">{balanceWei === null ? "-" : `${weiToEth(balanceWei)} ETH`}</strong>
          </div>
          <button
            type="button"
            className="btn btn-stamp btn-block"
            onClick={handleTogglePause}
            disabled={!isConnected || isPausing || paused === null}
          >
            {isPausing ? "Sending\u2026" : paused ? "Unpause contract" : "Pause contract"}
          </button>
        </div>

        <div className="panel">
          <h2>Emergency withdraw</h2>
          <p className="hint">Pulls ETH that's stuck in the contract back to your wallet. Normal payments never sit here - this is only for recovery.</p>
          <form onSubmit={handleWithdraw}>
            <label htmlFor="withdraw-amount">Amount (ETH)</label>
            <input
              id="withdraw-amount"
              type="number"
              step="0.0001"
              min="0"
              placeholder="0.1"
              value={withdrawAmount}
              onChange={(event) => setWithdrawAmount(event.target.value)}
              disabled={isWithdrawing}
            />
            <button type="submit" className="btn btn-stamp btn-block" disabled={!isConnected || isWithdrawing}>
              {isWithdrawing ? "Sending\u2026" : "Withdraw"}
            </button>
          </form>
        </div>

        <div className="panel">
          <h2>Transfer admin</h2>
          <p className="hint">Hands full admin control to a different wallet. You'll lose access to this page immediately after.</p>
          <form onSubmit={handleTransferAdmin}>
            <label htmlFor="new-admin">New admin address</label>
            <input
              id="new-admin"
              type="text"
              placeholder="0x..."
              value={newAdmin}
              onChange={(event) => setNewAdmin(event.target.value)}
              disabled={isTransferring}
            />
            <button type="submit" className="btn btn-stamp btn-block" disabled={!isConnected || isTransferring}>
              {isTransferring ? "Sending\u2026" : "Transfer admin"}
            </button>
          </form>
        </div>

        <div className="panel">
          <h2>Manage a user</h2>
          <p className="hint">Activate or deactivate a registered Merchant/Customer wallet.</p>
          <label htmlFor="target-wallet">Wallet address</label>
          <input
            id="target-wallet"
            type="text"
            placeholder="0x..."
            value={targetWallet}
            onChange={(event) => setTargetWallet(event.target.value)}
            disabled={isUpdatingUser}
          />
          <div className="button-row">
            <button type="button" className="btn btn-ghost" onClick={handleActivate} disabled={!isConnected || isUpdatingUser}>
              Activate
            </button>
            <button type="button" className="btn btn-stamp" onClick={handleDeactivate} disabled={!isConnected || isUpdatingUser}>
              Deactivate
            </button>
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default AdminPage;