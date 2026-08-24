import {
  BrowserRouter,
  Routes,
  Route,
  Link,
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import PaymentPage from "./pages/PaymentPage";

function App() {
  return (
    <BrowserRouter>
      <nav className="navbar">
        <Link to="/">
          Merchant Dashboard
        </Link>
      </nav>

      <Routes>
        <Route
          path="/"
          element={<Dashboard />}
        />

        <Route
          path="/pay/:invoiceId"
          element={<PaymentPage />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;