import { useRef, useState } from "react";
import { useWallet } from "../context/WalletContext";
import { createInvoiceOnChain } from "../services/blockchain";
import { createInvoice as createInvoiceApi, syncInvoiceWithBlockchain } from "../services/api";
import { ethToWei } from "../utils/format";

const STEP_DEFS = [
  { key: "backend", label: "Save invoice record" },
  { key: "onchain", label: "Confirm createInvoice() in MetaMask" },
  { key: "sync", label: "Link on-chain invoice to the record" },
];

// Small checklist shown while the 3-step create flow below is running, so the merchant can see which step they're on 
// instead of staring at a spinner with no context for ~10-15 seconds.
function StepList({ steps }) {
  return (
    <ol className="step-list">
      {steps.map((step) => (
        <li key={step.key} className={`step-item step-item--${step.state}`}>
          <span className="step-icon" aria-hidden="true">
            {step.state === "done" ? "\u2713" : step.state === "error" ? "!" : step.state === "active" ? "\u2022" : ""}
          </span>
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

// Form for creating a new invoice. Note there's no "customer address" field. the current
// So any registered, active Customer with the /pay link can pay it.
function InvoiceForm({ onCreated }) {
  const { address, isConnected, isOnCorrectNetwork } = useWallet();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepStates, setStepStates] = useState(STEP_DEFS.map((s) => ({ ...s, state: "pending" })));
  const [formError, setFormError] = useState("");

  const pendingInvoiceId = useRef(null);

  function setStep(index, state) {
    setStepStates((current) => current.map((s, i) => (i === index ? { ...s, state } : s)));
  }

  function resetSteps() {
    setStepStates(STEP_DEFS.map((s) => ({ ...s, state: "pending" })));
  }

  function validate() {
    if (!isConnected) return "Connect MetaMask first - the merchant address comes from your wallet.";
    if (!isOnCorrectNetwork) return "Switch to the configured network before creating an invoice.";
    if (!description.trim()) return "Enter a description.";
    if (!amount || Number(amount) <= 0) return "Enter an amount greater than zero.";
    return "";
  }

  // Walks the full create flow: save to the backend DB, sign createInvoice() in MetaMask, 
  // then tell the backend the tx hash so it can verify the InvoiceCreated event and link blockchain_invoice_id.
  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);
    resetSteps();

    const amountWei = ethToWei(amount);

    try {
      // Step 1: create the DB record (skip if a previous attempt already made it).
      let invoiceId = pendingInvoiceId.current;

      if (!invoiceId) {
        setStep(0, "active");
        const created = await createInvoiceApi({
          merchant: address,
          description: description.trim(),
          amountWei: amountWei.toString(),
        });
        invoiceId = created.invoice_id;
        pendingInvoiceId.current = invoiceId;
      }
      setStep(0, "done");

      // Step 2: merchant signs createInvoice() on-chain.
      setStep(1, "active");
      const { hash, blockchainInvoiceId } = await createInvoiceOnChain(amountWei, description.trim());
      setStep(1, "done");

      // Step 3: tell the backend so it can verify the InvoiceCreated event and link blockchain_invoice_id - 
      // the payment page can't work until this happens.
      setStep(2, "active");
      await syncInvoiceWithBlockchain(invoiceId, hash);
      setStep(2, "done");

      onCreated?.({ id: invoiceId, blockchainInvoiceId, transactionHash: hash });

      pendingInvoiceId.current = null;
      setDescription("");
      setAmount("");
      resetSteps();
    } catch (error) {
      const failedIndex = stepStates.findIndex((s) => s.state === "active");
      if (failedIndex >= 0) setStep(failedIndex, "error");
      setFormError(error.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasActiveSteps = stepStates.some((s) => s.state !== "pending");

  return (
    <form className="invoice-form" onSubmit={handleSubmit}>
      <h2>New invoice</h2>

      <label htmlFor="merchant-address">Merchant (you)</label>
      <input id="merchant-address" type="text" value={isConnected ? address : "Connect MetaMask to fill this in"} readOnly disabled />

      <label htmlFor="description">Description</label>
      <input
        id="description"
        type="text"
        placeholder="Laptop"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        disabled={isSubmitting}
      />

      <label htmlFor="amount">Amount (ETH)</label>
      <input
        id="amount"
        type="number"
        step="0.0001"
        min="0"
        placeholder="0.05"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        disabled={isSubmitting}
      />

      <button type="submit" className="btn btn-stamp" disabled={isSubmitting}>
        {isSubmitting ? "Creating\u2026" : "Create invoice"}
      </button>

      {hasActiveSteps && <StepList steps={stepStates} />}

      {formError && <p className="error">{formError}</p>}
    </form>
  );
}

export default InvoiceForm;