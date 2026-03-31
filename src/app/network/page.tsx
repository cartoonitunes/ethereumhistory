"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  { key: "homestead", label: "Homestead", desc: "Mar 14, 2016 - Jul 20, 2016" },
  { key: "dao", label: "DAO Fork", desc: "Jul 20, 2016 - Oct 18, 2016" },
  { key: "tangerine", label: "Tangerine", desc: "Oct 18, 2016 - Nov 22, 2016" },
  { key: "spurious", label: "Spurious Dragon", desc: "Nov 22, 2016 - Oct 16, 2017" },
];

const VER_FILTERS = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified" },
  { key: "unverified", label: "Unverified" },
];

interface TooltipData {
  x: number;
  y: number;
  name: string;
  address: string;
  type: string;
  method?: string;
  count?: number;
}

export default function NetworkPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const [activeEra, setActiveEra] = useState("frontier");
  const [verFilter, setVerFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [contractCount, setContractCount] = useState(0);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [selected, setSelected] = useState<TooltipData | null>(null);

  const eraInfo = ERAS.find((e) => e.key === activeEra);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/visualizations/contracts?era=${activeEra}&min=2&limit=15000`);
        const json = await res.json();
        let data = json.contracts ?? [];

        if (verFilter === "verified") {
          data = data.filter((c: Record<string, string>) => c.method && c.method !== "unverified");
        } else if (verFilter === "unverified") {
          data = data.filter((c: Record<string, string>) => !c.method || c.method === "unverified");
        }

        buildGraph(data);
        setContractCount(data.length);
      } finally {
        setLoading(false);
      }
    }
    load();

    return () => {
      if (sigmaRef.current) {
        sigmaRef.current.kill();
        sigmaRef.current = null;
      }
    };
  }, [activeEra, verFilter]);

  function buildGraph(data: Array<Record<string, string>>) {
    if (!containerRef.current) return;
    if (sigmaRef.current) {
      sigmaRef.current.kill();
      sigmaRef.current = null;
    }

    const graph = new Graph();
    const deployers: Record<string, { name: string; count: number }> = {};

    // First pass: count deployers
    data.forEach((c) => {
      const dep = (c.deployer ?? "").toLowerCase();
      if (!dep) return;
      if (!deployers[dep]) {
        deployers[dep] = { name: c.deployerName || dep.slice(0, 6) + "..." + dep.slice(-4), count: 0 };
      }
      deployers[dep].count++;
    });

    // Add deployer nodes
    Object.entries(deployers).forEach(([addr, info]) => {
      const id = "d_" + addr;
      if (!graph.hasNode(id)) {
        graph.addNode(id, {
          label: info.name,
          size: Math.min(4 + info.count * 0.8, 20),
          color: "#a78bfa",
          x: Math.random() * 100,
          y: Math.random() * 100,
          type: "deployer",
          address: addr,
          contractCount: info.count,
        });
      }
    });

    // Add contract nodes + edges
    data.forEach((c, i) => {
      const dep = (c.deployer ?? "").toLowerCase();
      if (!dep || !deployers[dep]) return;
      const cid = "c_" + i;
      const method = c.method ?? "unverified";
      graph.addNode(cid, {
        label: c.name || "",
        size: 2,
        color: COLOR_MAP[method] ?? "#555",
        x: Math.random() * 100,
        y: Math.random() * 100,
        type: "contract",
        address: c.address,
        method,
      });
      graph.addEdge("d_" + dep, cid, { size: 0.3, color: "#1a1a2e" });
    });

    // Run ForceAtlas2 layout synchronously for a fixed number of iterations
    const iterations = Math.min(100, Math.max(30, 5000 / graph.order));
    forceAtlas2.assign(graph, {
      iterations,
      settings: {
        gravity: 1,
        scalingRatio: 10,
        barnesHutOptimize: true,
        barnesHutTheta: 0.8,
        strongGravityMode: true,
        slowDown: 5,
      },
    });

    // Create Sigma instance
    const sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      enableEdgeEvents: false,
      defaultEdgeColor: "#1a1a2e",
      defaultEdgeType: "line",
      labelRenderedSizeThreshold: 8,
      labelColor: { color: "#888" },
      labelFont: "Courier New, monospace",
      labelSize: 11,
    });

    // Hover events
    sigma.on("enterNode", ({ node, event }) => {
      const attrs = graph.getNodeAttributes(node);
      setTooltip({
        x: event.x,
        y: event.y,
        name: attrs.label || attrs.address?.slice(0, 10),
        address: attrs.address || "",
        type: attrs.type || "contract",
        method: attrs.method,
        count: attrs.contractCount,
      });
    });

    sigma.on("leaveNode", () => setTooltip(null));

    sigma.on("clickNode", ({ node }) => {
      const attrs = graph.getNodeAttributes(node);
      const info: TooltipData = {
        x: 0, y: 0,
        name: attrs.label || attrs.address?.slice(0, 10),
        address: attrs.address || "",
        type: attrs.type || "contract",
        method: attrs.method,
        count: attrs.contractCount,
      };
      setSelected(info);
      if (attrs.type === "contract" && attrs.address) {
        window.open(`/contract/${attrs.address}`, "_blank");
      }
    });

    sigmaRef.current = sigma;
  }

  return (
    <div className="min-h-screen bg-obsidian-950 text-obsidian-50 flex flex-col">
      {/* Compact header */}
      <div className="px-3 sm:px-6 py-2 border-b border-obsidian-800 flex items-center gap-3 flex-wrap shrink-0">
        <Link href="/" className="text-sm font-semibold text-obsidian-400 hover:text-ether-400 transition-colors shrink-0">
          EH
        </Link>
        <span className="text-obsidian-700">|</span>
        <span className="text-sm font-semibold text-obsidian-100 shrink-0">Network</span>
        <span className="text-xs text-obsidian-600 hidden sm:inline">
          {loading ? "Loading..." : `${contractCount} contracts`}
          {!loading && eraInfo?.desc ? ` (${eraInfo.desc})` : ""}
        </span>
        <div className="flex gap-1.5 ml-auto flex-wrap">
          {ERAS.map((e) => (
            <button key={e.key} onClick={() => setActiveEra(e.key)}
              className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                activeEra === e.key
                  ? "bg-ether-900/40 text-ether-400 border-ether-500/40"
                  : "bg-obsidian-800/50 text-obsidian-600 border-obsidian-700 hover:text-obsidian-400"
              }`}
              title={e.desc}>{e.label}</button>
          ))}
          <span className="w-px bg-obsidian-800 mx-0.5" />
          {VER_FILTERS.map((f) => (
            <button key={f.key} onClick={() => setVerFilter(f.key)}
              className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                verFilter === f.key
                  ? "bg-ether-900/40 text-ether-400 border-ether-500/40"
                  : "bg-obsidian-800/50 text-obsidian-600 border-obsidian-700 hover:text-obsidian-400"
              }`}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Graph container */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full" style={{ minHeight: "calc(100vh - 44px)", background: "#050510" }} />

        {/* Selected panel */}
        {selected && (
          <div className="absolute bottom-4 left-4 bg-obsidian-900/95 border border-obsidian-700 rounded-lg p-3 text-xs w-56 shadow-xl">
            <button onClick={() => setSelected(null)} className="absolute top-1.5 right-2 text-obsidian-600 hover:text-obsidian-300 text-sm">x</button>
            <div className="text-ether-400 font-semibold mb-1">{selected.name}</div>
            <div className="text-obsidian-500 break-all text-[10px] mb-2">{selected.address}</div>
            {selected.count !== undefined && selected.count > 0 && (
              <div className="text-obsidian-400">{selected.count} contracts</div>
            )}
            {selected.method && (
              <div style={{ color: COLOR_MAP[selected.method] ?? "#999" }} className="mt-1">
                {selected.method.replace(/_/g, " ")}
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-obsidian-900/95 border border-obsidian-700 rounded-lg p-3 text-[10px]">
          {[
            { label: "Deployer", color: "#a78bfa", large: true },
            { label: "Exact match", color: "#34d399" },
            { label: "Near-exact", color: "#fbbf24" },
            { label: "Etherscan", color: "#60a5fa" },
            { label: "Unverified", color: "#555555" },
          ].map(({ label, color, large }) => (
            <div key={label} className="flex items-center gap-1.5 mb-0.5 text-obsidian-500">
              <div className="rounded-full flex-shrink-0"
                style={{ width: large ? 10 : 6, height: large ? 10 : 6, background: color }} />
              {label}
            </div>
          ))}
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-obsidian-950/80">
            <span className="text-sm text-obsidian-400 animate-pulse">Loading graph...</span>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed z-50 pointer-events-none bg-obsidian-900 border border-obsidian-700 rounded-lg px-3 py-2 text-xs shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}>
          <div className="text-ether-400 font-semibold">{tooltip.name}</div>
          <div className="text-obsidian-500">{tooltip.address.slice(0, 10)}...</div>
          {tooltip.count !== undefined && tooltip.count > 0 && (
            <div className="text-obsidian-400 mt-0.5">{tooltip.count} contracts</div>
          )}
          {tooltip.method && (
            <div style={{ color: COLOR_MAP[tooltip.method] ?? "#999" }} className="mt-0.5">
              {tooltip.method.replace(/_/g, " ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
