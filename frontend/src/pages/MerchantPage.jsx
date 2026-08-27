import { useCallback, useEffect, useState } from "react";
import InvoiceForm from "../components/InvoiceForm";
import InvoiceList from "../components/InvoiceList";
import { useWallet } from "../context/WalletContext";
import { useToast } from "../context/ToastContext";
import { getMerchantInvoiceIds, rememberMerchantInvoiceId } from "../utils/localRegistry";
import { getInvoice, ApiError } from "../services/api";

// Merchant's main page ("/merchant"): a form to create a new invoice on the left, and the list of invoices this wallet has created 
// on the right. Only reachable by a wallet that's registered on-chain as an active Merchant - see RequireIdentity in App.jsx.
function MerchantPage() {
  const { address } = useWallet();
  const toast = useToast();

  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [refreshingId, setRefreshingId] = useState(null);

  // Fetches fresh data for every invoice id this wallet has created.
  const loadAll = useCallback(async () => {
    const ids = getMerchantInvoiceIds(address);
    if (ids.length === 0) {
      setInvoices([]);
      return;
    }

    setIsLoading(true);
    setListError("");

    // allSettled so one broken invoice doesn't hide the rest of the list.
    const results = await Promise.allSettled(ids.map((id) => getInvoice(id)));
    const loaded = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
    const failedCount = results.length - loaded.length;

    loaded.sort((a, b) => b.invoice_id - a.invoice_id);
    setInvoices(loaded);

    if (failedCount > 0) {
      setListError(`${failedCount} invoice(s) could not be loaded from the backend.`);
    }

    setIsLoading(false);
  }, [address]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Re-fetches a single invoice's status (e.g. after a customer pays it).
  async function handleRefresh(invoiceId) {
    setRefreshingId(invoiceId);
    try {
      const updated = await getInvoice(invoiceId);
      setInvoices((current) => current.map((inv) => (inv.invoice_id === invoiceId ? updated : inv)));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not refresh that invoice.");
    } finally {
      setRefreshingId(null);
    }
  }

  // Called by InvoiceForm once the full create -> sign -> sync flow
  // finishes. Remembers the new id under this wallet, then fetches its full details so it appears in the list immediately.
  async function handleCreated({ id }) {
    rememberMerchantInvoiceId(address, id);
    toast.success(`Invoice #${id} created and registered on-chain.`);
    try {
      const invoice = await getInvoice(id);
      setInvoices((current) => [invoice, ...current.filter((inv) => inv.invoice_id !== id)]);
    } catch {
      // It was created fine - a manual refresh will pick it up.
      loadAll();
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Invoices</h1>
        <p className="subtitle">Create invoices and track their payment status.</p>
      </header>

      <div className="dashboard-grid">
        <section>
          <InvoiceForm onCreated={handleCreated} />
        </section>

        <section>
          <InvoiceList
            invoices={invoices}
            isLoading={isLoading}
            error={listError}
            onRefresh={handleRefresh}
            refreshingId={refreshingId}
            onRefreshAll={loadAll}
          />
        </section>
      </div>
    </div>
  );
}

export default MerchantPage;