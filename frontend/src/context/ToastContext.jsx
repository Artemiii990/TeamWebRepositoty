import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

let idCounter = 0;

// Small notification system used across the app (e.g. "Invoice #12 created", "Could not refresh that invoice"). 
// Renders a fixed stack of dismissible banners in the bottom-right corner - see the .toast-stack CSS in index.css.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  // Keeps each toast's auto-dismiss timer so it can be cancelled if the toast is dismissed early (clicked) or the id gets reused.
  const timers = useRef({});

  // Removes a toast immediately and clears its pending auto-dismiss timer.
  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  // Adds a new toast and schedules it to auto-dismiss after `duration` ms.
  const push = useCallback(
    (message, variant = "info", duration = 5000) => {
      const id = ++idCounter;
      setToasts((current) => [...current, { id, message, variant }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  // Public API other components use: toast.success("..."), toast.error("..."). 
  // Errors stay on screen longer (7s vs 5s) since they usually need reading twice.
  const value = {
    success: (message) => push(message, "success"),
    error: (message) => push(message, "error", 7000),
    info: (message) => push(message, "info"),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.variant}`} onClick={() => dismiss(toast.id)}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Convenience hook - `const toast = useToast(); toast.success("Saved!")`.
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside a ToastProvider");
  return ctx;
}
