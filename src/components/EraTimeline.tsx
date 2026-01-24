"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ERAS, type EthereumEra } from "@/types";
import { formatDate } from "@/lib/utils";

interface EraTimelineProps {
  activeEra?: string | null;
}

export function EraTimeline({ activeEra }: EraTimelineProps) {
  const eras = Object.values(ERAS);

  return (
    <section id="eras" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">Ethereum Eras</h2>
          <p className="text-obsidian-400 max-w-2xl mx-auto">
            Ethereum's early history is marked by distinct periods, each with its own
            challenges and innovations. Understanding these eras provides context for
            the contracts deployed during them.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-era-frontier via-era-dao to-era-spurious hidden lg:block" />

          <div className="space-y-8 lg:space-y-0">
            {eras.map((era, index) => (
              <EraCard
                key={era.id}
                era={era}
                index={index}
                isActive={activeEra === era.id}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function EraCard({
  era,
  index,
  isActive,
}: {
  era: EthereumEra;
  index: number;
  isActive: boolean;
}) {
  const isLeft = index % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className={`
        relative lg:w-1/2 lg:pr-8
        ${isLeft ? "lg:ml-0 lg:mr-auto lg:text-right lg:pr-12" : "lg:ml-auto lg:mr-0 lg:text-left lg:pl-12 lg:pr-0"}
      `}
    >
      {/* Dot on timeline */}
      <div
        className="absolute left-1/2 top-6 w-4 h-4 rounded-full border-2 transform -translate-x-1/2 hidden lg:block"
        style={{
          backgroundColor: isActive ? era.color : "#18181b",
          borderColor: era.color,
        }}
      />

      {/* Card */}
      <div
        className={`
          relative p-6 rounded-xl border transition-all duration-300
          ${isActive ? "border-opacity-50" : "border-obsidian-800 hover:border-obsidian-700"}
        `}
        style={{
          borderColor: isActive ? era.color : undefined,
          backgroundColor: isActive ? `${era.color}10` : "#18181b",
        }}
      >
        {/* Era badge */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-3 era-${era.id}`}
          style={{ borderWidth: 1 }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: era.color }}
          />
          {era.name}
        </div>

        {/* Dates */}
        <div className="text-sm text-obsidian-500 mb-3">
          {formatDate(era.startDate)} — {era.endDate ? formatDate(era.endDate) : "Present"}
        </div>

        {/* Description */}
        <p className="text-obsidian-300 mb-4">{era.description}</p>

        {/* Block range */}
        <div className="text-xs text-obsidian-500 font-mono">
          Blocks {era.startBlock.toLocaleString()} — {era.endBlock?.toLocaleString() || "..."}
        </div>
      </div>
    </motion.div>
  );
}

export function EraCompact({ eraId, showLabel = true }: { eraId: string | null; showLabel?: boolean }) {
  if (!eraId || !ERAS[eraId]) return null;

  const era = ERAS[eraId];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium era-${eraId}`}
      style={{ borderWidth: 1 }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: era.color }}
      />
      {showLabel && era.name}
    </span>
  );
}
