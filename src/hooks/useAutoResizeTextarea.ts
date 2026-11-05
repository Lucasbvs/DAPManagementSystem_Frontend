import { useLayoutEffect, useRef } from "react";
export function useAutoResizeTextarea(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const field = ref.current;
    if (!field) return;
    const resize = () => {
      field.style.height = "auto";
      field.style.height = `${field.scrollHeight + 2}px`;
    };
    resize();
    let width = field.getBoundingClientRect().width;
    const widthObserver = new ResizeObserver(() => {
      const next = field.getBoundingClientRect().width;
      if (next !== width) {
        width = next;
        resize();
      }
    });
    widthObserver.observe(field);
    return () => widthObserver.disconnect();
  }, [value]);
  return ref;
}
