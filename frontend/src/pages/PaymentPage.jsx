import { useState } from "react";
import { useParams } from "react-router-dom";

import ConnectWallet from "../components/ConnectWallet";
import { invoices } from "../data/invoices";
import { payInvoice } from "../services/blockchain";

function PaymentPage() {
  const { invoiceId } = useParams();

  const invoice = invoices.find(
    (item) => item.id === Number(invoiceId)
  );

  const [status, setStatus] = useState(
    invoice?.status || "WAITING_PAYMENT"
  );

  const [transactionHash, setTransactionHash] =
    useState("");

  const [error, setError] = useState("");

  if (!invoice) {
    return (
      <div className="container">
        <h1>Invoice not found</h1>
      </div>
    );
  }

  async function handlePayment() {
    try {
      setError("");

      setStatus("PROCESSING");

      const transaction = await payInvoice(
        invoice.id,
        invoice.amount
      );

      setTransactionHash(transaction.hash);

      setStatus("WAITING_CONFIRMATION");

      await transaction.wait();

      setStatus("PAID");
    } catch (error) {
      console.error(error);

      setStatus("WAITING_PAYMENT");

      setError(error.message);
    }
  }

  return (
    <div className="container payment-page">
      <h1>
        Invoice #{invoice.id}
      </h1>

      <div className="payment-card">
        <h2>{invoice.description}</h2>

        <p>
          Amount:{" "}
          <strong>{invoice.amount} ETH</strong>
        </p>

        <p>
          Merchant: {invoice.merchant}
        </p>

        <p>
          Status:{" "}
          <strong>{status}</strong>
        </p>

        <ConnectWallet />

        <button
          onClick={handlePayment}
          disabled={
            status === "PROCESSING" ||
            status === "WAITING_CONFIRMATION" ||
            status === "PAID"
          }
        >
          Pay {invoice.amount} ETH
        </button>

        {transactionHash && (
          <div className="transaction">
            <p>Transaction Hash:</p>

            <p className="hash">
              {transactionHash}
            </p>
          </div>
        )}

        {error && (
          <p className="error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default PaymentPage;