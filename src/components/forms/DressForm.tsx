import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { inventoryApi } from "../../services/inventory.api";
import { errorMessage } from "../../services/api";
import { priceOrderError } from "../../services/inventoryRules";
import { useAutoResizeTextarea } from "../../hooks/useAutoResizeTextarea";
import type { Dress, DressInput, Owner, Variant } from "../../types/inventory";

const Required = () => (
  <span className="required-mark" aria-hidden="true">
    *
  </span>
);
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
          ubicacion_almacen: dress.ubicacion_almacen ?? "",
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
          ubicacion_almacen: "",
          precio_unitario: "",
          precio_cuarta: "",
          precio_media_docena: "",
          id_propietario: owners[0]?.id_propietario ?? 0,
          variantes: [{ color: "", talla: null, cantidad_stock: 1 }],
        },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const descriptionRef = useAutoResizeTextarea(form.descripcion);
  const pricesError = priceOrderError(
    form.precio_unitario,
    form.precio_cuarta,
    form.precio_media_docena,
  );
  function field<K extends keyof DressInput>(key: K, value: DressInput[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }
  function variant(index: number, patch: Partial<Variant>) {
    field(
      "variantes",
      form.variantes.map((value, i) =>
        i === index ? { ...value, ...patch } : value,
      ),
    );
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (
        !/^[A-M][1-9][0-9]{0,17}$/.test(
          form.ubicacion_almacen.trim().toUpperCase(),
        )
      )
        throw new Error(
          "Usa una ubicación como A1, A2 o M12 (letras A–M y un número positivo).",
        );
      if (
        !form.precio_unitario.trim() ||
        !Number.isFinite(Number(form.precio_unitario)) ||
        Number(form.precio_unitario) <= 0
      )
        throw new Error("El precio unitario debe ser mayor que cero");
      if (
        [form.precio_cuarta, form.precio_media_docena].some(
          (price) =>
            price != null &&
            price.trim() !== "" &&
            (!Number.isFinite(Number(price)) || Number(price) <= 0),
        )
      )
        throw new Error("Los descuentos informados deben ser mayores que cero");
      if (pricesError) throw new Error(pricesError);
      if (
        form.variantes.some(
          (value) =>
            !Number.isInteger(value.cantidad_stock) ||
            value.cantidad_stock < 0 ||
            (!value.id_variante && value.cantidad_stock === 0),
        )
      )
        throw new Error(
          "Las variantes nuevas requieren una cantidad entera mayor que cero. Las existentes pueden conservar stock cero.",
        );
      const keys = form.variantes.map(
        (value) =>
          `${value.color.trim().toLowerCase()}|${(value.talla ?? "").trim().toLowerCase()}`,
      );
      if (new Set(keys).size !== keys.length)
        throw new Error("No repitas combinaciones de color y talla");
      const payload = {
        ...form,
        ubicacion_almacen: form.ubicacion_almacen.trim().toUpperCase(),
        precio_cuarta: form.precio_cuarta?.trim() || null,
        precio_media_docena: form.precio_media_docena?.trim() || null,
      };
      if (dress) await inventoryApi.update(dress.id_vestido, payload);
      else await inventoryApi.create(payload);
      onSaved();
    } catch (caught) {
      setError(errorMessage(caught));
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
        <fieldset disabled={busy} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              Nombre <Required />
              <input
                autoFocus
                required
                maxLength={50}
                value={form.nombre}
                onChange={(event) => field("nombre", event.target.value)}
              />
            </label>
            <label>
              Dueño de la prenda <Required />
              <select
                required
                value={form.id_propietario}
                onChange={(event) =>
                  field("id_propietario", Number(event.target.value))
                }
              >
                {owners.map((owner) => (
                  <option
                    key={owner.id_propietario}
                    value={owner.id_propietario}
                  >
                    {owner.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              Descripción <Required />
              <textarea
                ref={descriptionRef}
                className="dress-description"
                required
                maxLength={150}
                value={form.descripcion}
                onChange={(event) => field("descripcion", event.target.value)}
              />
            </label>
            <label>
              Ubicación en almacén <Required />
              <input
                required
                maxLength={20}
                pattern="[A-M][1-9][0-9]{0,17}"
                placeholder="A1"
                title="Letra A–M y número positivo, por ejemplo A1 o M12"
                value={form.ubicacion_almacen}
                onChange={(event) =>
                  field("ubicacion_almacen", event.target.value.toUpperCase())
                }
              />
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
                Bs {key === "precio_unitario" && <Required />}
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
                  aria-invalid={pricesError ? true : undefined}
                  aria-describedby={
                    pricesError ? "price-order-error" : "price-order-help"
                  }
                  onChange={(event) => field(key, event.target.value)}
                />
              </label>
            ))}
          </div>
          {pricesError && (
            <p id="price-order-error" role="alert" className="error">
              {pricesError}
            </p>
          )}
          <div>
            <h3 className="font-bold">Colores, tallas y existencias</h3>
            <div className="space-y-3">
              {form.variantes.map((value, i) => (
                <div
                  key={value.id_variante ?? `new-${i}`}
                  className="variant-row"
                >
                  <label>
                    Color <Required />
                    <input
                      aria-label={`Color ${i + 1}`}
                      required
                      maxLength={30}
                      value={value.color}
                      onChange={(event) =>
                        variant(i, { color: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Talla (opcional)
                    <input
                      aria-label={`Talla ${i + 1}`}
                      maxLength={10}
                      value={value.talla ?? ""}
                      onChange={(event) =>
                        variant(i, { talla: event.target.value || null })
                      }
                    />
                  </label>
                  <label>
                    Cantidad <Required />
                    <input
                      aria-label={`Cantidad ${i + 1}`}
                      type="number"
                      min={value.id_variante ? 0 : 1}
                      max="2147483647"
                      step="1"
                      required
                      value={
                        Number.isNaN(value.cantidad_stock)
                          ? ""
                          : value.cantidad_stock
                      }
                      onChange={(event) =>
                        variant(i, {
                          cantidad_stock: event.target.valueAsNumber,
                        })
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
              <Plus
                size={16}
                className="inline-block align-middle"
                aria-hidden="true"
              />{" "}
              Añadir variante
            </Button>
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <footer className="flex flex-wrap justify-end gap-3">
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={!!pricesError}>
              {busy ? "Guardando…" : "Guardar vestido"}
            </Button>
          </footer>
        </fieldset>
      </form>
    </Modal>
  );
}
