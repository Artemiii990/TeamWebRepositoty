import { useState } from "react";
import ConnectWallet from "../components/ConnectWallet";
import InvoiceForm from "../components/InvoiceForm";
import InvoiceList from "../components/InvoiceList";
import { invoices as initialInvoices } from "../data/invoices";

function Dashboard() {
  const [invoices, setInvoices] = useState(initialInvoices);

  function createInvoice(invoiceData) {
    const newInvoice = {
      id: 1024 + invoices.length,
      description: invoiceData.description,
      amount: invoiceData.amount,
      merchant: "Merchant",
      customer: "",
      timestamp: new Date().toLocaleString(),
      status: "WAITING_PAYMENT",
      transactionHash: "",
    };

    setInvoices([...invoices, newInvoice]);
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Crypto Payment Gateway</h1>

        <ConnectWallet />
      </header>

      <main>
        <InvoiceForm onCreate={createInvoice} />

        <InvoiceList invoices={invoices} />
      </main>
    </div>
  );
}

export default Dashboard;