import { Link } from "react-router-dom";
import StatusTracker from "./StatusTracker";
import TransactionHashLink from "./TransactionHashLink";
import { weiToEth, formatDate, shortenAddress } from "../utils/format";

// Renders one invoice as a "receipt" card. Used by both the Admin dashboard (invoices they created) and the User history page 
// (invoices they opened/paid) - the data shape from GET /user/getInvoice/{id} is the same either way, so this component doesn't 
// need to know which role is looking at it.
function InvoiceCard({ invoice, onRefresh, isRefreshing }) {
  // blockchain_invoice_id is null until the merchant finishes the
  // create-on-chain + sync step - until then this invoice can't be paid.
  const isRegistered = invoice.blockchain_invoice_id !== null && invoice.blockchain_invoice_id !== undefined;

  return (
    <article className="receipt-card">
      <div className="receipt-perforation" aria-hidden="true" />

      <header className="receipt-head">
        <span className="receipt-no">No. {String(invoice.invoice_id).padStart(6, "0")}</span>
        <button
          type="button"
          className="link-btn"
          onClick={() => onRefresh?.(invoice.invoice_id)}
          disabled={isRefreshing}
          title="Refresh status from backend"
        >
          {isRefreshing ? "Refreshing\u2026" : "Refresh"}
        </button>
      </header>

      <h3 className="receipt-desc">{invoice.description}</h3>

      <div className="receipt-row">
        <span>Amount</span>
        <strong className="mono">{weiToEth(invoice.amount)} ETH</strong>
      </div>

      <div className="receipt-row">
        <span>Customer</span>
        <span className="mono">{invoice.customer ? shortenAddress(invoice.customer) : "-"}</span>
      </div>

      <div className="receipt-row">
        <span>Created</span>
        <span>{formatDate(invoice.timestamp)}</span>
      </div>

      {!isRegistered && (
        <p className="hint">Not yet registered on-chain - this invoice can't be paid until that finishes.</p>
      )}

      <StatusTracker status={invoice.status} blockchainInvoiceId={invoice.blockchain_invoice_id} compact />

      <TransactionHashLink hash={invoice.transaction_hash} />

      <Link className="btn btn-ghost btn-block" to={`/pay/${invoice.invoice_id}`}>
        Open payment page
      </Link>
    </article>
  );
}

export default InvoiceCard;