"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { Header } from "@/components/Header";

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

const YEARS = [2015, 2016, 2017];
const VERIFICATION_FILTERS = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified only" },
  { key: "unverified", label: "Unverified only" },
];

export default function NetworkPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<ContractNode, Link> | null>(null);
  const [selected, setSelected] = useState<ContractNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: ContractNode } | null>(null);
  const [activeYears, setActiveYears] = useState<Set<number>>(new Set([2015]));
  const [verFilter, setVerFilter] = useState("all");
  const [contractCount, setContractCount] = useState(0);

  const toggleYear = useCallback((year: number) => {
    setActiveYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        if (next.size > 1) next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const yearParams = Array.from(activeYears).map((y) => `year=${y}`).join("&");
        const res = await fetch(`/api/visualizations/contracts?${yearParams}&limit=5000`);
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
            // Priority: deployer ENS name from API, then truncated address
            const deployerLabel = c.deployerName || dep.slice(0, 6) + "..." + dep.slice(-4);
            deployers[dep] = {
              id: "d_" + dep,
              type: "deployer",
              address: dep,
              name: deployerLabel,
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
    return () => {
      if (simRef.current) simRef.current.stop();
    };
  }, [activeYears, verFilter]);

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
        .scaleExtent([0.15, 4])
        .on("zoom", (e) => g.attr("transform", e.transform))
    );

    const sim = d3.forceSimulation<ContractNode>(nodes)
      .force("link", d3.forceLink<ContractNode, Link>(links).id((d) => d.id)
        .distance((d) => ((d.source as ContractNode).type === "deployer" ? 80 : 40))
        .strength(0.7))
      .force("charge", d3.forceManyBody<ContractNode>().strength((d) => (d.type === "deployer" ? -300 : -40)))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collision", d3.forceCollide<ContractNode>().radius((d) => (d.type === "deployer" ? 24 : 8)));

    simRef.current = sim;

    const link = g.append("g").selectAll("line").data(links).join("line")
      .attr("stroke", "#1a1a2e").attr("stroke-width", 0.8).attr("stroke-opacity", 0.4);

    const node = g.append("g").selectAll("g").data(nodes).join("g")
      .style("cursor", "pointer")
      .call(d3.drag<SVGGElement, ContractNode>()
        .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }) as any);

    node.append("circle")
      .attr("r", (d) => {
        if (d.type === "deployer") return Math.min(8 + (d.contractCount ?? 0) * 1.5, 24);
        return 5;
      })
      .attr("fill", (d) => (d.type === "deployer" ? "#100a1f" : (COLOR_MAP[d.method ?? ""] ?? "#374151")))
      .attr("stroke", (d) => (d.type === "deployer" ? "#a78bfa" : (COLOR_MAP[d.method ?? ""] ?? "#555")))
      .attr("stroke-width", (d) => (d.type === "deployer" ? 2 : 1.2))
      .attr("fill-opacity", (d) => (d.type === "deployer" ? 0.9 : 0.8));

    // Deployer labels
    node.filter((d) => d.type === "deployer").append("text")
      .attr("dy", (d) => Math.min(8 + (d.contractCount ?? 0) * 1.5, 24) + 14)
      .attr("text-anchor", "middle")
      .attr("font-size", 9)
      .attr("fill", "#555")
      .text((d) => d.name.length > 20 ? d.name.slice(0, 18) + ".." : d.name);

    // Small contract labels
    node.filter((d) => d.type === "contract").append("text")
      .attr("dy", -9)
      .attr("text-anchor", "middle")
      .attr("font-size", 7)
      .attr("fill", "#2a2a3e")
      .text((d) => (d.name && d.name !== "unnamed" && d.name.length <= 14) ? d.name : "");

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

  return (
    <div className="min-h-screen bg-obsidian-950 text-obsidian-50 flex flex-col">
      <Header />
      <div className="px-6 py-4 border-b border-obsidian-800">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">Deployer Network</h1>
            <p className="text-xs text-obsidian-500 mt-1">
              Drag nodes, scroll to zoom, click contracts to open.
              {loading && <span className="ml-2 text-ether-500">Loading...</span>}
              {!loading && <span className="ml-2">{contractCount} contracts</span>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-obsidian-600 self-center mr-1">Year:</span>
            {YEARS.map((y) => (
              <button key={y} onClick={() => toggleYear(y)}
                className={`px-3 py-1 rounded text-xs border transition-colors ${
                  activeYears.has(y)
                    ? "bg-ether-900/40 text-ether-400 border-ether-500/40"
                    : "bg-obsidian-800/50 text-obsidian-600 border-obsidian-700 hover:text-obsidian-400"
                }`}>{y}</button>
            ))}
            <div className="w-px bg-obsidian-800 mx-1" />
            {VERIFICATION_FILTERS.map((f) => (
              <button key={f.key} onClick={() => setVerFilter(f.key)}
                className={`px-3 py-1 rounded text-xs border transition-colors ${
                  verFilter === f.key
                    ? "bg-ether-900/40 text-ether-400 border-ether-500/40"
                    : "bg-obsidian-800/50 text-obsidian-600 border-obsidian-700 hover:text-obsidian-400"
                }`}>{f.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <svg ref={svgRef} className="w-full h-full" style={{ minHeight: "calc(100vh - 160px)" }} />

        {selected && (
          <div className="absolute bottom-6 left-6 bg-obsidian-900 border border-obsidian-700 rounded-lg p-4 text-xs w-64 shadow-xl">
            <button onClick={() => setSelected(null)} className="absolute top-2 right-2 text-obsidian-600 hover:text-obsidian-300">x</button>
            <div className="text-ether-400 font-semibold mb-2">{selected.name}</div>
            <div className="text-obsidian-500 mb-3 break-all text-[10px]">{selected.address}</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-obsidian-600">type</span>
                <span className="text-obsidian-300">{selected.type}</span>
              </div>
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

        <div className="absolute bottom-6 right-6 bg-obsidian-900 border border-obsidian-700 rounded-lg p-4 text-xs">
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
          <div className="text-obsidian-500">{tooltip.node.address.slice(0, 8)}...</div>
          {tooltip.node.contractCount !== undefined && tooltip.node.contractCount > 0 && (
            <div className="text-obsidian-400 mt-1">{tooltip.node.contractCount} contracts</div>
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
