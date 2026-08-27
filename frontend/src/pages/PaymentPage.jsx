import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import StatusTracker from "../components/StatusTracker";
import TransactionHashLink from "../components/TransactionHashLink";
import { useWallet } from "../context/WalletContext";
import { useIdentity } from "../context/IdentityContext";
import { getInvoice, confirmPayment, ApiError } from "../services/api";
import { payInvoiceOnChain, WalletError } from "../services/blockchain";
import { rememberCustomerInvoiceId } from "../utils/localRegistry";
import { weiToEth, formatDate, shortenAddress } from "../utils/format";

const PHASE = {
  IDLE: "idle",
  AWAITING_SIGNATURE: "awaiting_signature",
  MINING: "mining",
  VERIFYING: "verifying",
  DONE: "done",
  ERROR: "error",
};

const PHASE_LABEL = {
  [PHASE.AWAITING_SIGNATURE]: "Confirm the payment in MetaMask\u2026",
  [PHASE.MINING]: "Waiting for the transaction to be mined\u2026",
  [PHASE.VERIFYING]: "Backend is verifying the transaction on-chain\u2026",
};

// Customer-facing payment page ("/pay/:invoiceId"). 
// Note: this page's job is just: is the connected wallet a registered, active Customer? If yes, they can pay.
function PaymentPage() {
  const { invoiceId } = useParams();
  const { address, isConnected, isOnCorrectNetwork } = useWallet();
  const { role, isActive, isLoading: identityLoading } = useIdentity();

  const [invoice, setInvoice] = useState(null);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | not_found | load_error
  const [loadError, setLoadError] = useState("");

  const [phase, setPhase] = useState(PHASE.IDLE);
  const [payError, setPayError] = useState("");
  const [pendingTxHash, setPendingTxHash] = useState("");

  const fetchInvoice = useCallback(async () => {
    try {
      const data = await getInvoice(invoiceId);
      setInvoice(data);
      setLoadState("ready");
      // Log this invoice into "my history" the moment it's successfully opened, not just after paying - so a Customer 
      // can find it again even if they close the tab before paying.
      if (address) rememberCustomerInvoiceId(address, data.invoice_id);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setLoadState("not_found");
      } else {
        setLoadState("load_error");
        setLoadError(error.message || "Could not load this invoice.");
      }
    }
  }, [invoiceId, address]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const isRegistered = invoice?.blockchain_invoice_id !== null && invoice?.blockchain_invoice_id !== undefined;
  const isAlreadyPaid = invoice?.status === "PAID";
  const canPayAsThisWallet = role === "CUSTOMER" && isActive;
  const isBusy = phase !== PHASE.IDLE && phase !== PHASE.ERROR && phase !== PHASE.DONE;

  async function handlePay() {
    setPayError("");
    setPendingTxHash("");

    try {
      setPhase(PHASE.AWAITING_SIGNATURE);
      const { hash } = await payInvoiceOnChain(invoice.blockchain_invoice_id, BigInt(invoice.amount));
      setPendingTxHash(hash);

      setPhase(PHASE.MINING);
      // payInvoiceOnChain already awaits the receipt before returning,
      // so by the time we get here the tx is mined - this phase mostly exists to keep the UI truthful if that ever becomes async.

      setPhase(PHASE.VERIFYING);
      await confirmPayment(invoiceId, hash);

      await fetchInvoice();
      setPhase(PHASE.DONE);
    } catch (error) {
      setPhase(PHASE.ERROR);
      if (error instanceof WalletError || error instanceof ApiError) {
        setPayError(error.message);
      } else {
        setPayError("Payment failed. Please try again.");
      }
    }
  }

  if (loadState === "loading") {
    return (
      <div className="page payment-page">
        <p className="empty-state">Loading invoice\u2026</p>
      </div>
    );
  }

  if (loadState === "not_found") {
    return (
      <div className="page payment-page">
        <h1>Invoice not found</h1>
        <p>No invoice with id #{invoiceId} exists on the backend.</p>
      </div>
    );
  }

  if (loadState === "load_error") {
    return (
      <div className="page payment-page">
        <h1>Could not load invoice</h1>
        <p className="error">{loadError}</p>
        <button className="btn btn-ghost" onClick={fetchInvoice}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="page payment-page">
      <h1>Invoice #{String(invoice.invoice_id).padStart(6, "0")}</h1>

      <div className="payment-card receipt-card receipt-card--large">
        <div className="receipt-perforation" aria-hidden="true" />

        <h2 className="receipt-desc">{invoice.description}</h2>

        <p className="amount-display mono">{weiToEth(invoice.amount)} ETH</p>

        <div className="receipt-row">
          <span>Merchant</span>
          <span className="mono">{shortenAddress(invoice.merchant)}</span>
        </div>
        <div className="receipt-row">
          <span>Created</span>
          <span>{formatDate(invoice.timestamp)}</span>
        </div>
        {invoice.customer && (
          <div className="receipt-row">
            <span>Paid by</span>
            <span className="mono">{shortenAddress(invoice.customer)}</span>
          </div>
        )}

        <StatusTracker status={invoice.status} blockchainInvoiceId={invoice.blockchain_invoice_id} />

        {!isRegistered && (
          <p className="hint">
            This invoice hasn't finished being registered on-chain by the merchant yet. Check back shortly.
          </p>
        )}

        {isRegistered && !isAlreadyPaid && !isConnected && <p className="hint">Connect MetaMask (top bar) to pay this invoice.</p>}

        {isRegistered && !isAlreadyPaid && isConnected && !identityLoading && !canPayAsThisWallet && (
          <p className="hint hint--warning">
            Your connected wallet isn't registered as an active Customer yet.{" "}
            <Link to="/register">Register as a Customer</Link> to pay this invoice.
          </p>
        )}

        {isRegistered && !isAlreadyPaid && isConnected && !isOnCorrectNetwork && (
          <p className="hint hint--warning">Switch to the correct network above before paying.</p>
        )}

        <button
          type="button"
          className="btn btn-stamp btn-block"
          onClick={handlePay}
          disabled={!isRegistered || isAlreadyPaid || !isConnected || !isOnCorrectNetwork || isBusy || !canPayAsThisWallet}
        >
          {isAlreadyPaid ? "Already paid" : isBusy ? PHASE_LABEL[phase] : `Pay ${weiToEth(invoice.amount)} ETH`}
        </button>

        <TransactionHashLink hash={invoice.payment_transaction_hash || pendingTxHash} />

        {payError && <p className="error">{payError}</p>}
      </div>
    </div>
  );
}

export default PaymentPage;