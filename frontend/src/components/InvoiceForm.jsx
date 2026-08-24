import { useState } from "react";

function InvoiceForm({ onCreate }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!description || !amount) {
      alert("Please enter description and amount");
      return;
    }

    onCreate({
      description,
      amount,
    });

    setDescription("");
    setAmount("");
  }

  return (
    <form className="invoice-form" onSubmit={handleSubmit}>
      <h2>Create Invoice</h2>

      <label>
        Description
      </label>

      <input
        type="text"
        placeholder="Laptop"
        value={description}
        onChange={(event) =>
          setDescription(event.target.value)
        }
      />

      <label>
        Amount (ETH)
      </label>

      <input
        type="number"
        step="0.001"
        placeholder="0.05"
        value={amount}
        onChange={(event) =>
          setAmount(event.target.value)
        }
      />

      <button type="submit">
        Create Invoice
      </button>
    </form>
  );
}

export default InvoiceForm;