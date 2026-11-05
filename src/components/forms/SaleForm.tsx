import { useState, type FormEvent } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useInventory } from "../../hooks/useInventory";
import { salesApi } from "../../services/sales.api";
import { errorMessage } from "../../services/api";
import {
  cents,
  decimal,
  money,
  orderNumber,
  type Sale,
  type SaleInput,
} from "../../types/sales";
function registrationKey() {
  const a = crypto.getRandomValues(new Uint8Array(16));
  a[6] = (a[6] & 15) | 64;
  a[8] = (a[8] & 63) | 128;
  return Array.from(
    a,
    (b, i) =>
      `${[4, 6, 8, 10].includes(i) ? "-" : ""}${b.toString(16).padStart(2, "0")}`,
  ).join("");
}
const departments = [
  "La_Paz",
  "Cochabamba",
  "Santa_Cruz",
  "Oruro",
  "Potosi",
  "Tarija",
  "Chuquisaca",
  "Beni",
  "Pando",
];
export function SaleForm({
  sale,
  exchange = false,
  onClose,
  onSaved,
}: {
  sale?: Sale;
  exchange?: boolean;
  onClose: () => void;
  onSaved: (s: Sale) => void;
}) {
  const { dresses, loading, error: catalogError, reload } = useInventory();
  const [key] = useState(() => registrationKey());
  const [quantities, setQuantities] = useState<Record<number, number>>(() =>
    Object.fromEntries(
      sale?.detalles.map((d) => [d.id_variante, d.cantidad]) ?? [],
    ),
  );
  const [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [customer, setCustomer] = useState({
    nombre: sale?.cliente_nombre ?? sale?.cliente.nombre ?? "",
    celular: sale?.cliente_celular ?? sale?.cliente.celular ?? "",
    direccion_entrega: sale?.direccion_entrega ?? "",
    link_ubicacion: sale?.link_ubicacion ?? "",
  });
  const [additional, setAdditional] = useState(sale?.adicional_delivery ?? "0"),
    [shipping, setShipping] = useState(!!sale?.departamento_destino),
    [department, setDepartment] = useState(
      sale?.departamento_destino ?? "Cochabamba",
    ),
    [city, setCity] = useState(sale?.ciudad_provincia ?? ""),
    [shippingCost, setShippingCost] = useState(sale?.costo_envio ?? "0");
  const total = Object.values(quantities).reduce((n, q) => n + q, 0),
    tariff = total >= 6 ? "media_docena" : total >= 3 ? "cuarta" : "unitario";
  const variants = dresses.flatMap((d) =>
    d.variantes.map((v) => ({
      dress: d,
      variant: v,
      id: v.id_variante!,
      available:
        v.cantidad_stock +
        (sale?.detalles.find((x) => x.id_variante === v.id_variante)
          ?.cantidad ?? 0),
    })),
  );
  const chosen = variants.filter((v) => quantities[v.id] > 0);
  const price = (v: (typeof variants)[number]) => {
    const old = sale?.detalles.find((d) => d.id_variante === v.id);
    if (old && sale?.tarifa_aplicada === tariff)
      return cents(old.precio_unitario_aplicado);
    return cents(
      (total >= 6
        ? v.dress.precio_media_docena
        : total >= 3
          ? v.dress.precio_cuarta
          : null) ?? v.dress.precio_unitario,
    );
  };
  const subtotal = chosen.reduce((n, v) => n + price(v) * quantities[v.id], 0),
    net = subtotal - cents(sale?.costo_delivery ?? "10");
  const charged =
    subtotal + cents(additional) + (shipping ? cents(shippingCost) : 0);
  const unavailable =
    chosen.some((v) => quantities[v.id] > v.available) ||
    Object.keys(quantities).some(
      (id) =>
        quantities[Number(id)] > 0 &&
        !variants.some((v) => v.id === Number(id)),
    );
  const visible = variants.filter((v) =>
    `${v.dress.nombre} ${v.dress.descripcion} ${v.variant.color} ${v.variant.talla ?? ""}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  function quantity(id: number, value: number) {
    setQuantities((q) => ({ ...q, [id]: Math.max(0, Math.floor(value) || 0) }));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !total || unavailable) return;
    setBusy(true);
    setError("");
    const data: SaleInput = {
      clave_registro: sale?.clave_registro ?? key,
      version: sale?.version,
      cliente: {
        nombre: customer.nombre || null,
        celular: customer.celular,
        direccion_entrega: customer.direccion_entrega || null,
        link_ubicacion: customer.link_ubicacion || null,
      },
      detalles: chosen.map((v) => ({
        id_variante: v.id,
        cantidad: quantities[v.id],
      })),
      adicional_delivery: additional,
      departamento_destino: shipping ? department : null,
      ciudad_provincia: shipping ? city : null,
      costo_envio: shipping ? shippingCost : null,
    };
    try {
      onSaved(await salesApi.save(data, sale?.id_venta));
    } catch (e) {
      setError(errorMessage(e));
      void reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        sale
          ? `${exchange ? "Cambio de vestido" : "Editar venta"} · ${orderNumber(sale)}`
          : "Registrar venta"
      }
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={(e) => void submit(e)} className="sale-form">
        {exchange && (
          <p className="rounded-lg bg-mint p-3 text-sm">
            Deselecciona las prendas devueltas y selecciona sus reemplazos. Se
            ajustarán stock e importes del pedido.
          </p>
        )}
        <fieldset disabled={busy} className="space-y-4">
          <legend className="mb-3 font-bold">Seleccionar vestidos</legend>
          <label>
            Buscar vestido, color o talla
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en el catálogo"
            />
          </label>
          {catalogError && (
            <p role="alert" className="error">
              {catalogError}{" "}
              <Button onClick={() => void reload()}>Reintentar</Button>
            </p>
          )}
          <div
            className="sale-catalog"
            role="group"
            aria-label="Vestidos disponibles"
          >
            {loading ? (
              <p role="status">Cargando catálogo…</p>
            ) : (
              visible.map((v) => {
                const amount = quantities[v.id] ?? 0;
                return (
                  <div
                    key={v.id}
                    className={`sale-product ${amount ? "selected" : ""}`}
                  >
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        disabled={!v.available}
                        checked={amount > 0}
                        onChange={() => quantity(v.id, amount ? 0 : 1)}
                        aria-label={`Seleccionar ${v.dress.nombre} ${v.variant.color} ${v.variant.talla ?? ""}`}
                      />
                      <span>
                        <strong>{v.dress.nombre}</strong>
                        <span className="block text-xs font-normal text-muted">
                          {v.variant.color}
                          {v.variant.talla
                            ? ` · ${v.variant.talla}`
                            : ""} · {v.available} disponibles
                        </span>
                        <span className="block text-sm">
                          {money(decimal(price(v)))} por prenda
                        </span>
                      </span>
                    </label>
                    <div className="quantity-control">
                      <button
                        type="button"
                        disabled={!amount}
                        onClick={() => quantity(v.id, amount - 1)}
                        aria-label={`Quitar una unidad de ${v.dress.nombre} ${v.variant.color}`}
                      >
                        −
                      </button>
                      <input
                        aria-label={`Cantidad de ${v.dress.nombre} ${v.variant.color}`}
                        type="number"
                        min="0"
                        max={v.available}
                        step="1"
                        value={amount}
                        onChange={(e) => quantity(v.id, Number(e.target.value))}
                      />
                      <button
                        type="button"
                        disabled={amount >= v.available}
                        onClick={() => quantity(v.id, amount + 1)}
                        aria-label={`Añadir una unidad de ${v.dress.nombre} ${v.variant.color}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            {!loading && !visible.length && <p>No se encontraron vestidos.</p>}
          </div>
          <p className="text-sm text-primary">
            {total} prendas · Tarifa {tariff.replaceAll("_", " ")}. Si falta ese
            precio, se aplica el unitario.
          </p>
          {sale && (
            <p className="text-xs text-muted">
              Los precios anteriores se conservan para las variantes existentes
              si mantienes el tramo de cantidad.
            </p>
          )}
        </fieldset>
        <fieldset disabled={busy} className="sale-fields">
          <legend>Datos del cliente</legend>
          <label>
            Celular del cliente
            <input
              required
              type="tel"
              inputMode="tel"
              pattern="\+?[0-9]{7,14}"
              maxLength={15}
              value={customer.celular}
              onChange={(e) =>
                setCustomer({ ...customer, celular: e.target.value })
              }
            />
          </label>
          <label>
            Nombre
            <input
              maxLength={100}
              value={customer.nombre}
              onChange={(e) =>
                setCustomer({ ...customer, nombre: e.target.value })
              }
            />
          </label>
          <label className="sale-field-wide">
            Dirección de entrega
            <input
              maxLength={255}
              value={customer.direccion_entrega}
              onChange={(e) =>
                setCustomer({ ...customer, direccion_entrega: e.target.value })
              }
            />
          </label>
          <label className="sale-field-wide">
            Enlace de ubicación
            <input
              type="url"
              maxLength={2000}
              placeholder="https://maps.google.com/…"
              value={customer.link_ubicacion}
              onChange={(e) =>
                setCustomer({ ...customer, link_ubicacion: e.target.value })
              }
            />
          </label>
        </fieldset>
        <fieldset disabled={busy} className="space-y-4">
          <legend className="mb-3 font-bold">Delivery y envío</legend>
          <label>
            Adicional de delivery (Bs)
            <input
              required
              type="number"
              min="0"
              max="99999999.99"
              step="0.01"
              value={additional}
              onChange={(e) => setAdditional(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={shipping}
              onChange={(e) => setShipping(e.target.checked)}
            />
            Envío a otro departamento / ciudad
          </label>
          {shipping && (
            <div className="sale-fields">
              <label>
                Departamento
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ciudad / provincia
                <input
                  required
                  maxLength={100}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </label>
              <label>
                Costo del envío (Bs)
                <input
                  required
                  type="number"
                  min="0"
                  max="99999999.99"
                  step="0.01"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                />
              </label>
            </div>
          )}
        </fieldset>
        <section className="sale-summary" aria-label="Resumen de la venta">
          <div>
            <span>Prendas ({total})</span>
            <strong>{money(decimal(subtotal))}</strong>
          </div>
          <div>
            <span>Delivery adicional</span>
            <strong>{money(additional)}</strong>
          </div>
          {shipping && (
            <div>
              <span>Envío departamental</span>
              <strong>{money(shippingCost)}</strong>
            </div>
          )}
          <div className="sale-total">
            <span>Total a cobrar</span>
            <strong>{money(decimal(charged))}</strong>
          </div>
          <p className="text-xs text-muted">
            Neto de tienda: {money(decimal(net))} · se descuentan Bs{" "}
            {Number(sale?.costo_delivery ?? 10).toFixed(2)} de delivery fijo.
            Los adicionales y el envío no forman parte del neto.
          </p>
        </section>
        {unavailable && (
          <p role="alert" className="error">
            Una cantidad supera el stock disponible o una variante fue
            eliminada. Revisa la selección.
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <footer className="flex justify-end gap-3">
          <Button disabled={busy} onClick={onClose}>
            Volver
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={
              busy || loading || !!catalogError || !total || unavailable
            }
          >
            {busy ? "Guardando…" : sale ? "Guardar cambios" : "Registrar venta"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
