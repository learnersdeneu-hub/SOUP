"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyReplyAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked (permissions, insecure context) —
      // the address is still selectable text either way.
    }
  }

  return (
    <button onClick={copy} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-hair px-3 py-2 text-[11px] font-semibold text-ink hover:border-navy" title={address}>
      <span className="select-all font-mono">{address}</span>
      {copied ? <Check size={12} className="text-teal" /> : <Copy size={12} />}
    </button>
  );
}
