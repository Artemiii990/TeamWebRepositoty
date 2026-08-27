import { useWallet } from "../context/WalletContext";
import { shortenAddress } from "../utils/format";

// Small widget rendered in the AppShell top bar. Shows a "Connect MetaMask" button when no wallet is connected, or the connected
// address + a warning banner if MetaMask is on the wrong network. All the actual connection logic lives in WalletContext - 
// this component only reads that state and renders it.
function ConnectWallet() {
  const {
    address,
    isConnected,
    isOnCorrectNetwork,
    expectedNetworkName,
    isConnecting,
    isSwitching,
    error,
    connect,
    switchNetwork,
  } = useWallet();

  return (
    <div className="wallet-box">
      {!isConnected ? (
        <button className="btn btn-stamp" onClick={connect} disabled={isConnecting}>
          {isConnecting ? "Connecting..." : "Connect MetaMask"}
        </button>
      ) : (
        <div className="wallet-pill">
          <span className="wallet-dot" aria-hidden="true" />
          <span className="wallet-address" title={address}>
            {shortenAddress(address)}
          </span>
        </div>
      )}

      {isConnected && !isOnCorrectNetwork && (
        <div className="network-warning">
          <span>Wrong network - switch to {expectedNetworkName}</span>
          <button className="btn btn-ghost btn-small" onClick={switchNetwork} disabled={isSwitching}>
            {isSwitching ? "Switching..." : "Switch network"}
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default ConnectWallet;