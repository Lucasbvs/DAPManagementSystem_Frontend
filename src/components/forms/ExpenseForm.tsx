import { useRef, useState, type FormEvent } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { accountingApi } from "../../services/accounting.api";
import { errorMessage } from "../../services/api";
import { today } from "../../types/sales";
import type { AccountingOwner, ExpenseInput } from "../../types/accounting";

export function ExpenseForm({
  owners,
  month,
  onClose,
  onSaved,
}: {
  owners: AccountingOwner[];
  month: string;
  onClose: () => void;
  onSaved: (date: string) => void;
}) {
  const currentDay = today();
  const [form, setForm] = useState<ExpenseInput>({
    fecha: currentDay.startsWith(month) ? currentDay : `${month}-01`,
    concepto: "",
    tipo: "Gasto",
    importe: "",
    id_propietario: owners.length === 1 ? owners[0].id_propietario : 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  function field<K extends keyof ExpenseInput>(
    name: K,
    value: ExpenseInput[K],
  ) {
    setForm((previous) => ({ ...previous, [name]: value }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const amount = form.importe.trim().replace(",", ".");
    if (!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setError(
        "Ingresa un importe mayor que cero, con un máximo de dos decimales.",
      );
      return;
    }
    if (!form.concepto.trim() || !form.id_propietario) {
      setError("Completa el concepto y selecciona un contribuyente.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await accountingApi.registerExpense({
        ...form,
        concepto: form.concepto.trim(),
        importe: amount,
      });
      onSaved(form.fecha);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Registrar gasto"
      onClose={onClose}
      busy={busy}
      className="accounting-modal"
    >
      <form onSubmit={submit} className="expense-form" aria-busy={busy}>
        <p className="expense-intro">Completa los datos del movimiento.</p>
        <fieldset disabled={busy} className="expense-fields">
          <legend className="expense-mobile-title">Nuevo movimiento</legend>
          <label>
            Fecha <span className="required-mark">*</span>
            <input
              type="date"
              required
              min="0001-01-01"
              max="9999-12-31"
              value={form.fecha}
              onChange={(event) => field("fecha", event.target.value)}
            />
          </label>
          <label>
            Concepto <span className="required-mark">*</span>
            <input
              autoFocus
              required
              maxLength={150}
              placeholder="Ej. Compra de bolsas"
              value={form.concepto}
              onChange={(event) => field("concepto", event.target.value)}
            />
          </label>
          <label>
            Contribuyente <span className="required-mark">*</span>
            <select
              required
              value={form.id_propietario || ""}
              onChange={(event) =>
                field("id_propietario", Number(event.target.value))
              }
            >
              <option value="" disabled>
                Selecciona un propietario
              </option>
              {owners.map((owner) => (
                <option key={owner.id_propietario} value={owner.id_propietario}>
                  {owner.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo <span className="required-mark">*</span>
            <select
              value={form.tipo}
              onChange={(event) =>
                field("tipo", event.target.value as ExpenseInput["tipo"])
              }
            >
              <option value="Gasto">Gasto operativo</option>
              <option value="Costo">Costo de mercadería</option>
            </select>
          </label>
          <label>
            Importe (Bs) <span className="required-mark">*</span>
            <input
              required
              inputMode="decimal"
              maxLength={11}
              placeholder="0,00"
              value={form.importe}
              onChange={(event) => field("importe", event.target.value)}
            />
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <footer className="expense-actions">
          <Button disabled={busy} onClick={onClose}>
            Volver
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={busy || !owners.length}
          >
            {busy ? "Guardando…" : "Guardar gasto"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
