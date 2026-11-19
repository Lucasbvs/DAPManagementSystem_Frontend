import { Plus, Minus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useInventory } from "../../hooks/useInventory";
import { salesApi } from "../../services/sales.api";
import { errorMessage } from "../../services/api";
import {
  availableReturn,
  differenceLabel,
  registrationKey,
} from "../../services/salesRules";
import {
  cents,
  decimal,
  money,
  orderNumber,
  type Sale,
} from "../../types/sales";
import { DeliverySchedule } from "./DeliverySchedule";

export function ExchangeForm({
  sale,
  onClose,
  onSaved,
}: {
  sale: Sale;
  onClose: () => void;
  onSaved: (s: Sale) => void;
}) {
  const [source] = useState(sale),
    [key] = useState(registrationKey);
  const { dresses, loading, error: catalogError, reload } = useInventory();
  const [returns, setReturns] = useState<Record<number, number>>({}),
    [quantities, setQuantities] = useState<Record<number, number>>({});
  const [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [start, setStart] = useState(source.hora_entrega_desde ?? ""),
    [end, setEnd] = useState(source.hora_entrega_hasta ?? ""),
    [range, setRange] = useState(!!source.hora_entrega_hasta);
  const available = source.detalles.filter((d) => availableReturn(d) > 0),
    chosenReturns = available.filter((d) => (returns[d.id_detalle] ?? 0) > 0);
  const total = Object.values(quantities).reduce((n, q) => n + q, 0);
  const returnVariantIds = new Set(available.map((line) => line.id_variante));
  const variants = dresses.flatMap((dress) =>
    dress.variantes
      .filter((variant) => !returnVariantIds.has(variant.id_variante!))
      .map((variant) => ({
        id: variant.id_variante!,
        dress,
        variant,
        stock: variant.cantidad_stock,
      })),
  );
  const chosen = variants.filter((v) => (quantities[v.id] ?? 0) > 0);
  const price = (v: (typeof variants)[number]) =>
    cents(
      (total >= 6
        ? v.dress.precio_media_docena
        : total >= 3
          ? v.dress.precio_cuarta
          : null) ?? v.dress.precio_unitario,
    );
  const returned = chosenReturns.reduce(
    (n, d) => n + cents(d.precio_unitario_aplicado) * returns[d.id_detalle],
    0,
  );
  const delivered = chosen.reduce((n, v) => n + price(v) * quantities[v.id], 0),
    difference = delivered - returned;
  const retained = available.reduce(
    (sum, line) =>
      sum +
      cents(line.precio_unitario_aplicado) *
        (availableReturn(line) - (returns[line.id_detalle] ?? 0)),
    0,
  );
  const replacementTotal =
    retained +
    delivered +
    cents(source.adicional_delivery) +
    cents(source.costo_envio);
  const invalid =
    chosen.some((v) => quantities[v.id] > v.stock) ||
    chosenReturns.some((d) => returns[d.id_detalle] > availableReturn(d)) ||
    Object.keys(quantities).some(
      (id) =>
        quantities[Number(id)] > 0 &&
        !variants.some((v) => v.id === Number(id)),
    );
  const filtered = variants.filter((v) =>
    `${v.dress.nombre} ${v.variant.color} ${v.variant.talla ?? ""} ${v.dress.ubicacion_almacen ?? ""}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  const quantity = (id: number, n: number) =>
    setQuantities((q) => ({ ...q, [id]: Math.max(0, Math.floor(n) || 0) }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (
      busy ||
      invalid ||
      !chosenReturns.length ||
      !total ||
      (range && end <= start)
    )
      return;
    setBusy(true);
    setError("");
    try {
      onSaved(
        await salesApi.exchange(source, {
          clave_registro: key,
          version: source.version,
          hora_entrega_desde: start,
          hora_entrega_hasta: range ? end : null,
          devoluciones: chosenReturns.map((d) => ({
            id_detalle: d.id_detalle,
            cantidad: returns[d.id_detalle],
          })),
          entregas: chosen.map((v) => ({
            id_variante: v.id,
            cantidad: quantities[v.id],
          })),
        }),
      );
    } catch (e) {
      setError(errorMessage(e));
      void reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`Cambio de vestido · ${orderNumber(source)}`}
      onClose={onClose}
      busy={busy}
    >
      <form className="sale-form" onSubmit={(e) => void submit(e)}>
        <p className="exchange-intro">
          La venta {orderNumber(source)} se cancelará y será reemplazada por un
          pedido pendiente con las prendas conservadas y las nuevas. Se
          registrarán las cantidades para devolver y entregar estas prendas.
          Cliente: {source.cliente_celular ?? source.cliente.celular}.
        </p>
        <fieldset disabled={busy} className="space-y-3">
          <legend className="mb-3 font-bold">1. Devolver</legend>
          {available.map((d) => (
            <div className="exchange-return" key={d.id_detalle}>
              <label>
                {d.nombre_vestido ?? d.variante.vestido.nombre} ·{" "}
                {d.color ?? d.variante.color}
                {d.talla ? ` / ${d.talla}` : ""}
                <small>
                  {availableReturn(d)} disponibles para devolver ·{" "}
                  {money(d.precio_unitario_aplicado)} por prenda
                </small>
              </label>
              <div className="quantity-control">
                <button
                  type="button"
                  disabled={!(returns[d.id_detalle] ?? 0)}
                  aria-label={`Devolver una prenda menos de ${d.nombre_vestido ?? d.variante.vestido.nombre} ${d.color ?? d.variante.color}`}
                  onClick={() =>
                    setReturns((values) => ({
                      ...values,
                      [d.id_detalle]: Math.max(
                        0,
                        (values[d.id_detalle] ?? 0) - 1,
                      ),
                    }))
                  }
                >
                  <Minus size={16} aria-hidden="true" />
                </button>
                <input
                  readOnly
                  type="text"
                  aria-label={`Cantidad a devolver de ${d.nombre_vestido ?? d.variante.vestido.nombre} ${d.color ?? d.variante.color}`}
                  value={returns[d.id_detalle] ?? 0}
                />
                <button
                  type="button"
                  disabled={(returns[d.id_detalle] ?? 0) >= availableReturn(d)}
                  aria-label={`Devolver una prenda más de ${d.nombre_vestido ?? d.variante.vestido.nombre} ${d.color ?? d.variante.color}`}
                  onClick={() =>
                    setReturns((values) => ({
                      ...values,
                      [d.id_detalle]: Math.min(
                        availableReturn(d),
                        (values[d.id_detalle] ?? 0) + 1,
                      ),
                    }))
                  }
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
          {!available.length && (
            <p role="status">
              Todas las prendas de este pedido ya fueron devueltas.
            </p>
          )}
        </fieldset>
        <fieldset disabled={busy} className="space-y-3">
          <legend className="mb-3 font-bold">2. Entregar</legend>
          <label>
            Buscar reemplazo
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre, color, talla o ubicación"
            />
          </label>
          {catalogError && (
            <p role="alert" className="error">
              {catalogError}
            </p>
          )}
          <div className="sale-catalog">
            {loading ? (
              <p role="status">Cargando catálogo…</p>
            ) : (
              filtered.map((v) => {
                const amount = quantities[v.id] ?? 0;
                return (
                  <div
                    key={v.id}
                    className={`sale-product ${amount ? "selected" : ""}`}
                  >
                    <div className="flex flex-1 items-start gap-3">
                      <span>
                        <strong>{v.dress.nombre}</strong>
                        <span className="block text-xs font-normal text-muted">
                          {v.variant.color}
                          {v.variant.talla
                            ? ` / ${v.variant.talla}`
                            : ""} · {v.stock} disponibles · Almacén{" "}
                          {v.dress.ubicacion_almacen ?? "sin asignar"}
                        </span>
                        <span className="block text-sm">
                          {money(decimal(price(v)))} por prenda
                        </span>
                      </span>
                    </div>
                    <div className="quantity-control">
                      <button
                        type="button"
                        disabled={!amount}
                        onClick={() => quantity(v.id, amount - 1)}
                        aria-label={`Quitar reemplazo ${v.dress.nombre} ${v.variant.color}`}
                      >
                        <Minus size={16} aria-hidden="true" />
                      </button>
                      <input
                        aria-label={`Cantidad a entregar ${v.dress.nombre} ${v.variant.color}`}
                        type="text"
                        readOnly
                        value={amount}
                      />
                      <button
                        type="button"
                        disabled={amount >= v.stock}
                        onClick={() => quantity(v.id, amount + 1)}
                        aria-label={`Añadir reemplazo ${v.dress.nombre} ${v.variant.color}`}
                      >
                        <Plus size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <p className="text-xs text-muted">
            Lo devuelto conserva su precio de venta. Lo nuevo usa el precio por
            cantidad de prendas a entregar; si falta la tarifa, se usa el
            unitario.
          </p>
        </fieldset>
        <fieldset disabled={busy}>
          <DeliverySchedule
            start={start}
            end={end}
            range={range}
            setStart={setStart}
            setEnd={setEnd}
            setRange={setRange}
          />
        </fieldset>
        <section className="sale-summary" aria-label="Diferencia del cambio">
          <div>
            <span>Valor de prendas devueltas</span>
            <strong>{money(decimal(returned))}</strong>
          </div>
          <div>
            <span>Valor de prendas a entregar</span>
            <strong>{money(decimal(delivered))}</strong>
          </div>
          <div className="sale-total">
            <span>Diferencia</span>
            <strong>{differenceLabel(decimal(difference))}</strong>
          </div>
          <p className="text-xs text-muted">
            Este registro solo cobra o devuelve la diferencia. No vuelve a
            cobrar la compra original ni su delivery.
          </p>
        </section>
        {invalid && (
          <p role="alert" className="error">
            Revisa las cantidades devueltas y el stock disponible.
          </p>
        )}
        <section
          className="sale-summary"
          aria-label="Total del pedido reemplazante"
        >
          <div>
            <span>Prendas conservadas</span>
            <strong>{money(decimal(retained))}</strong>
          </div>
          <div>
            <span>Total del nuevo pedido</span>
            <strong>{money(decimal(replacementTotal))}</strong>
          </div>
          <p className="text-xs text-muted">
            Incluye los adicionales y el envío del pedido original. Confirma
            después qué prendas fueron entregadas.
          </p>
        </section>
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
              busy ||
              loading ||
              !!catalogError ||
              invalid ||
              !chosenReturns.length ||
              !total ||
              (range && !!end && end <= start)
            }
          >
            {busy ? "Registrando…" : "Registrar cambio"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
