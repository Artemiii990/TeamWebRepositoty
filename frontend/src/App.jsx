import { Navigate, BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import RegisterPage from "./pages/RegisterPage";
import MerchantPage from "./pages/MerchantPage";
import CustomerPage from "./pages/CustomerPage";
import AdminPage from "./pages/AdminPage";
import PaymentPage from "./pages/PaymentPage";

import AppShell from "./components/AppShell";
import RequireIdentity from "./components/RequireIdentity";
import { WalletProvider } from "./context/WalletContext";
import { IdentityProvider } from "./context/IdentityContext";
import { ToastProvider } from "./context/ToastContext";

function App() {
  return (
    // Provider order: Wallet first (nothing else works without it), Identity next (it reads the wallet), Toast is independent.
    <WalletProvider>
      <IdentityProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public: works with or without a connected wallet */}
              <Route path="/" element={<LandingPage />} />

              {/* Needs a wallet connected, but not yet registered - the page itself redirects onward if it turns out this
                  wallet is already registered or is the admin. */}
              <Route path="/register" element={<RegisterPage />} />

              {/* Only the on-chain admin wallet can see this */}
              <Route
                path="/admin"
                element={
                  <RequireIdentity role="ADMIN">
                    <AppShell>
                      <AdminPage />
                    </AppShell>
                  </RequireIdentity>
                }
              />

              {/* Only a registered, active Merchant wallet */}
              <Route
                path="/merchant"
                element={
                  <RequireIdentity role="MERCHANT">
                    <AppShell>
                      <MerchantPage />
                    </AppShell>
                  </RequireIdentity>
                }
              />

              {/* Only a registered, active Customer wallet */}
              <Route
                path="/customer"
                element={
                  <RequireIdentity role="CUSTOMER">
                    <AppShell>
                      <CustomerPage />
                    </AppShell>
                  </RequireIdentity>
                }
              />

              {/* Any connected wallet can open a payment link - the page itself checks whether this wallet can actually pay. */}
              <Route
                path="/pay/:invoiceId"
                element={
                  <RequireIdentity>
                    <AppShell>
                      <PaymentPage />
                    </AppShell>
                  </RequireIdentity>
                }
              />

              {/* Unknown URL -> send home rather than showing a dead end */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </IdentityProvider>
    </WalletProvider>
  );
}

export default App;