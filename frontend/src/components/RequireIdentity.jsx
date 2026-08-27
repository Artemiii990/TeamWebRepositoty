import { Navigate, useLocation } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useIdentity } from "../context/IdentityContext";

// Route guard used in App.jsx. Three ways to call it:
//   <RequireIdentity>              - just needs a connected wallet
//   <RequireIdentity role="ADMIN"> - needs to be the on-chain admin wallet
//   <RequireIdentity role="MERCHANT"> (or "CUSTOMER") - needs to be registered on-chain with that role AND still active
function RequireIdentity({ role, children }) {
  const { isConnected } = useWallet();
  const { role: myRole, isAdmin, isActive, isLoading } = useIdentity();
  const location = useLocation();

  if (!isConnected) {
    // Send them to the landing page to connect - it remembers where they were trying to go via location.state.from 
    // (see pages/LandingPage.jsx).
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (isLoading) {
    return (
      <div className="page">
        <p className="empty-state">Checking your wallet\u2026</p>
      </div>
    );
  }

  if (role === "ADMIN" && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (role === "MERCHANT" || role === "CUSTOMER") {
    if (myRole !== role) {
      // Not registered with this role at all yet - send them to sign up.
      return <Navigate to="/register" replace />;
    }
    if (!isActive) {
      // Registered with the right role, but the admin deactivated the account - show this in place rather than redirecting to
      // /register, which would just bounce them back here in a loop (the on-chain registerUser() call reverts for an already-
      // registered wallet, so re-registering isn't actually possible).
      return (
        <div className="page">
          <p className="hint hint--warning">
            Your account has been deactivated by the admin. Contact them to be reactivated.
          </p>
        </div>
      );
    }
  }

  return children;
}

export default RequireIdentity;