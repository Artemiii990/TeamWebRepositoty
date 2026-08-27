import { useState } from "react";
import { shortenHash, explorerTxUrl } from "../utils/format";

// Small reusable row that shows a shortened transaction hash with a copy button and, 
// if a block explorer URL is configured, a "View" link.
// Renders nothing when there's no hash yet (e.g. before a payment is sent).
function TransactionHashLink({ hash }) {
  const [copied, setCopied] = useState(false);

  if (!hash) return null;

  const url = explorerTxUrl(hash);

  // Copies the full (not shortened) hash to the clipboard and briefly flips the button label to "Copied" as feedback.
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API blocked (permissions, insecure context) - not fatal.
    }
  }

  return (
    <div className="tx-line">
      <span className="tx-label">Tx hash</span>
      <code className="tx-hash" title={hash}>
        {shortenHash(hash)}
      </code>
      <button type="button" className="link-btn" onClick={handleCopy}>
        {copied ? "Copied" : "Copy"}
      </button>
      {url && (
        <a className="link-btn" href={url} target="_blank" rel="noreferrer">
          View
        </a>
      )}
    </div>
  );
}

export default TransactionHashLink;