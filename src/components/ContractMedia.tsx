"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ContractMedia } from "@/types";
import { X, ChevronLeft, ChevronRight, ImageIcon, ExternalLink } from "lucide-react";

interface ContractMediaProps {
  items: ContractMedia[];
  /** If true, show "Add the first image" CTA when empty */
  canUpload?: boolean;
  onUploadClick?: () => void;
}

export function ContractMediaGallery({ items, canUpload, onUploadClick }: ContractMediaProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Touch tracking for swipe in lightbox
  const touchStartX = useRef<number | null>(null);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  const lightboxPrev = useCallback(() => {
    setLightboxIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  const lightboxNext = useCallback(() => {
    setLightboxIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightboxOpen, closeLightbox, lightboxPrev, lightboxNext]);

  // Body scroll lock when lightbox open
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [lightboxOpen]);

  // Empty state
  if (!items || items.length === 0) {
    if (!canUpload) return null;
    return (
      <button
        onClick={onUploadClick}
        className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border border-dashed border-obsidian-700 bg-obsidian-900/20 text-obsidian-500 hover:text-obsidian-300 hover:border-obsidian-600 transition-colors"
      >
        <ImageIcon className="w-6 h-6" />
        <span className="text-sm">Add the first image</span>
      </button>
    );
  }

  const hero = items[activeIndex];

  return (
    <section>
      {/* Hero image — 16:9 */}
      <div
        className="relative w-full overflow-hidden rounded-xl border border-obsidian-800 bg-obsidian-900/30 cursor-zoom-in"
        style={{ aspectRatio: "16 / 9" }}
        onClick={() => openLightbox(activeIndex)}
      >
        <img
          src={hero.url}
          alt={hero.caption ?? "Contract media"}
          className="w-full h-full object-cover transition-opacity duration-200 hover:opacity-90"
          loading="lazy"
        />
      </div>

      {/* Caption */}
      {(hero.caption || hero.sourceLabel || hero.sourceUrl) && (
        <figcaption className="mt-2 space-y-0.5">
          {hero.caption && (
            <p className="text-sm text-obsidian-400">{hero.caption}</p>
          )}
          {(hero.sourceLabel || hero.sourceUrl) && (
            <p className="text-xs text-obsidian-500">
              Source:{" "}
              {hero.sourceUrl ? (
                <a
                  href={hero.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-ether-400 hover:text-ether-300 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {hero.sourceLabel ?? hero.sourceUrl}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span>{hero.sourceLabel}</span>
              )}
            </p>
          )}
        </figcaption>
      )}

      {/* Thumbnail strip — only when >1 image */}
      {items.length > 1 && (
        <div className="mt-3 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 pb-1" style={{ minWidth: "max-content" }}>
            {items.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setActiveIndex(idx)}
                className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all duration-200"
                style={{
                  border: idx === activeIndex
                    ? "2px solid #626ef1"
                    : "2px solid #41414a",
                  opacity: idx === activeIndex ? 1 : 0.6,
                }}
                aria-label={item.caption ?? `Image ${idx + 1}`}
              >
                <img
                  src={item.url}
                  alt={item.caption ?? `Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeLightbox}
          onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(dx) > 50) {
              dx < 0 ? lightboxNext() : lightboxPrev();
            }
            touchStartX.current = null;
          }}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 z-10 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Prev */}
          {items.length > 1 && (
            <button
              className="absolute left-4 z-10 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
              aria-label="Previous"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Image */}
          <div
            className="mx-16 flex flex-col items-center gap-3 max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={items[lightboxIndex].url}
              alt={items[lightboxIndex].caption ?? "Contract media"}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
            />
            {items[lightboxIndex].caption && (
              <p className="text-sm text-white/70 text-center max-w-xl">
                {items[lightboxIndex].caption}
              </p>
            )}
            {items.length > 1 && (
              <p className="text-xs text-white/40">{lightboxIndex + 1} / {items.length}</p>
            )}
          </div>

          {/* Next */}
          {items.length > 1 && (
            <button
              className="absolute right-4 z-10 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
              aria-label="Next"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
