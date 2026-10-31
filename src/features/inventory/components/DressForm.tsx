import { useState, type FormEvent } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { inventoryApi } from "../services/inventory.api";
import { errorMessage } from "../../../services/api";
import type { Dress, DressInput, Owner, Variant } from "../types/inventory";
export function DressForm({
  dress,
  owners,
  onClose,
  onSaved,
}: {
  dress?: Dress;
  owners: Owner[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<DressInput>(
    dress
      ? {
          nombre: dress.nombre,
          descripcion: dress.descripcion,
          precio_unitario: dress.precio_unitario,
          precio_cuarta: dress.precio_cuarta,
          precio_media_docena: dress.precio_media_docena,
          id_propietario: dress.id_propietario,
          variantes: dress.variantes.map(
            ({ id_variante, color, talla, cantidad_stock }) => ({
              id_variante,
              color,
              talla,
              cantidad_stock,
            }),
          ),
        }
      : {
          nombre: "",
          descripcion: "",
          precio_unitario: "",
          precio_cuarta: "",
          precio_media_docena: "",
          id_propietario: owners[0]?.id_propietario ?? 0,
          variantes: [{ color: "", talla: null, cantidad_stock: 1 }],
        },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function field<K extends keyof DressInput>(key: K, value: DressInput[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }
  function variant(index: number, patch: Partial<Variant>) {
    field(
      "variantes",
      form.variantes.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    );
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (
        !form.precio_unitario.trim() ||
        !Number.isFinite(Number(form.precio_unitario)) ||
        Number(form.precio_unitario) <= 0
      )
        throw new Error("El precio unitario debe ser mayor que cero");
      if (
        [form.precio_cuarta, form.precio_media_docena].some(
          (p) =>
            p != null &&
            p.trim() !== "" &&
            (!Number.isFinite(Number(p)) || Number(p) <= 0),
        )
      )
        throw new Error("Los descuentos informados deben ser mayores que cero");
      if (
        form.variantes.some(
          (v) => !Number.isInteger(v.cantidad_stock) || v.cantidad_stock <= 0,
        )
      )
        throw new Error(
          "Cada variante debe tener una cantidad entera mayor que cero",
        );
      const keys = form.variantes.map(
        (v) =>
          `${v.color.trim().toLowerCase()}|${(v.talla ?? "").trim().toLowerCase()}`,
      );
      if (new Set(keys).size !== keys.length)
        throw new Error("No repitas combinaciones de color y talla");
      const payload = {
        ...form,
        precio_cuarta: form.precio_cuarta?.trim() || null,
        precio_media_docena: form.precio_media_docena?.trim() || null,
      };
      if (dress) await inventoryApi.update(dress.id_vestido, payload);
      else await inventoryApi.create(payload);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={dress ? "Editar vestido" : "Registrar vestido"}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit}>
        <fieldset disabled={busy} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <p className="text-sm text-muted sm:col-span-2">
              {dress
                ? `Vestido N.º ${dress.numero_vestido} · Número asignado automáticamente`
                : "El número de vestido se asignará automáticamente al guardar."}
            </p>
            <label>
              Nombre
              <input
                autoFocus
                required
                maxLength={50}
                value={form.nombre}
                onChange={(e) => field("nombre", e.target.value)}
              />
            </label>
            <label className="sm:col-span-2">
              Descripción
              <textarea
                required
                maxLength={150}
                value={form.descripcion}
                onChange={(e) => field("descripcion", e.target.value)}
              />
            </label>
            <label>
              Dueño de la prenda
              <select
                required
                value={form.id_propietario}
                onChange={(e) =>
                  field("id_propietario", Number(e.target.value))
                }
              >
                {owners.map((o) => (
                  <option key={o.id_propietario} value={o.id_propietario}>
                    {o.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                "precio_unitario",
                "precio_cuarta",
                "precio_media_docena",
              ] as const
            ).map((key, i) => (
              <label key={key}>
                {["Unitario (1–2)", "Cuarta (3–5)", "Media docena (6+)"][i]} ·
                Bs
                <input
                  type="number"
                  min="0.01"
                  max="99999999.99"
                  step="0.01"
                  required={key === "precio_unitario"}
                  placeholder={
                    key === "precio_unitario" ? undefined : "Sin descuento"
                  }
                  value={form[key] ?? ""}
                  onChange={(e) => field(key, e.target.value)}
                />
              </label>
            ))}
          </div>
          <p className="text-sm text-muted">
            Cuarta y media docena son opcionales. Déjalos vacíos si el vestido
            no tiene ese descuento.
          </p>
          <div>
            <h3 className="font-bold">Colores, tallas y existencias</h3>
            <p className="mb-3 text-sm text-muted">
              Cada fila representa una variante. Stock total:{" "}
              {form.variantes.reduce((n, v) => n + (v.cantidad_stock || 0), 0)}
            </p>
            <div className="space-y-3">
              {form.variantes.map((v, i) => (
                <div key={v.id_variante ?? `new-${i}`} className="variant-row">
                  <label>
                    Color
                    <input
                      aria-label={`Color ${i + 1}`}
                      required
                      maxLength={30}
                      value={v.color}
                      onChange={(e) => variant(i, { color: e.target.value })}
                    />
                  </label>
                  <label>
                    Talla (opcional)
                    <input
                      aria-label={`Talla ${i + 1}`}
                      maxLength={10}
                      value={v.talla ?? ""}
                      onChange={(e) =>
                        variant(i, { talla: e.target.value || null })
                      }
                    />
                  </label>
                  <label>
                    Cantidad
                    <input
                      aria-label={`Cantidad ${i + 1}`}
                      type="number"
                      min="1"
                      max="2147483647"
                      step="1"
                      required
                      value={v.cantidad_stock}
                      onChange={(e) =>
                        variant(i, { cantidad_stock: e.target.valueAsNumber })
                      }
                    />
                  </label>
                  <Button
                    disabled={form.variantes.length === 1}
                    aria-label={`Quitar variante ${i + 1}`}
                    onClick={() =>
                      field(
                        "variantes",
                        form.variantes.filter((_, index) => index !== i),
                      )
                    }
                  >
                    Quitar
                  </Button>
                </div>
              ))}
            </div>
            <Button
              className="mt-3"
              disabled={form.variantes.length >= 100}
              onClick={() =>
                field("variantes", [
                  ...form.variantes,
                  { color: "", talla: null, cantidad_stock: 1 },
                ])
              }
            >
              + Añadir variante
            </Button>
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <footer className="flex flex-wrap justify-end gap-3">
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" type="submit">
              {busy ? "Guardando…" : "Guardar vestido"}
            </Button>
          </footer>
        </fieldset>
      </form>
    </Modal>
  );
}
