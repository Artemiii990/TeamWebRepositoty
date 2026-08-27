import InvoiceCard from "./InvoiceCard";

// Pure display grid of InvoiceCards, plus a header with a "refresh all" button. 
function InvoiceList({ invoices, isLoading, error, onRefresh, refreshingId, onRefreshAll }) {
  return (
    <div className="invoice-list">
      <header className="invoice-list-head">
        <h2>Invoices</h2>
        <button type="button" className="btn btn-ghost btn-small" onClick={onRefreshAll} disabled={isLoading}>
          {isLoading ? "Refreshing\u2026" : "Refresh all"}
        </button>
      </header>

      {error && <p className="error">{error}</p>}

      {!isLoading && invoices.length === 0 && !error && (
        <p className="empty-state">No invoices yet. Create one to get a payment link.</p>
      )}

      <div className="receipt-grid">
        {invoices.map((invoice) => (
          <InvoiceCard
            key={invoice.invoice_id}
            invoice={invoice}
            onRefresh={onRefresh}
            isRefreshing={refreshingId === invoice.invoice_id}
          />
        ))}
      </div>
    </div>
  );
}

export default InvoiceList;