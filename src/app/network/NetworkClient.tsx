"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";

const COLOR_MAP: Record<string, string> = {
  exact_bytecode_match: "#34d399",
  near_exact_match: "#fbbf24",
  etherscan_verified: "#60a5fa",
  author_published_source: "#818cf8",
  unverified: "#555555",
};

const ERAS = [
  { key: "frontier", label: "Frontier", desc: "Jul 30, 2015 - Mar 14, 2016" },
  { key: "homestead", label: "Homestead", desc: "Mar 14 - Jul 20, 2016" },
  { key: "dao", label: "DAO Fork", desc: "Jul 20 - Oct 18, 2016" },
  { key: "tangerine", label: "Tangerine", desc: "Oct 18 - Nov 22, 2016" },
  { key: "spurious", label: "Spurious Dragon", desc: "Nov 22, 2016+" },
];

const VER_FILTERS = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified" },
  { key: "unverified", label: "Unverified" },
];

interface TT { x: number; y: number; label: string; sub: string; extra?: string; color?: string }

export default function NetworkClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const [era, setEra] = useState("frontier");
  const [vf, setVf] = useState("all");
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [tt, setTt] = useState<TT | null>(null);
  const [sel, setSel] = useState<{ name: string; addr: string; type: string; count?: number; method?: string } | null>(null);

  const eraInfo = ERAS.find((e) => e.key === era);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/visualizations/contracts?era=${era}&min=2&limit=15000`);
        const json = await res.json();
        if (cancelled) return;

        let data = json.contracts ?? [];
        if (vf === "verified") data = data.filter((c: Record<string,string>) => c.method && c.method !== "unverified");
        else if (vf === "unverified") data = data.filter((c: Record<string,string>) => !c.method || c.method === "unverified");

        setCount(data.length);
        render(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; cleanup(); };
  }, [era, vf]);

  function cleanup() {
    if (sigmaRef.current) { sigmaRef.current.kill(); sigmaRef.current = null; }
  }

  function render(data: Array<Record<string, string>>) {
    const el = containerRef.current;
    if (!el) return;
    cleanup();

    // Ensure container has dimensions
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      el.style.width = "100%";
      el.style.height = `${window.innerHeight - 44}px`;
    }

    const graph = new Graph();
    const deployers: Record<string, { name: string; count: number }> = {};

    data.forEach((c) => {
      const d = (c.deployer ?? "").toLowerCase();
      if (!d) return;
      if (!deployers[d]) deployers[d] = { name: c.deployerName || d.slice(0, 6) + "..." + d.slice(-4), count: 0 };
      deployers[d].count++;
    });

    Object.entries(deployers).forEach(([addr, info]) => {
      graph.addNode("d_" + addr, {
        label: info.name,
        size: Math.min(2 + Math.sqrt(info.count) * 1.2, 10),
        color: "#a78bfa",
        x: (Math.random() - 0.5) * 500,
        y: (Math.random() - 0.5) * 500,
        _type: "deployer",
        _addr: addr,
        _count: info.count,
      });
    });

    data.forEach((c, i) => {
      const d = (c.deployer ?? "").toLowerCase();
      if (!d || !deployers[d]) return;
      const m = c.method ?? "unverified";
      graph.addNode("c_" + i, {
        label: c.name && c.name !== "unnamed" ? c.name : "",
        size: 1,
        color: COLOR_MAP[m] ?? "#555",
        x: (Math.random() - 0.5) * 500,
        y: (Math.random() - 0.5) * 500,
        _type: "contract",
        _addr: c.address,
        _method: m,
      });
      graph.addEdge("d_" + d, "c_" + i, { color: "#0a0a12", size: 0.15 });
    });

    if (graph.order === 0) return;

    // Layout
    const iters = Math.min(120, Math.max(40, 5000 / graph.order));
    forceAtlas2.assign(graph, {
      iterations: iters,
      settings: { gravity: 0.5, scalingRatio: 30, barnesHutOptimize: graph.order > 500, strongGravityMode: true, slowDown: 3 },
    });

    const s = new Sigma(graph, el, {
      renderEdgeLabels: false,
      enableEdgeEvents: false,
      labelRenderedSizeThreshold: 5,
      labelColor: { color: "#aaa" },
      labelFont: "monospace",
      labelSize: 9,
      defaultEdgeColor: "#111118",
      stagePadding: 50,
    });

    s.on("enterNode", ({ node, event }) => {
      const a = graph.getNodeAttributes(node);
      setTt({
        x: (event as unknown as { x: number }).x + 12,
        y: (event as unknown as { y: number }).y - 8,
        label: a.label || a._addr?.slice(0, 10) || "",
        sub: a._addr?.slice(0, 10) + "..." || "",
        extra: a._count ? `${a._count} contracts` : a._method?.replace(/_/g, " "),
        color: a._type === "deployer" ? "#a78bfa" : a.color,
      });
    });
    s.on("leaveNode", () => setTt(null));
    s.on("clickNode", ({ node }) => {
      const a = graph.getNodeAttributes(node);
      setSel({ name: a.label || a._addr?.slice(0, 10) || "", addr: a._addr || "", type: a._type || "", count: a._count, method: a._method });
      if (a._type === "contract" && a._addr) window.open(`/contract/${a._addr}`, "_blank");
    });

    sigmaRef.current = s;
  }

  return (
    <div className="h-screen bg-[#050510] text-obsidian-50 flex flex-col overflow-hidden">
      <div className="px-3 sm:px-5 py-1.5 border-b border-obsidian-800 flex items-center gap-2 flex-wrap shrink-0 bg-obsidian-950/90">
        <Link href="/" className="text-sm font-bold text-obsidian-400 hover:text-ether-400 shrink-0">EH</Link>
        <span className="text-obsidian-700 text-xs">|</span>
        <span className="text-sm font-semibold text-obsidian-100 shrink-0">Network</span>
        <span className="text-[10px] text-obsidian-600 hidden sm:inline">
          {loading ? "..." : `${count}`} {!loading && eraInfo?.desc ? `(${eraInfo.desc})` : ""}
        </span>
        <div className="flex gap-1 ml-auto flex-wrap">
          {ERAS.map((e) => (
            <button key={e.key} onClick={() => setEra(e.key)}
              className={`px-1.5 py-0.5 rounded text-[10px] border ${era === e.key ? "bg-ether-900/40 text-ether-400 border-ether-500/40" : "bg-obsidian-800/50 text-obsidian-600 border-obsidian-700"}`}
              title={e.desc}>{e.label}</button>
          ))}
          <span className="w-px bg-obsidian-800 mx-0.5" />
          {VER_FILTERS.map((f) => (
            <button key={f.key} onClick={() => setVf(f.key)}
              className={`px-1.5 py-0.5 rounded text-[10px] border ${vf === f.key ? "bg-ether-900/40 text-ether-400 border-ether-500/40" : "bg-obsidian-800/50 text-obsidian-600 border-obsidian-700"}`}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 relative">
        <div ref={containerRef} style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />

        {sel && (
          <div className="absolute bottom-3 left-3 bg-obsidian-900/95 border border-obsidian-700 rounded-lg p-2.5 text-[11px] w-48 shadow-xl z-10">
            <button onClick={() => setSel(null)} className="absolute top-1 right-2 text-obsidian-600 hover:text-obsidian-300">x</button>
            <div className="text-ether-400 font-semibold mb-0.5">{sel.name}</div>
            <div className="text-obsidian-500 break-all text-[9px] mb-1">{sel.addr}</div>
            {sel.count ? <div className="text-obsidian-400">{sel.count} contracts</div> : null}
            {sel.method ? <div style={{ color: COLOR_MAP[sel.method] ?? "#999" }}>{sel.method.replace(/_/g, " ")}</div> : null}
          </div>
        )}

        <div className="absolute bottom-3 right-3 bg-obsidian-900/90 border border-obsidian-700 rounded-lg p-2 text-[9px] z-10">
          {[
            { l: "Deployer", c: "#a78bfa", s: 10 },
            { l: "Exact match", c: "#34d399", s: 6 },
            { l: "Near-exact", c: "#fbbf24", s: 6 },
            { l: "Etherscan", c: "#60a5fa", s: 6 },
            { l: "Unverified", c: "#555", s: 6 },
          ].map(({ l, c, s }) => (
            <div key={l} className="flex items-center gap-1.5 mb-0.5 text-obsidian-500">
              <div className="rounded-full" style={{ width: s, height: s, background: c }} />{l}
            </div>
          ))}
        </div>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#050510]/80 z-20">
            <span className="text-sm text-obsidian-400 animate-pulse">Loading graph...</span>
          </div>
        )}
      </div>

      {tt && (
        <div className="fixed z-50 pointer-events-none bg-obsidian-900 border border-obsidian-700 rounded px-2 py-1.5 text-[11px] shadow-xl"
          style={{ left: tt.x, top: tt.y }}>
          <div style={{ color: tt.color }} className="font-semibold">{tt.label}</div>
          <div className="text-obsidian-500">{tt.sub}</div>
          {tt.extra && <div className="text-obsidian-400 mt-0.5">{tt.extra}</div>}
        </div>
      )}
    </div>
  );
}
