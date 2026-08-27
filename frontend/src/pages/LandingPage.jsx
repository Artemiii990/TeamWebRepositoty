import { Link, useLocation } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useIdentity } from "../context/IdentityContext";

// The "/" route. Works whether or not a wallet is connected - it's the one page in the app that's always reachable, 
// and it's where every RequireIdentity redirect sends people who don't have access yet.
function LandingPage() {
  const location = useLocation();
  const { isConnected, connect, isConnecting } = useWallet();
  const { role, isAdmin, isRegistered, isActive, isLoading } = useIdentity();

  // If a guarded page redirected here, remember where they were headed so we can offer a direct link back once they're set up.
  const cameFrom = location.state?.from?.pathname;

  return (
    <div className="landing">
      <header className="landing-nav">
        <span className="brand">
          <span className="brand-mark">CPG</span>
          <span>Crypto Payment Gateway</span>
        </span>
      </header>

      <section className="landing-hero">
        <h1>Get paid in ETH, invoice by invoice.</h1>
        <p className="landing-sub">
          Merchants create an invoice, customers pay it with MetaMask, and the smart contract settles it on-chain -
          no middleman, no card fees.
        </p>

        {!isConnected && (
          <button type="button" className="btn btn-stamp btn-large" onClick={connect} disabled={isConnecting}>
            {isConnecting ? "Connecting\u2026" : "Connect MetaMask to get started"}
          </button>
        )}

        {isConnected && isLoading && <p className="empty-state">Checking your wallet\u2026</p>}

        {isConnected && !isLoading && (
          <div className="landing-status-card">
            {isAdmin && (
              <Link to="/admin" className="btn btn-stamp btn-block">
                Go to Admin panel
              </Link>
            )}

            {isRegistered && isActive && (
              <Link to={role === "MERCHANT" ? "/merchant" : "/customer"} className="btn btn-stamp btn-block">
                Go to {role === "MERCHANT" ? "your invoices" : "your payment history"}
              </Link>
            )}

            {isRegistered && !isActive && (
              <p className="hint hint--warning">
                This wallet's account was deactivated by the admin. Contact them to be reactivated.
              </p>
            )}

            {!isRegistered && !isAdmin && (
              <>
                <p>This wallet isn't registered yet.</p>
                <Link to="/register" className="btn btn-stamp btn-block">
                  Register as Merchant or Customer
                </Link>
              </>
            )}

            {cameFrom && (
              <Link to={cameFrom} className="link-btn">
                Continue to the page you were trying to open
              </Link>
            )}
          </div>
        )}
      </section>

      <section className="landing-steps">
        <div className="landing-step">
          <span className="landing-step-no">1</span>
          <h3>Register your wallet</h3>
          <p>Pick Merchant or Customer once - it's a single on-chain transaction, no password to remember.</p>
        </div>
        <div className="landing-step">
          <span className="landing-step-no">2</span>
          <h3>Create or open an invoice</h3>
          <p>Merchants create invoices; customers get a payment link like /pay/1024.</p>
        </div>
        <div className="landing-step">
          <span className="landing-step-no">3</span>
          <h3>Pay with MetaMask</h3>
          <p>The contract confirms the payment on-chain and the backend verifies it independently.</p>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;