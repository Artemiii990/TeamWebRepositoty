import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import InvoiceList from "../components/InvoiceList";
import { getCustomerInvoiceIds } from "../utils/localRegistry";
import { getInvoice } from "../services/api";

// Customer's main page ("/customer"): a box to jump straight to an invoice by its number 
// (since a customer normally arrives via a link a merchant sent them, not by browsing), plus a list of invoices this
// wallet has previously opened or paid. Only reachable by a wallet that's registered on-chain as an active Customer.
function CustomerPage() {
  const { address } = useWallet();
  const navigate = useNavigate();

  const [lookupId, setLookupId] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshingId, setRefreshingId] = useState(null);

  // Loads full details for every invoice id this wallet has visited.
  const loadAll = useCallback(async () => {
    const ids = getCustomerInvoiceIds(address);
    if (ids.length === 0) {
      setInvoices([]);
      return;
    }

    setIsLoading(true);
    setError("");

    const results = await Promise.allSettled(ids.map((id) => getInvoice(id)));
    const loaded = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
    loaded.sort((a, b) => b.invoice_id - a.invoice_id);
    setInvoices(loaded);

    if (loaded.length < results.length) {
      setError(`${results.length - loaded.length} invoice(s) could not be loaded from the backend.`);
    }
    setIsLoading(false);
  }, [address]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Re-fetches a single invoice's status (e.g. to check if it's been paid).
  async function handleRefresh(invoiceId) {
    setRefreshingId(invoiceId);
    try {
      const updated = await getInvoice(invoiceId);
      setInvoices((current) => current.map((inv) => (inv.invoice_id === invoiceId ? updated : inv)));
    } catch {
      // Leave the stale row in place rather than crashing the page.
    } finally {
      setRefreshingId(null);
    }
  }

  // Jumps to /pay/:id for whatever invoice number was typed in.
  function handleLookup(event) {
    event.preventDefault();
    const trimmed = lookupId.trim();
    if (trimmed) navigate(`/pay/${trimmed}`);
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Payment history</h1>
        <p className="subtitle">Open an invoice a merchant sent you, or revisit one you've already paid.</p>
      </header>

      <form className="lookup-box" onSubmit={handleLookup}>
        <input
          type="text"
          placeholder="Invoice number, e.g. 1024"
          value={lookupId}
          onChange={(event) => setLookupId(event.target.value)}
        />
        <button type="submit" className="btn btn-stamp">
          Open invoice
        </button>
      </form>

      <InvoiceList
        invoices={invoices}
        isLoading={isLoading}
        error={error}
        onRefresh={handleRefresh}
        refreshingId={refreshingId}
        onRefreshAll={loadAll}
      />
    </div>
  );
}

export default CustomerPage;