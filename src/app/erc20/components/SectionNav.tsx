"use client";

import { useEffect, useState } from "react";
import { cx } from "../cx";

const SECTIONS = [
  { id: "interface", label: "Interface" },
  { id: "findings", label: "Findings" },
  { id: "timeline", label: "Timeline" },
  { id: "members", label: "Members" },
  { id: "artifacts", label: "Artifacts" },
  { id: "mistcoin", label: "MistCoin" },
  { id: "onchain", label: "Onchain" },
  { id: "adoption", label: "Adoption" },
  { id: "compliance", label: "Compliance" },
  { id: "method", label: "Method" },
];

export function SectionNav() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (n): n is HTMLElement => n !== null,
    );
    if (!nodes.length) return;

    // The section whose top has most recently passed under the header is the
    // one being read; an IntersectionObserver alone reports the wrong one on
    // a page where a single section can be taller than the viewport.
    const pick = () => {
      const line = 140;
      let current = nodes[0].id;
      for (const n of nodes) {
        if (n.getBoundingClientRect().top <= line) current = n.id;
      }
      setActive(current);
    };
    pick();
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    return () => {
      window.removeEventListener("scroll", pick);
      window.removeEventListener("resize", pick);
    };
  }, []);

  return (
    <div className={cx("secnav-bar")}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <nav className={cx("secnav")} aria-label="Sections of this document">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={active === s.id ? "true" : undefined}
            >
              {s.label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
