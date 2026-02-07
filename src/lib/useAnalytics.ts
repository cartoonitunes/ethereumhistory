"use client";

import { useCallback, useEffect, useRef } from "react";

// Generate a random session ID for this browser tab.
// Persists across navigations within the same session but not across tabs/days.
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("eh_sid");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("eh_sid", id);
  }
  return id;
}

type TrackEvent = {
  eventType: string;
  pagePath?: string;
  contractAddress?: string;
  eventData?: Record<string, unknown>;
};

function sendEvent(event: TrackEvent) {
  if (typeof window === "undefined") return;
  // Use sendBeacon for reliability (survives page unload)
  const payload = JSON.stringify({
    ...event,
    sessionId: getSessionId(),
    referrer: document.referrer || null,
  });
  try {
    navigator.sendBeacon("/api/analytics/track", payload);
  } catch {
    // Fallback to fetch
    fetch("/api/analytics/track", {
      method: "POST",
      body: payload,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  }
}

/**
 * Hook for automatic page view tracking.
 * Call once per page component. Fires on mount.
 */
export function usePageView(pagePath?: string, contractAddress?: string) {
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    const path = pagePath || window.location.pathname;
    sendEvent({
      eventType: contractAddress ? "contract_view" : "page_view",
      pagePath: path,
      contractAddress: contractAddress || undefined,
    });
  }, [pagePath, contractAddress]);
}

/**
 * Returns a function to track arbitrary engagement events.
 */
export function useTrackEvent() {
  return useCallback((event: TrackEvent) => {
    sendEvent(event);
  }, []);
}
