"use client";

import { Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Archive, Search, Clock, Code, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { OmniSearch } from "@/components/OmniSearch";
import { EraTimeline } from "@/components/EraTimeline";
import { ContractCard } from "@/components/ContractCard";
import type { FeaturedContract } from "@/types";

const FEATURED_FALLBACK: FeaturedContract[] = [];

interface TopEditor {
  historianId: number;
  name: string;
  editCount: number;
  newPagesCount: number;
}

export default function HomePage() {
  const [featuredContracts, setFeaturedContracts] = useState<FeaturedContract[]>(FEATURED_FALLBACK);
  const [topEditors, setTopEditors] = useState<TopEditor[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/featured");
        const json = await res.json();
        const next = (json?.data?.featuredContracts || []) as FeaturedContract[];
        if (!cancelled && Array.isArray(next) && next.length > 0) {
          setFeaturedContracts(next);
        }
      } catch {
        // fall back to empty state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/editors/top?limit=10");
        const json = await res.json();
        const editors = (json?.data?.editors || []) as TopEditor[];
        if (!cancelled && Array.isArray(editors)) {
          setTopEditors(editors);
        }
      } catch {
        // fall back to empty state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 gradient-radial opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(98,110,241,0.1),transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ether-500/10 border border-ether-500/20 text-ether-400 text-sm mb-6"
            >
              <Archive className="w-4 h-4" />
              Historical Archive
            </motion.div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              <span className="gradient-text">Ethereum</span> has a history
              <br />
              worth preserving.
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-obsidian-400 max-w-2xl mx-auto mb-10">
              Explore the smart contracts that shaped the early blockchain era.
              From the genesis block to now, focusing on the early days.
            </p>

            {/* Search */}
            <div className="flex justify-center mb-6">
              <Suspense
                fallback={
                  <div className="w-full max-w-3xl">
                    <div className="h-16 rounded-xl border border-obsidian-800 bg-obsidian-900/30" />
                  </div>
                }
              >
                <OmniSearch />
              </Suspense>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-t border-obsidian-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Search className="w-6 h-6" />}
              title="Contract Analysis"
              description="Deep analysis of bytecode structure, detected patterns, and function signatures."
            />
            <FeatureCard
              icon={<Code className="w-6 h-6" />}
              title="Decompiled Code"
              description="View human-readable decompiled bytecode with function names and logic flow."
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="Historical Context"
              description="Every contract is placed in its historical context with era information."
            />
          </div>
        </div>
      </section>

      {/* Featured Contracts */}
      <section className="py-20 border-t border-obsidian-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Featured Contracts</h2>
            <p className="text-obsidian-400 max-w-2xl mx-auto">
              These are pioneering contracts in Ethereum's history. From the first tokens to
              governance experiments, explore the smart contracts that shaped the early era.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredContracts.map((contract, index) => (
              <motion.div
                key={contract.address}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <ContractCard contract={contract} variant="featured" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Editors */}
      {topEditors.length > 0 && (
        <section className="py-20 border-t border-obsidian-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">Top Contributors</h2>
              <p className="text-obsidian-400 max-w-2xl mx-auto">
                Recognizing the historians who have contributed the most edits to preserve Ethereum's history.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
              {topEditors.map((editor, index) => (
                <motion.div
                  key={editor.historianId}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="p-5 rounded-xl bg-obsidian-900/30 border border-obsidian-800 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-ether-500/10 flex items-center justify-center text-ether-400 mx-auto mb-3">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-obsidian-100 mb-1">{editor.name}</h3>
                  <p className="text-sm text-obsidian-400">
                    {editor.editCount} {editor.editCount === 1 ? "edit" : "edits"}
                  </p>
                  {editor.newPagesCount > 0 && (
                    <p className="text-xs text-ether-400 mt-1">
                      {editor.newPagesCount} new {editor.newPagesCount === 1 ? "page" : "pages"}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Era Timeline */}
      <EraTimeline />

      {/* About Section */}
      <section id="about" className="py-20 border-t border-obsidian-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold mb-6">About This Project</h2>

            <div className="prose prose-invert mx-auto text-obsidian-400">
              <p className="text-lg mb-4">
                ethereumhistory.com is a historical archive and analysis tool for
                Ethereum smart contracts, with a focus on the 2015-2017 era when
                standards were still forming.
              </p>

              <p className="mb-4">
                This is not a trading site, block explorer, or dashboard. It is a
                long-term preservation effort — part museum, part research terminal,
                part Wikipedia for Ethereum's earliest code.
              </p>

              <p className="mb-6">
                Every contract is analyzed using bytecode structure comparison, not
                black-box ML. Heuristics are clearly labeled. Uncertainty is explicit.
                If we're not sure about something, we say so.
              </p>
            </div>

            {/* Principles */}
            <div className="grid md:grid-cols-3 gap-6 mt-10 text-left">
              <PrincipleCard
                title="Accuracy over Speed"
                description="We prefer correct over fast. Every claim is backed by evidence or clearly marked as heuristic."
              />
              <PrincipleCard
                title="Transparency"
                description="Our similarity algorithms are deterministic and explainable. No black boxes."
              />
              <PrincipleCard
                title="Preservation"
                description="Ethereum's early contracts deserve to be preserved and understood, not forgotten."
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-obsidian-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ether-500 to-ether-700 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 1.5L3 12l9 5.25L21 12 12 1.5z" />
                  <path d="M12 22.5l9-10.5-9 5.25-9-5.25 9 10.5z" opacity="0.6" />
                </svg>
              </div>
              <span className="text-obsidian-400">ethereumhistory.com</span>
            </div>

            <p className="text-sm text-obsidian-500">
              A preservation project for Ethereum's historical smart contracts.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="p-6 rounded-xl bg-obsidian-900/30 border border-obsidian-800"
    >
      <div className="w-12 h-12 rounded-lg bg-ether-500/10 flex items-center justify-center text-ether-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-obsidian-100 mb-2">{title}</h3>
      <p className="text-obsidian-400">{description}</p>
    </motion.div>
  );
}

function PrincipleCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-5 rounded-lg bg-obsidian-900/30 border border-obsidian-800">
      <h4 className="font-medium text-obsidian-200 mb-2">{title}</h4>
      <p className="text-sm text-obsidian-400">{description}</p>
    </div>
  );
}
