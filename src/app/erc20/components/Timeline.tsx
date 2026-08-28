"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cx } from "../cx";
import { TIMELINE_INDEX, TIMELINE_TOTAL } from "../content/timeline-index";

/** Filter chips, in the order the document introduces the sources. */
export const SOURCES: { key: string; label: string }[] = [
  { key: "wiki", label: "Wiki" },
  { key: "guide", label: "Official docs" },
  { key: "eips", label: "Issue #20" },
  { key: "gist", label: "Gists" },
  { key: "code", label: "Repositories" },
  { key: "wallet", label: "Wallet" },
  { key: "chain", label: "Onchain" },
  { key: "blog", label: "Blog" },
];

interface BulkSignal {
  seq: number;
  open: boolean;
}

interface TimelineCtx {
  enabled: Record<string, boolean>;
  starOnly: boolean;
  bulk: BulkSignal;
  toggleSource: (key: string) => void;
  toggleStarOnly: () => void;
  expandAll: () => void;
  collapseAll: () => void;
  reveal: (src: string) => void;
  isVisible: (src: string, star: boolean) => boolean;
  shown: number;
}

const Ctx = createContext<TimelineCtx | null>(null);

function useTimeline(): TimelineCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Timeline components must be used inside TimelineProvider");
  return ctx;
}

const ALL_ON: Record<string, boolean> = Object.fromEntries(
  SOURCES.map((s) => [s.key, true]),
);

export function TimelineProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(ALL_ON);
  const [starOnly, setStarOnly] = useState(false);
  const [bulk, setBulk] = useState<BulkSignal>({ seq: 0, open: false });

  const isVisible = useCallback(
    (src: string, star: boolean) => enabled[src] !== false && (!starOnly || star),
    [enabled, starOnly],
  );

  const shown = useMemo(() => {
    let n = 0;
    for (const era of TIMELINE_INDEX) {
      for (const ev of era.events) if (isVisible(ev.src, ev.star)) n++;
    }
    return n;
  }, [isVisible]);

  const value: TimelineCtx = useMemo(
    () => ({
      enabled,
      starOnly,
      bulk,
      shown,
      isVisible,
      toggleSource: (key) => setEnabled((e) => ({ ...e, [key]: e[key] === false })),
      toggleStarOnly: () => setStarOnly((s) => !s),
      expandAll: () => setBulk((b) => ({ seq: b.seq + 1, open: true })),
      collapseAll: () => setBulk((b) => ({ seq: b.seq + 1, open: false })),
      // A deep link has to win over whatever the filters are set to.
      reveal: (src) => {
        setEnabled((e) => (e[src] === false ? { ...e, [src]: true } : e));
        setStarOnly(false);
      },
    }),
    [enabled, starOnly, bulk, shown, isVisible],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function TimelineControls() {
  const { enabled, starOnly, toggleSource, toggleStarOnly, expandAll, collapseAll, shown } =
    useTimeline();

  return (
    <div className={cx("tl-controls")} role="region" aria-label="Timeline filters">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className={cx("tl-controls-inner")}>
          <div className={cx("chips")} role="group" aria-label="Filter by source">
            <button
              type="button"
              className={cx("chip chip--star")}
              aria-pressed={starOnly}
              onClick={toggleStarOnly}
            >
              Milestones only
            </button>
            {SOURCES.map((s) => (
              <button
                key={s.key}
                type="button"
                className={cx("chip")}
                aria-pressed={enabled[s.key] !== false}
                onClick={() => toggleSource(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className={cx("tl-actions")}>
            <span className={cx("filtercount")} aria-live="polite">
              {shown === TIMELINE_TOTAL ? `${TIMELINE_TOTAL} events` : `${shown} of ${TIMELINE_TOTAL}`}
            </span>
            <button type="button" className={cx("linkbtn")} onClick={expandAll}>
              Expand all
            </button>
            <button type="button" className={cx("linkbtn")} onClick={collapseAll}>
              Collapse all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EraProps {
  id: string;
  span: string;
  title: string;
  blurb: ReactNode;
  children: ReactNode;
}

export function TimelineEra({ id, span, title, blurb, children }: EraProps) {
  const { isVisible } = useTimeline();
  const events = TIMELINE_INDEX.find((e) => e.id === id)?.events ?? [];
  const anyVisible = events.some((e) => isVisible(e.src, e.star));

  if (!anyVisible) return null;

  return (
    <section className={cx("era")} aria-labelledby={`${id}-title`}>
      <div className={cx("era-head")}>
        <span className={cx("era-span")}>{span}</span>
        <h3 id={`${id}-title`}>{title}</h3>
        <p>{blurb}</p>
      </div>
      <ol className={cx("tl")}>{children}</ol>
    </section>
  );
}

interface EventProps {
  id: string;
  src: string;
  star?: boolean;
  outOfCorpus?: boolean;
  date: string;
  times: string[];
  mobileWhen: string;
  title: string;
  tags: { label: string; actor: boolean }[];
  summary: ReactNode;
  children: ReactNode;
}

export function TimelineEvent({
  id,
  src,
  star = false,
  outOfCorpus = false,
  date,
  times,
  mobileWhen,
  title,
  tags,
  summary,
  children,
}: EventProps) {
  const { bulk, isVisible, reveal } = useTimeline();
  const [open, setOpen] = useState(false);
  const [seenBulk, setSeenBulk] = useState(0);
  const li = useRef<HTMLLIElement>(null);
  const landPending = useRef(false);

  const effectiveOpen = seenBulk === bulk.seq ? open : bulk.open;

  // Deep links open the entry and clear any filter that would hide it.
  useEffect(() => {
    const claim = () => {
      if (decodeURIComponent(window.location.hash.slice(1)) !== id) return;
      reveal(src);
      setOpen(true);
      setSeenBulk(bulk.seq);
      landPending.current = true;
    };
    claim();
    window.addEventListener("hashchange", claim);
    return () => window.removeEventListener("hashchange", claim);
    // `bulk.seq` and `reveal` are read, not tracked: re-running on every filter
    // change would re-open the entry after the reader collapsed everything.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, src]);

  // Land only once the entry has expanded, so the jump is measured against the
  // final layout. On a document this long the browser's own fragment scroll
  // lands short, so it is re-asserted after layout settles.
  useEffect(() => {
    if (!landPending.current) return;
    const land = () => li.current?.scrollIntoView({ block: "start", behavior: "instant" });
    land();
    const raf = requestAnimationFrame(land);
    const timer = setTimeout(() => {
      land();
      landPending.current = false;
    }, 250);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [effectiveOpen]);

  const visible = isVisible(src, star);

  return (
    <li
      ref={li}
      id={id}
      className={cx("ev", star && "ev--star", outOfCorpus && "ev--out", !visible && "hidden")}
    >
      <div className={cx("ev-when")}>
        <b>{date}</b>
        {times.map((t, i) => (
          <span key={t}>
            {i > 0 && <br />}
            {t}
          </span>
        ))}
      </div>
      <details
        className={cx("ev-body")}
        open={effectiveOpen}
        onToggle={(e) => {
          setOpen(e.currentTarget.open);
          setSeenBulk(bulk.seq);
        }}
      >
        <summary>
          <span className={cx("ev-mobile-when mono")}>{mobileWhen}</span>
          <span className={cx("ev-title")}>{title}</span>
          <span className={cx("ev-toggle")} aria-hidden="true" />
          <span className={cx("ev-sub")}>{summary}</span>
          <span className={cx("ev-tags")}>
            {tags.map((t) => (
              <span key={t.label} className={cx("tag", t.actor && "tag--actor")}>
                {t.label}
              </span>
            ))}
          </span>
        </summary>
        <div className={cx("ev-detail")}>{children}</div>
      </details>
    </li>
  );
}
