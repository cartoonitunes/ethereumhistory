"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import Link from "next/link";

interface ContractNode {
  id: string;
  type: "deployer" | "contract";
  address: string;
  name: string;
  method?: string;
  date?: string;
  contractCount?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: string | ContractNode;
  target: string | ContractNode;
}

const COLOR_MAP: Record<string, string> = {
  exact_bytecode_match: "#34d399",
  near_exact_match: "#fbbf24",
  etherscan_verified: "#60a5fa",
  author_published_source: "#818cf8",
  unverified: "#374151",
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

export default function NetworkPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<ContractNode, Link> | null>(null);
  const [selected, setSelected] = useState<ContractNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: ContractNode } | null>(null);
  const [activeEra, setActiveEra] = useState("frontier");
  const [verFilter, setVerFilter] = useState("all");
  const [contractCount, setContractCount] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/visualizations/contracts?era=${activeEra}&min=3&limit=10000`);
        const json = await res.json();
        const data = json.contracts ?? [];

        const deployers: Record<string, ContractNode> = {};
        const contractNodes: ContractNode[] = [];
        const links: Link[] = [];

        let filtered = data;
        if (verFilter === "verified") {
          filtered = data.filter((c: Record<string, string>) => c.method && c.method !== "unverified");
        } else if (verFilter === "unverified") {
          filtered = data.filter((c: Record<string, string>) => !c.method || c.method === "unverified");
        }

        filtered.forEach((c: Record<string, string>, i: number) => {
          const dep = (c.deployer ?? "").toLowerCase();
          if (!dep) return;
          if (!deployers[dep]) {
            deployers[dep] = {
              id: "d_" + dep,
              type: "deployer",
              address: dep,
              name: c.deployerName || dep.slice(0, 6) + "..." + dep.slice(-4),
              contractCount: 0,
            };
          }
          deployers[dep].contractCount = (deployers[dep].contractCount ?? 0) + 1;

          const node: ContractNode = {
            id: "c_" + i,
            type: "contract",
            address: c.address,
            name: c.name ?? "unnamed",
            method: c.method ?? "unverified",
            date: (c.ts ?? "").slice(0, 10),
          };
          contractNodes.push(node);
          links.push({ source: "d_" + dep, target: node.id });
        });

        setContractCount(contractNodes.length);
        const nodes: ContractNode[] = [...Object.values(deployers), ...contractNodes];
        drawGraph(nodes, links);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { if (simRef.current) simRef.current.stop(); };
  }, [activeEra, verFilter]);

  function drawGraph(nodes: ContractNode[], links: Link[]) {
    if (!svgRef.current) return;
    if (simRef.current) simRef.current.stop();

    const el = svgRef.current;
    const W = el.clientWidth || window.innerWidth;
    const H = el.clientHeight || window.innerHeight - 160;

    d3.select(el).selectAll("*").remove();
    d3.select(el).attr("width", W).attr("height", H);
    const g = d3.select(el).append("g");

    d3.select(el).call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 5])
        .on("zoom", (e) => g.attr("transform", e.transform))
    );

    const sim = d3.forceSimulation<ContractNode>(nodes)
      .force("link", d3.forceLink<ContractNode, Link>(links).id((d) => d.id)
        .distance(() => 60).strength(0.6))
      .force("charge", d3.forceManyBody<ContractNode>().strength((d) => (d.type === "deployer" ? -250 : -30)))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collision", d3.forceCollide<ContractNode>().radius((d) => (d.type === "deployer" ? 22 : 6)));
    simRef.current = sim;

    const link = g.append("g").selectAll("line").data(links).join("line")
      .attr("stroke", "#1a1a2e").attr("stroke-width", 0.6).attr("stroke-opacity", 0.35);

    const node = g.append("g").selectAll("g").data(nodes).join("g")
      .style("cursor", "pointer")
      .call(d3.drag<SVGGElement, ContractNode>()
        .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }) as any);

    node.append("circle")
      .attr("r", (d) => d.type === "deployer" ? Math.min(7 + (d.contractCount ?? 0) * 1.2, 22) : 4)
      .attr("fill", (d) => d.type === "deployer" ? "#100a1f" : (COLOR_MAP[d.method ?? ""] ?? "#374151"))
      .attr("stroke", (d) => d.type === "deployer" ? "#a78bfa" : (COLOR_MAP[d.method ?? ""] ?? "#555"))
      .attr("stroke-width", (d) => d.type === "deployer" ? 2 : 1)
      .attr("fill-opacity", (d) => d.type === "deployer" ? 0.9 : 0.8);

    node.filter((d) => d.type === "deployer").append("text")
      .attr("dy", (d) => Math.min(7 + (d.contractCount ?? 0) * 1.2, 22) + 12)
      .attr("text-anchor", "middle").attr("font-size", 9).attr("fill", "#555")
      .text((d) => d.name.length > 18 ? d.name.slice(0, 16) + ".." : d.name);

    node
      .on("mousemove", (event: MouseEvent, d: ContractNode) => setTooltip({ x: event.clientX, y: event.clientY, node: d }))
      .on("mouseleave", () => setTooltip(null))
      .on("click", (_: MouseEvent, d: ContractNode) => {
        setSelected(d);
        if (d.type === "contract") window.open(`/contract/${d.address}`, "_blank");
      });

    sim.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as ContractNode).x ?? 0)
        .attr("y1", (d) => (d.source as ContractNode).y ?? 0)
        .attr("x2", (d) => (d.target as ContractNode).x ?? 0)
        .attr("y2", (d) => (d.target as ContractNode).y ?? 0);
      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });
  }

  const eraInfo = ERAS.find((e) => e.key === activeEra); const eraLabel = eraInfo?.label ?? activeEra; const eraDesc = eraInfo?.desc ?? "";

  return (
    <div className="min-h-screen bg-obsidian-950 text-obsidian-50 flex flex-col">
      {/* Compact header bar */}
      <div className="px-3 sm:px-6 py-2 border-b border-obsidian-800 flex items-center gap-3 flex-wrap">
        <Link href="/" className="text-sm font-semibold text-obsidian-400 hover:text-ether-400 transition-colors shrink-0">
          EH
        </Link>
        <span className="text-obsidian-700">|</span>
        <span className="text-sm font-semibold text-obsidian-100 shrink-0">Network</span>
        <span className="text-xs text-obsidian-600 hidden sm:inline">
          {loading ? "Loading..." : `${contractCount} contracts`}
          {!loading && eraDesc ? ` (${eraDesc})` : ""}
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

      <div className="flex-1 relative">
        <svg ref={svgRef} className="w-full h-full" style={{ minHeight: "calc(100vh - 160px)" }} />

        {selected && (
          <div className="absolute bottom-6 left-6 bg-obsidian-900 border border-obsidian-700 rounded-lg p-4 text-xs w-64 shadow-xl">
            <button onClick={() => setSelected(null)} className="absolute top-2 right-3 text-obsidian-600 hover:text-obsidian-300 text-sm">x</button>
            <div className="text-ether-400 font-semibold mb-2">{selected.name}</div>
            <div className="text-obsidian-500 mb-3 break-all text-[10px]">{selected.address}</div>
            <div className="space-y-1">
              {selected.date && (
                <div className="flex justify-between">
                  <span className="text-obsidian-600">deployed</span>
                  <span className="text-obsidian-300">{selected.date}</span>
                </div>
              )}
              {selected.contractCount !== undefined && selected.contractCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-obsidian-600">contracts</span>
                  <span className="text-obsidian-300">{selected.contractCount}</span>
                </div>
              )}
              {selected.method && (
                <div className="flex justify-between">
                  <span className="text-obsidian-600">status</span>
                  <span style={{ color: COLOR_MAP[selected.method] ?? "#999" }}>
                    {selected.method.replace(/_/g, " ")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="absolute bottom-6 right-6 bg-obsidian-900 border border-obsidian-700 rounded-lg p-3 text-xs">
          <div className="text-obsidian-600 mb-2 tracking-wide text-[10px]">LEGEND</div>
          {[
            { label: "Deployer", color: "#a78bfa", large: true },
            { label: "Exact match", color: "#34d399" },
            { label: "Near-exact", color: "#fbbf24" },
            { label: "Etherscan", color: "#60a5fa" },
            { label: "Unverified", color: "#374151" },
          ].map(({ label, color, large }) => (
            <div key={label} className="flex items-center gap-2 mb-1 text-obsidian-500">
              <div className="rounded-full flex-shrink-0"
                style={{ width: large ? 12 : 7, height: large ? 12 : 7, background: large ? "#100a1f" : color,
                  border: `${large ? 2 : 1}px solid ${color}` }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {tooltip && (
        <div className="fixed z-50 pointer-events-none bg-obsidian-900 border border-obsidian-700 rounded-lg px-3 py-2 text-xs shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}>
          <div className="text-ether-400 font-semibold">{tooltip.node.name}</div>
          <div className="text-obsidian-500">{tooltip.node.address.slice(0, 10)}...</div>
          {tooltip.node.contractCount !== undefined && tooltip.node.contractCount > 0 && (
            <div className="text-obsidian-400 mt-1">{tooltip.node.contractCount} contracts deployed</div>
          )}
          {tooltip.node.method && (
            <div style={{ color: COLOR_MAP[tooltip.node.method] ?? "#999" }} className="mt-1">
              {tooltip.node.method.replace(/_/g, " ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
