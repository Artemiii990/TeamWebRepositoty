import { useState } from "react";
import { connectWallet } from "../services/blockchain";

function ConnectWallet() {
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  async function handleConnect() {
    try {
      setError("");

      const wallet = await connectWallet();

      setAddress(wallet.address);
    } catch (error) {
      setError(error.message);
    }
  }

  return (
    <div className="wallet-box">
      {!address ? (
        <button onClick={handleConnect}>
          Connect MetaMask
        </button>
      ) : (
        <p>
          Wallet: {address.slice(0, 6)}...
          {address.slice(-4)}
        </p>
      )}

      {error && (
        <p className="error">
          {error}
        </p>
      )}
    </div>
  );
}

export default ConnectWallet;