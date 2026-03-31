"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { Header } from "@/components/Header";

interface Contract {
  address: string;
  name: string | null;
  ts: string | null;
  deployer: string | null;
  method: string;
  date: Date;
}

const COLOR_MAP: Record<string, string> = {
  exact_bytecode_match: "#34d399",
  near_exact_match: "#fbbf24",
  etherscan_verified: "#60a5fa",
  author_published_source: "#818cf8",
  unverified: "#374151",
};

const METHOD_LABEL: Record<string, string> = {
  exact_bytecode_match: "Exact bytecode match",
  near_exact_match: "Near-exact match",
  etherscan_verified: "Etherscan verified",
  author_published_source: "Author published",
  unverified: "Unverified",
};

const VERIFICATION_FILTERS = [
  { key: "all", label: "All" },
  { key: "exact_bytecode_match", label: "Verified" },
  { key: "near_exact_match", label: "Near-exact" },
  { key: "unverified", label: "Unverified" },
];

const YEARS = [2015, 2016, 2017];

export default function TimelinePage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filter, setFilter] = useState("all");
  const [activeYears, setActiveYears] = useState<Set<number>>(new Set(YEARS));
  const [tooltip, setTooltip] = useState<{ x: number; y: number; d: Contract } | null>(null);
  const [loading, setLoading] = useState(true);

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
        const parsed = (json.contracts ?? [])
          .filter((c: Record<string, string>) => c.ts)
          .map((c: Record<string, string>) => ({
            ...c,
            name: c.name ?? "unnamed",
            method: c.method ?? "unverified",
            date: new Date(c.ts),
          }))
          .filter((c: Contract) => !isNaN(c.date.getTime()));
        setContracts(parsed);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeYears]);

  useEffect(() => {
    if (!svgRef.current || contracts.length === 0) return;

    const el = svgRef.current;
    const margin = { top: 30, right: 40, bottom: 70, left: 170 };
    const W = el.clientWidth || 900;
    const H = 440;
    const iW = W - margin.left - margin.right;
    const iH = H - margin.top - margin.bottom;

    d3.select(el).selectAll("*").remove();
    const svg = d3.select(el).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const filtered = filter === "all" ? contracts : contracts.filter((c) => c.method === filter);

    if (filtered.length === 0) return;

    const xExt = d3.extent(filtered, (d) => d.date) as [Date, Date];
    const pad = Math.max((xExt[1].getTime() - xExt[0].getTime()) * 0.02, 86400000);
    const xScale = d3
      .scaleTime()
      .domain([new Date(xExt[0].getTime() - pad), new Date(xExt[1].getTime() + pad)])
      .range([0, iW]);

    const methods = Object.keys(METHOD_LABEL);
    const yScale = d3.scalePoint().domain(methods).range([iH, 0]).padding(0.5);

    // Grid
    g.append("g")
      .call(d3.axisLeft(yScale).tickSize(-iW).tickFormat(() => ""))
      .selectAll("line").attr("stroke", "#1a1a2e").attr("stroke-dasharray", "2,4");
    g.select(".domain").remove();

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${iH})`)
      .call(d3.axisBottom(xScale).ticks(8).tickFormat(d3.timeFormat("%b '%y") as (v: Date | d3.NumberValue) => string))
      .selectAll("text").attr("fill", "#555").attr("transform", "rotate(-30)")
      .attr("text-anchor", "end").attr("dx", "-6").attr("dy", "6");

    // Y axis
    g.append("g")
      .call(d3.axisLeft(yScale).tickFormat((m) => METHOD_LABEL[m as string] ?? m))
      .selectAll("text").attr("fill", "#666").attr("font-size", "11");
    g.selectAll(".domain, .tick line").attr("stroke", "#222");

    // Dots with jitter
    const jitter = () => (Math.random() - 0.5) * 18;
    g.selectAll(".dot")
      .data(filtered)
      .join("circle")
      .attr("cx", (d) => xScale(d.date) + jitter())
      .attr("cy", (d) => (yScale(d.method) ?? 0) + jitter())
      .attr("r", (d) => (d.method === "exact_bytecode_match" ? 5.5 : 4))
      .attr("fill", (d) => COLOR_MAP[d.method] ?? "#555")
      .attr("fill-opacity", 0.8)
      .attr("stroke", (d) => COLOR_MAP[d.method] ?? "#555")
      .attr("stroke-opacity", 0.25)
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mousemove", (event: MouseEvent, d: Contract) => setTooltip({ x: event.clientX, y: event.clientY, d }))
      .on("mouseleave", () => setTooltip(null))
      .on("click", (_: MouseEvent, d: Contract) => window.open(`/contract/${d.address}`, "_blank"));
  }, [contracts, filter]);

  return (
    <div className="min-h-screen bg-obsidian-950 text-obsidian-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Deployment Timeline</h1>
          <p className="text-obsidian-400 text-sm">
            Every documented contract plotted by deployment date and verification status.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs text-obsidian-600 self-center mr-1">Year:</span>
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => toggleYear(y)}
              className={`px-3 py-1 rounded text-xs tracking-wide border transition-colors ${
                activeYears.has(y)
                  ? "bg-ether-900/40 text-ether-400 border-ether-500/40"
                  : "bg-obsidian-800/50 text-obsidian-600 border-obsidian-700 hover:text-obsidian-400"
              }`}
            >
              {y}
            </button>
          ))}
          <div className="w-px bg-obsidian-800 mx-2" />
          <span className="text-xs text-obsidian-600 self-center mr-1">Status:</span>
          {VERIFICATION_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded text-xs tracking-wide border transition-colors ${
                filter === f.key
                  ? "bg-ether-900/40 text-ether-400 border-ether-500/40"
                  : "bg-obsidian-800/50 text-obsidian-600 border-obsidian-700 hover:text-obsidian-400"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-obsidian-600 self-center">
            {loading ? "Loading..." : `${contracts.length} contracts`}
          </span>
        </div>

        <div className="bg-obsidian-900/30 border border-obsidian-800 rounded-lg p-4">
          <svg ref={svgRef} className="w-full" />
        </div>

        <div className="flex flex-wrap gap-4 mt-4">
          {Object.entries(METHOD_LABEL).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2 text-xs text-obsidian-500">
              <div className="w-3 h-3 rounded-full" style={{ background: COLOR_MAP[key] ?? "#555" }} />
              {label}
            </div>
          ))}
        </div>
      </main>

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-obsidian-900 border border-obsidian-700 rounded-lg px-4 py-3 text-xs shadow-xl"
          style={{ left: tooltip.x + 14, top: tooltip.y - 10, maxWidth: 260 }}
        >
          <div className="text-ether-400 font-semibold mb-1">{tooltip.d.name}</div>
          <div className="text-obsidian-500 mb-2">{tooltip.d.address.slice(0, 6)}...{tooltip.d.address.slice(-4)}</div>
          <div className="flex justify-between gap-4">
            <span className="text-obsidian-500">deployed</span>
            <span className="text-obsidian-300">
              {tooltip.d.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <div className="mt-2">
            <span
              className="inline-block px-2 py-0.5 rounded text-xs"
              style={{
                background: (COLOR_MAP[tooltip.d.method] ?? "#555") + "22",
                color: COLOR_MAP[tooltip.d.method] ?? "#555",
                border: `1px solid ${(COLOR_MAP[tooltip.d.method] ?? "#555")}44`,
              }}
            >
              {METHOD_LABEL[tooltip.d.method] ?? tooltip.d.method}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
