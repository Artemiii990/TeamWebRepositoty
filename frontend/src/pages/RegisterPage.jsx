import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useIdentity } from "../context/IdentityContext";
import { registerUserOnChain, UserRoleValue } from "../services/blockchain";
import { registerUser as registerUserApi } from "../services/api";

const ROLE_OPTIONS = [
  { value: "MERCHANT", title: "Merchant", blurb: "Create invoices and get paid." },
  { value: "CUSTOMER", title: "Customer", blurb: "Pay invoices you receive." },
];

// The app's "sign up" page. There's no password anywhere - registering means signing one on-chain transaction 
// (UserRegistry.registerUser) with the connected wallet, then telling the backend the tx hash so it can verify the event and 
// mirror the account into its own database.
function RegisterPage() {
  const navigate = useNavigate();
  const { isConnected, connect, isConnecting } = useWallet();
  const { isRegistered, isAdmin, isActive, role, refresh } = useIdentity();

  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState("MERCHANT");
  const [step, setStep] = useState("idle"); // idle | signing | syncing | error
  const [error, setError] = useState("");

  // Already signed up and in good standing (or is the admin, which doesn't need a Merchant/Customer registration) - 
  // nothing to do here, send them onward.
  if (isRegistered && isActive) {
    return <Navigate to={role === "MERCHANT" ? "/merchant" : "/customer"} replace />;
  }
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Registered but deactivated - show this instead of the form. 
  // Trying to register again would just revert on-chain ("User already registered").
  if (isRegistered && !isActive) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <span className="brand-mark">CPG</span>
          <h1>Account deactivated</h1>
          <p className="subtitle">
            This wallet was registered as {role?.toLowerCase()}, but the admin has deactivated it. Contact them to
            be reactivated.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Enter a display name.");
      return;
    }

    try {
      setStep("signing");
      const txHash = await registerUserOnChain(name.trim(), UserRoleValue[selectedRole]);

      setStep("syncing");
      await registerUserApi(txHash);

      await refresh();
      navigate(selectedRole === "MERCHANT" ? "/merchant" : "/customer");
    } catch (err) {
      setStep("error");
      setError(err.message || "Registration failed.");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="brand-mark">CPG</span>
        <h1>Create your account</h1>
        <p className="subtitle">One on-chain transaction - no password to set or forget.</p>

        {!isConnected ? (
          <button type="button" className="btn btn-stamp btn-block" onClick={connect} disabled={isConnecting}>
            {isConnecting ? "Connecting\u2026" : "Connect MetaMask first"}
          </button>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="display-name">Display name</label>
            <input
              id="display-name"
              type="text"
              placeholder="Jane's Electronics"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={step === "signing" || step === "syncing"}
            />

            <label>I am a\u2026</label>
            <div className="role-picker">
              {ROLE_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`role-option ${selectedRole === option.value ? "role-option--active" : ""}`}
                  onClick={() => setSelectedRole(option.value)}
                  disabled={step === "signing" || step === "syncing"}
                >
                  <strong>{option.title}</strong>
                  <span>{option.blurb}</span>
                </button>
              ))}
            </div>

            <button type="submit" className="btn btn-stamp btn-block" disabled={step === "signing" || step === "syncing"}>
              {step === "signing"
                ? "Confirm in MetaMask\u2026"
                : step === "syncing"
                ? "Syncing with backend\u2026"
                : "Register on-chain"}
            </button>

            {error && <p className="error">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

export default RegisterPage;