const STEPS = [
  { key: "WAITING_PAYMENT", label: "Waiting", stamp: "W" },
  { key: "PAID", label: "Paid", stamp: "P" },
  { key: "CONFIRMED", label: "Confirmed", stamp: "C" },
];

export function getDisplayStage({ status, blockchainInvoiceId }) {
  const isRegistered = blockchainInvoiceId !== null && blockchainInvoiceId !== undefined;

  if (status === "PAID") {
    return { activeIndex: 2, subLabel: null };
  }

  if (!isRegistered) {
    return { activeIndex: 0, subLabel: "Registering on-chain\u2026" };
  }

  return { activeIndex: 0, subLabel: null };
}

// The visual piece: renders three "stamps" (Waiting/Paid/Confirmed) with
// the completed ones "inked" in blue and connected by a dashed perforation line. 
// `compact` shrinks it for use inside list cards.
function StatusTracker({ status, blockchainInvoiceId, compact = false }) {
  const { activeIndex, subLabel } = getDisplayStage({ status, blockchainInvoiceId });

  return (
    <div className={`stamp-tracker ${compact ? "stamp-tracker--compact" : ""}`}>
      {STEPS.map((step, index) => {
        const isDone = index <= activeIndex;
        const isCurrent = index === activeIndex;

        return (
          <div className="stamp-step" key={step.key}>
            <div
              className={`stamp ${isDone ? "stamp--inked" : "stamp--blank"} ${
                isCurrent ? "stamp--current" : ""
              }`}
              aria-hidden="true"
            >
              {step.stamp}
            </div>
            <span className="stamp-label">{step.label}</span>
            {isCurrent && subLabel && <span className="stamp-sublabel">{subLabel}</span>}
            {index < STEPS.length - 1 && <span className="stamp-perforation" aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}

export default StatusTracker;