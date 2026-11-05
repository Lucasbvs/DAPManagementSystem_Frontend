import { api } from "./api";
import { tokenStore } from "./token";
export function subscribeInventory(onChange: () => void) {
  let stopped = false,
    timer: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  async function connect() {
    const token = tokenStore.get();
    if (!token || stopped) return;
    try {
      const response = await fetch(
        `${String(api.defaults.baseURL).replace(/\/$/, "")}/vestidos/events`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
          signal: controller.signal,
        },
      );
      if (response.status === 401) {
        if (tokenStore.get() === token) {
          tokenStore.clear();
          window.dispatchEvent(new Event("auth:expired"));
        }
        return;
      }
      if (!response.ok || !response.body) throw new Error("Stream unavailable");
      const reader = response.body.getReader(),
        decoder = new TextDecoder();
      let pending = "";
      try {
        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });
          let boundary;
          while ((boundary = pending.indexOf("\n\n")) !== -1) {
            const event = pending.slice(0, boundary);
            pending = pending.slice(boundary + 2);
            if (event.startsWith("data:")) onChange();
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch {
    }
    if (!stopped) timer = setTimeout(() => void connect(), 2000);
  }
  void connect();
  return () => {
    stopped = true;
    controller.abort();
    if (timer) clearTimeout(timer);
  };
}
