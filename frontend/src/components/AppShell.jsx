import { useState } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useIdentity } from "../context/IdentityContext";
import ConnectWallet from "./ConnectWallet";
import RoleBadge from "./RoleBadge";
import { shortenAddress } from "../utils/format";

/**
 * Shared layout for every "inside the app" page: a left sidebar with nav links for whichever roles this wallet actually has, 
 * a top bar with the wallet pill + account menu, and a content area where the page renders. Pages that need this just do: 
 * <AppShell><Dashboard /></AppShell>
 *
 * Nav links are built from the wallet's real on-chain identity - a wallet can be the Admin *and* a registered Merchant/Customer 
 * at the same time (those are two unrelated facts, see IdentityContext), so this isn't a single role switch, 
 * it's a list of "sections you can see".
 */
function AppShell({ children }) {
  const { address, disconnect } = useWallet();
  const { role, isAdmin } = useIdentity();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    isAdmin && { to: "/admin", label: "Admin" },
    role === "MERCHANT" && { to: "/merchant", label: "Invoices" },
    role === "CUSTOMER" && { to: "/customer", label: "Payment history" },
  ].filter(Boolean);

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="brand-mark">CPG</span>
          <span>Crypto Payment Gateway</span>
        </Link>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className="sidebar-link">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <ConnectWallet />

          <div className="account-menu">
            <button type="button" className="account-trigger" onClick={() => setMenuOpen((open) => !open)}>
              <span className="mono">{shortenAddress(address)}</span>
              {isAdmin && <RoleBadge role="ADMIN" />}
              {role && <RoleBadge role={role} />}
            </button>

            {menuOpen && (
              <div className="account-dropdown" onMouseLeave={() => setMenuOpen(false)}>
                <button type="button" className="btn btn-ghost btn-small btn-block" onClick={disconnect}>
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="shell-content">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;