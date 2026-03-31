"use client";

import dynamic from "next/dynamic";

const NetworkClient = dynamic(() => import("./NetworkClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-obsidian-950 flex items-center justify-center">
      <span className="text-sm text-obsidian-400 animate-pulse">Loading network...</span>
    </div>
  ),
});

export default function NetworkPage() {
  return <NetworkClient />;
}
