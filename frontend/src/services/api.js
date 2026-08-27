import { API_BASE_URL } from "../config";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function parseJsonPreservingAmount(rawText) {
  const data = JSON.parse(rawText);

  if (data && typeof data === "object" && "amount" in data) {
    const match = rawText.match(/"amount"\s*:\s*(-?\d+)/);
    if (match) data.amount = match[1];
  }

  return data;
}

function normalizeInvoice(data) {
  if (!data) return data;
  return {
    ...data,
    create_transaction_hash: data.create_transaction_hash ?? data.transaction_hash ?? null,
    payment_transaction_hash: data.payment_transaction_hash ?? null,
  };
}

async function request(path, { method = "GET", body, preserveAmount = false } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(`Could not reach the backend at ${API_BASE_URL}. Is it running?`, 0);
  }

  const rawText = await response.text();
  let data = null;

  if (rawText) {
    try {
      data = preserveAmount ? parseJsonPreservingAmount(rawText) : JSON.parse(rawText);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const detail = data?.detail || data?.message || `Request failed (${response.status})`;
    throw new ApiError(typeof detail === "string" ? detail : JSON.stringify(detail), response.status);
  }

  return data;
}

// /gateway - invoices 

export async function createInvoice({ merchant, description, amountWei }) {
  const data = await request("/gateway/createInvoice", {
    method: "POST",
    body: { merchant, customer: "", description, amount: amountWei },
    preserveAmount: true,
  });
  return normalizeInvoice(data);
}

/** POST /gateway/invoice/{id}/synchronizeWithBlockchain - links the on-chain invoice after createInvoice() is mined. */
export function syncInvoiceWithBlockchain(invoiceId, transactionHash) {
  return request(`/gateway/invoice/${invoiceId}/synchronizeWithBlockchain`, {
    method: "POST",
    body: { transaction_hash: transactionHash },
  });
}

/** POST /gateway/invoice/{id}/pay - backend independently verifies the payment tx on-chain. */
export function confirmPayment(invoiceId, transactionHash) {
  return request(`/gateway/invoice/${invoiceId}/pay`, {
    method: "POST",
    body: { transaction_hash: transactionHash },
  });
}

/** GET /gateway/getInvoice/{id} */
export async function getInvoice(invoiceId) {
  const data = await request(`/gateway/getInvoice/${invoiceId}`, { preserveAmount: true });
  return normalizeInvoice(data);
}

// /user - on-chain identity mirror 

/** GET /user/{wallet} - returns null (not an error) if the wallet has never registered. */
export async function getUserByWallet(wallet) {
  try {
    return await request(`/user/${wallet}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** POST /user/register - backend verifies the UserRegistered event and mirrors it into its own Users table. */
export function registerUser(transactionHash) {
  return request("/user/register", { method: "POST", body: { transaction_hash: transactionHash } });
}

/** POST /user/deactivate - backend verifies the UserDeactivated event. */
export function deactivateUser(transactionHash) {
  return request("/user/deactivate", { method: "POST", body: { transaction_hash: transactionHash } });
}

// /admin - contract-owner-only actions

/** POST /admin/pause - tells the backend the contract was paused on-chain. */
export function reportPause(transactionHash) {
  return request("/admin/pause", { method: "POST", body: { transaction_hash: transactionHash } });
}

/** POST /admin/unpause */
export function reportUnpause(transactionHash) {
  return request("/admin/unpause", { method: "POST", body: { transaction_hash: transactionHash } });
}

// POST /admin/transferAdmin. NOTE: the TransferAdminDTO field is called
export function reportTransferAdmin(newAdminAddress, transactionHash) {
  return request("/admin/transferAdmin", {
    method: "POST",
    body: { new_admin_address: newAdminAddress, transaction_hash: transactionHash },
  });
}
