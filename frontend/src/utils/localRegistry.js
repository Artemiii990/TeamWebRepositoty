// TEMPORARY SHIM (delete after receiving from backend necessary data, like: MerchantPage.jsx / CustomerPage.jsx 

const MERCHANT_STORAGE_KEY = "cpg_merchant_invoice_ids"; // invoices a Merchant created
const CUSTOMER_STORAGE_KEY = "cpg_customer_invoice_ids"; // invoices a Customer opened/paid

// Reads a whole {wallet: [ids]} map out of localStorage for the given key.
function readStore(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Writes a whole {wallet: [ids]} map back to localStorage.
function writeStore(storageKey, store) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(store));
  } catch {
    // Storage unavailable (private mode, quota, etc.) - not fatal, the invoice still exists on the backend, it just won't auto-list here.
  }
}

// Adds `invoiceId` to `wallet`'s list under `storageKey`, without duplicates.
function remember(storageKey, wallet, invoiceId) {
  if (!wallet || invoiceId === undefined || invoiceId === null) return;
  const store = readStore(storageKey);
  const key = wallet.toLowerCase();
  const existing = store[key] || [];

  if (!existing.includes(invoiceId)) {
    store[key] = [...existing, invoiceId];
    writeStore(storageKey, store);
  }
}

// Returns the list of invoice ids remembered for `wallet` under `storageKey`.
function list(storageKey, wallet) {
  if (!wallet) return [];
  return readStore(storageKey)[wallet.toLowerCase()] || [];
}

/** Invoice ids this Merchant wallet has created (for MerchantPage's list). */
export function getMerchantInvoiceIds(wallet) {
  return list(MERCHANT_STORAGE_KEY, wallet);
}

/** Called right after an invoice is successfully created + synced on-chain. */
export function rememberMerchantInvoiceId(wallet, invoiceId) {
  remember(MERCHANT_STORAGE_KEY, wallet, invoiceId);
}

/** Invoice ids this Customer wallet has opened or paid (for their history page). */
export function getCustomerInvoiceIds(wallet) {
  return list(CUSTOMER_STORAGE_KEY, wallet);
}

/** Called whenever a Customer opens a /pay/:id link or completes a payment. */
export function rememberCustomerInvoiceId(wallet, invoiceId) {
  remember(CUSTOMER_STORAGE_KEY, wallet, invoiceId);
}
