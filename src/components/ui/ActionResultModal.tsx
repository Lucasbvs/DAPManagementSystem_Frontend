import { useEffect, useRef } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
export type ActionResult = { title: string; message: string };
export function ActionResultModal({
  result,
  onClose,
}: {
  result: ActionResult;
  onClose: () => void;
}) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const timer = window.setTimeout(() => closeRef.current(), 2000);
    return () => window.clearTimeout(timer);
  }, [result]);
  return (
    <Modal title={result.title} onClose={onClose} compact>
      <p role="status" className="text-sm">
        {result.message}
      </p>
      <footer className="mt-6 flex justify-end">
        <Button autoFocus variant="primary" onClick={onClose}>
          Aceptar
        </Button>
      </footer>
    </Modal>
  );
}
