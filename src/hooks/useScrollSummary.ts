import { useCallback, useEffect, useRef, useState, type UIEvent } from "react";

export function useScrollSummary() {
  const [summaryHidden, setSummaryHidden] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousScroll = useRef({ top: 0, height: 0 });

  const resetSummary = useCallback(() => {
    setSummaryHidden(false);
    previousScroll.current = { top: 0, height: 0 };
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    media.addEventListener("change", resetSummary);
    return () => media.removeEventListener("change", resetSummary);
  }, [resetSummary]);

  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const { scrollTop, clientHeight } = event.currentTarget;
    const top = Math.max(0, scrollTop);
    const previous = previousScroll.current;
    if (top <= 1) {
      setSummaryHidden(false);
      previousScroll.current = { top, height: clientHeight };
      return;
    }
    if (previous.height && previous.height !== clientHeight) {
      previousScroll.current = { top, height: clientHeight };
      return;
    }
    const delta = top - previous.top;
    if (delta >= 8) setSummaryHidden(true);
    else if (Math.abs(delta) < 8) return;
    previousScroll.current = { top, height: clientHeight };
  }, []);

  return { summaryHidden, resetSummary, scrollRef, onScroll };
}
