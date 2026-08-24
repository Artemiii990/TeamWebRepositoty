import { Link } from "react-router-dom";

function InvoiceList({ invoices }) {
  return (
    <div className="invoice-list">
      <h2>Invoice List</h2>

      {invoices.length === 0 ? (
        <p>No invoices yet.</p>
      ) : (
        invoices.map((invoice) => (
          <div className="invoice-card" key={invoice.id}>
            <h3>
              Invoice #{invoice.id}
            </h3>

            <p>
              Description: {invoice.description}
            </p>

            <p>
              Amount: {invoice.amount} ETH
            </p>

            <p>
              Status: <strong>{invoice.status}</strong>
            </p>

            {invoice.transactionHash && (
              <p>
                Transaction:{" "}
                {invoice.transactionHash.slice(0, 10)}...
              </p>
            )}

            <Link to={`/pay/${invoice.id}`}>
              Open Payment Page
            </Link>
          </div>
        ))
      )}
    </div>
  );
}

export default InvoiceList;