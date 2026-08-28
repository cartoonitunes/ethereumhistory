"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "../cx";

/**
 * Wide tables scroll sideways. Say so, but only when they actually overflow.
 *
 * Measuring once on mount is not enough. Below 700px the wide tables restack
 * into cards and stop overflowing without the wrapper ever changing size, and
 * a first measurement can land before the stylesheet or the webfont has been
 * applied. So the measurement is repeated on every event that can change the
 * answer, and the hint follows it.
 */
export function TableScroll({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let live = true;
    const measure = () => {
      if (!live) return;
      // Below 700px the wide tables restack into cards and the wrapper stops
      // being a scroll container at all, so overflow-x is the real test; the
      // width comparison alone would hint at tables that cannot scroll.
      const scrollable = /auto|scroll/.test(getComputedStyle(el).overflowX);
      setOverflowing(scrollable && el.scrollWidth > el.clientWidth + 2);
    };

    measure();
    const raf = requestAnimationFrame(measure);
    document.fonts?.ready.then(measure);

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    window.addEventListener("resize", measure);

    return () => {
      live = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <>
      {overflowing && <p className={cx("scrollhint")}>Table scrolls sideways →</p>}
      <div ref={ref} className={[cx("tablewrap"), className].filter(Boolean).join(" ")}>
        {children}
      </div>
    </>
  );
}
