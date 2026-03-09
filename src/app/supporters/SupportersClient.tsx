"use client";

import { useState } from "react";
import { ClaimModal } from "./ClaimModal";

export function ClaimButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ether-600 hover:bg-ether-500 text-white font-medium transition-colors"
      >
        Claim your donation
      </button>
      {open && <ClaimModal onClose={() => setOpen(false)} />}
    </>
  );
}
