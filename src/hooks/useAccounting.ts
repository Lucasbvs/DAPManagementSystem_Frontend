import { useCallback, useEffect, useRef, useState } from "react";
import { accountingApi } from "../services/accounting.api";
import { subscribeInventory } from "../services/inventoryLive";
import { errorMessage } from "../services/api";
import type { AccountingReport } from "../types/accounting";

export function useAccounting(month: string) {
  const [report, setReport] = useState<AccountingReport | null>(null);
  const [errorState, setErrorState] = useState({ month: "", message: "" });
  const [loading, setLoading] = useState(true);
  const revision = useRef(0);
  const alive = useRef(false);
  const reload = useCallback(async () => {
    const current = ++revision.current;
    try {
      const result = await accountingApi.report(month);
      if (alive.current && current === revision.current) {
        setReport(result);
        setErrorState({ month, message: "" });
      }
    } catch (error) {
      if (alive.current && current === revision.current)
        setErrorState({ month, message: errorMessage(error) });
    } finally {
      if (alive.current && current === revision.current) setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    alive.current = true;
    setLoading(true);
    void reload();
    let scheduled: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(scheduled);
      scheduled = setTimeout(() => void reload(), 150);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const unsubscribe = subscribeInventory(refresh);
    const interval = setInterval(onVisible, 15000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive.current = false;
      ++revision.current;
      clearTimeout(scheduled);
      clearInterval(interval);
      unsubscribe();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);
  const currentReport = report?.mes === month ? report : null;
  return {
    report: currentReport,
    owners: report?.propietarios ?? [],
    loading: loading || (!currentReport && errorState.month !== month),
    error: errorState.month === month ? errorState.message : "",
    reload,
  };
}
