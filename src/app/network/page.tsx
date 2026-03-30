"use client";

import { useEffect, useRef, useState } from "react";
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
  source_identified: "#c084fc",
  unverified: "#374151",
};

const KNOWN_DEPLOYERS: Record<string, string> = {
  "0x9af6e34b07dd5d49cd9614df1d5d21ef8d4e1aac": "Frontier Pioneer",
  "0x8674c218f0351a62c3ba78c34fd2182a93da94e2": "Messaging Dev",
  "0xfd2605a2bf58fdbb90db1da55df61628b47f9e8c": "Prolific Builder",
  "0x3d0768da09ce77d25e2d998e6a7b6ed4b9116c2d": "ChainLetter Dev",
  "0xc70ba22fe446a85a247bf85bad1addf3ddaf62e9": "Game Dev",
  "0xd1220a0cf47c7b9be7a2e6ba89f429762e7b9adb": "avsa (Alex VdS)",
  "0x000001f568875f378bf6d170b790967ce429928": "Ethereum Foundation",
  "0xc77555f3f080230ad10cd8b8f615000af4255687": "Tutorial Dev",
};

export default function NetworkPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<ContractNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: ContractNode } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/agent/contracts?limit=500");
        const json = await res.json();
        const data = (json.data ?? json) as Array<Record<string, string>>;

        const deployers: Record<string, ContractNode> = {};
        const contractNodes: ContractNode[] = [];
        const links: Link[] = [];

        data.forEach((c, i) => {
          const dep = (c.deployer_address ?? "").toLowerCase();
          if (!dep) return;
          if (!deployers[dep]) {
            deployers[dep] = {
              id: "d_" + dep,
              type: "deployer",
              address: dep,
              name: KNOWN_DEPLOYERS[dep] ?? dep.slice(0, 6) + "...",
              contractCount: 0,
            };
          }
          deployers[dep].contractCount = (deployers[dep].contractCount ?? 0) + 1;

          const node: ContractNode = {
            id: "c_" + i,
            type: "contract",
            address: c.address,
            name: c.etherscan_contract_name ?? c.token_name ?? "unnamed",
            method: c.verification_method ?? "unverified",
            date: (c.deployment_timestamp ?? "").slice(0, 10),
          };
          contractNodes.push(node);
          links.push({ source: "d_" + dep, target: node.id });
        });

        const nodes: ContractNode[] = [...Object.values(deployers), ...contractNodes];
        drawGraph(nodes, links);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function drawGraph(nodes: ContractNode[], links: Link[]) {
    if (!svgRef.current) return;
    const el = svgRef.current;
    const W = el.clientWidth || window.innerWidth;
    const H = el.clientHeight || window.innerHeight - 120;

    d3.select(el).selectAll("*").remove();
    d3.select(el).attr("width", W).attr("height", H);

    const g = d3.select(el).append("g");

    d3.select(el).call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 4])
        .on("zoom", (e) => g.attr("transform", e.transform))
    );

    const sim = d3
      .forceSimulation<ContractNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<ContractNode, Link>(links)
          .id((d) => d.id)
          .distance((d) => {
            const src = d.source as ContractNode;
            return src.type === "deployer" ? 90 : 50;
          })
          .strength(0.8)
      )
      .force(
        "charge",
        d3.forceManyBody<ContractNode>().strength((d) => (d.type === "deployer" ? -350 : -80))
      )
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force(
        "collision",
        d3.forceCollide<ContractNode>().radius((d) => (d.type === "deployer" ? 28 : 12))
      );

    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#1e1e3a")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.5);

    const node = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, ContractNode>()
          .on("start", (e, d) => {
            if (!e.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (e, d) => {
            d.fx = e.x;
            d.fy = e.y;
          })
          .on("end", (e, d) => {
            if (!e.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any
      );

    node
      .append("circle")
      .attr("r", (d) => (d.type === "deployer" ? 16 : 6))
      .attr("fill", (d) => (d.type === "deployer" ? "#100a1f" : (COLOR_MAP[d.method ?? ""] ?? "#374151")))
      .attr("stroke", (d) => (d.type === "deployer" ? "#a78bfa" : (COLOR_MAP[d.method ?? ""] ?? "#555")))
      .attr("stroke-width", (d) => (d.type === "deployer" ? 2.5 : 1.5))
      .attr("fill-opacity", (d) => (d.type === "deployer" ? 0.9 : 0.85));

    node
      .filter((d) => d.type === "deployer")
      .append("text")
      .attr("dy", 30)
      .attr("text-anchor", "middle")
      .attr("font-size", 9)
      .attr("fill", "#555")
      .text((d) => d.name);

    node
      .filter((d) => d.type === "contract")
      .append("text")
      .attr("dy", -10)
      .attr("text-anchor", "middle")
      .attr("font-size", 8)
      .attr("fill", "#333")
      .text((d) => (d.name.length > 12 ? d.name.slice(0, 10) + ".." : d.name));

    node
      .on("mousemove", (event, d) => setTooltip({ x: event.clientX, y: event.clientY, node: d }))
      .on("mouseleave", () => setTooltip(null))
      .on("click", (_, d) => {
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
        <h1 className="text-xl font-bold">Deployer Network</h1>
        <p className="text-xs text-obsidian-500 mt-1">
          Force graph of deployers and their contracts. Drag nodes, scroll to zoom, click to open.
          {loading && <span className="ml-2 text-ether-500">Loading...</span>}
        </p>
      </div>

      <div className="flex-1 relative">
        <svg ref={svgRef} className="w-full h-full" style={{ minHeight: "calc(100vh - 140px)" }} />

        {selected && (
          <div className="absolute bottom-6 left-6 bg-obsidian-900 border border-obsidian-700 rounded-lg p-4 text-xs w-64 shadow-xl">
            <div className="text-ether-400 font-semibold mb-2">{selected.name}</div>
            <div className="text-obsidian-500 mb-3 break-all">{selected.address}</div>
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
              {selected.contractCount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-obsidian-600">contracts</span>
                  <span className="text-obsidian-300">{selected.contractCount}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="absolute bottom-6 right-6 bg-obsidian-900 border border-obsidian-700 rounded-lg p-4 text-xs">
          <div className="text-obsidian-600 mb-2 tracking-wide">LEGEND</div>
          {[
            { label: "Deployer", color: "#a78bfa", large: true },
            { label: "Exact match", color: "#34d399" },
            { label: "Near-exact", color: "#fbbf24" },
            { label: "Etherscan", color: "#60a5fa" },
            { label: "Unverified", color: "#374151" },
          ].map(({ label, color, large }) => (
            <div key={label} className="flex items-center gap-2 mb-1.5 text-obsidian-500">
              <div
                className="rounded-full flex-shrink-0"
                style={{
                  width: large ? 14 : 8,
                  height: large ? 14 : 8,
                  background: color,
                  border: large ? `2px solid ${color}` : undefined,
                }}
              />
              {label}
            </div>
          ))}
        </div>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-obsidian-900 border border-obsidian-700 rounded-lg px-3 py-2 text-xs shadow-xl"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <div className="text-ether-400 font-semibold">{tooltip.node.name}</div>
          <div className="text-obsidian-500">{tooltip.node.address.slice(0, 8)}...</div>
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
