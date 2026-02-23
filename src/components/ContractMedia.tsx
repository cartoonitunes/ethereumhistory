"use client";

import { useState } from "react";
import type { ContractMedia } from "@/types";
import { ExternalLink, X, ChevronLeft, ChevronRight } from "lucide-react";

interface ContractMediaProps {
  items: ContractMedia[];
}

export function ContractMediaGallery({ items }: ContractMediaProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!items || items.length === 0) return null;

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prev = () =>
    setLightboxIndex((i) => (i !== null ? (i - 1 + items.length) % items.length : null));
  const next = () =>
    setLightboxIndex((i) => (i !== null ? (i + 1) % items.length : null));

  const active = lightboxIndex !== null ? items[lightboxIndex] : null;

  return (
    <section className="p-6 rounded-xl border border-obsidian-800 bg-obsidian-900/30">
      <h2 className="text-lg font-semibold mb-5">Media</h2>

      {/* Wikipedia-style stacked images */}
      <div className="space-y-6">
        {items.map((item, idx) => (
          <figure key={item.id} className="group">
            {/* Image container */}
            <div
              className="relative cursor-zoom-in overflow-hidden rounded-lg border border-obsidian-700 bg-obsidian-950"
              onClick={() => openLightbox(idx)}
            >
              <img
                src={item.url}
                alt={item.caption ?? "Contract media"}
                className="w-full max-h-80 object-contain transition-opacity duration-200 group-hover:opacity-90"
                loading="lazy"
              />
            </div>

            {/* Caption */}
            {(item.caption || item.sourceLabel || item.sourceUrl) && (
              <figcaption className="mt-2 text-sm text-obsidian-400 space-y-0.5">
                {item.caption && (
                  <p>{item.caption}</p>
                )}
                {(item.sourceLabel || item.sourceUrl) && (
                  <p className="text-xs text-obsidian-500">
                    Source:{" "}
                    {item.sourceUrl ? (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-ether-400 hover:text-ether-300 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.sourceLabel ?? item.sourceUrl}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span>{item.sourceLabel}</span>
                    )}
                  </p>
                )}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {/* Lightbox */}
      {active !== null && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={closeLightbox}
            aria-label="Close lightbox"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Prev */}
          {items.length > 1 && (
            <button
              className="absolute left-4 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Image */}
          <div
            className="max-w-5xl max-h-[85vh] mx-12 flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={active.url}
              alt={active.caption ?? "Contract media"}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
            />
            {active.caption && (
              <p className="text-sm text-white/70 text-center max-w-xl">{active.caption}</p>
            )}
            {(items.length > 1) && (
              <p className="text-xs text-white/40">{lightboxIndex + 1} / {items.length}</p>
            )}
          </div>

          {/* Next */}
          {items.length > 1 && (
            <button
              className="absolute right-4 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); next(); }}
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
