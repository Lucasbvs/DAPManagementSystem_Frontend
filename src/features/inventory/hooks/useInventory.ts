import { useEffect, useState, useCallback, useRef } from "react";
import { inventoryApi } from "../services/inventory.api";
import { subscribeInventory } from "../services/inventoryLive";
import { errorMessage } from "../../../services/api";
import type { Dress, Owner } from "../types/inventory";
export function useInventory() {
  const [dresses, setDresses] = useState<Dress[]>([]),
    [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const revision = useRef(0),
    alive = useRef(false),
    scheduled = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reload = useCallback(async () => {
    const current = ++revision.current;
    try {
      const [d, o] = await Promise.all([
        inventoryApi.list(),
        inventoryApi.owners(),
      ]);
      if (alive.current && current === revision.current) {
        setDresses(d);
        setOwners(o);
        setError("");
      }
    } catch (e) {
      if (alive.current && current === revision.current)
        setError(errorMessage(e));
    } finally {
      if (alive.current && current === revision.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    void reload();
    const refresh = () => {
      if (scheduled.current) clearTimeout(scheduled.current);
      scheduled.current = setTimeout(() => void reload(), 150);
    };
    const unsubscribe = subscribeInventory(refresh);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const fallback = setInterval(onVisible, 15000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive.current = false;
      ++revision.current;
      unsubscribe();
      clearInterval(fallback);
      if (scheduled.current) clearTimeout(scheduled.current);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);
  return { dresses, owners, loading, error, reload };
}
