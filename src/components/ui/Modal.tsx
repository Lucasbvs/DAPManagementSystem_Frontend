import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button";
export function Modal({
  title,
  children,
  onClose,
  busy = false,
  compact = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  compact?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const outsideStarted = useRef(false);
  const outside = (x: number, y: number) => {
    const r = ref.current!.getBoundingClientRect();
    return x < r.left || x > r.right || y < r.top || y > r.bottom;
  };
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      className={compact ? "result-modal" : undefined}
      ref={ref}
      onPointerDown={(e) => {
        outsideStarted.current =
          e.target === e.currentTarget && outside(e.clientX, e.clientY);
      }}
      onClick={(e) => {
        if (
          !busy &&
          outsideStarted.current &&
          e.target === e.currentTarget &&
          outside(e.clientX, e.clientY)
        )
          onClose();
        outsideStarted.current = false;
      }}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header className="mb-6 flex items-center justify-between gap-3">
        <h2 id="dialog-title" className="text-xl font-bold">
          {title}
        </h2>
        <Button disabled={busy} onClick={onClose} aria-label="Cerrar ventana">
          <X size={20} aria-hidden="true" />
        </Button>
      </header>
      {children}
    </dialog>
  );
}
