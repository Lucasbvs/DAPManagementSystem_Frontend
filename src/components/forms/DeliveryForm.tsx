import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { salesApi } from "../../services/sales.api";
import { errorMessage } from "../../services/api";
import {
  money,
  cents,
  decimal,
  orderNumber,
  type Sale,
} from "../../types/sales";

export function DeliveryForm({
  sales,
  onClose,
  onSaved,
}: {
  sales: Sale[];
  onClose: () => void;
  onSaved: (sales: Sale[]) => void;
}) {
  const [orders] = useState(sales);
  const [shippingCosts, setShippingCosts] = useState<Record<number, string>>(
    () =>
      Object.fromEntries(
        sales.map((sale) => [sale.id_venta, sale.costo_envio ?? "0"]),
      ),
  );
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const cards = orders.map((sale) => {
    const lines = sale.detalles.filter((line) => line.tipo === "Entrega");
    const total = lines.reduce(
      (n, line) => n + (quantities[line.id_detalle] ?? 0),
      0,
    );
    const cancelled = lines.reduce((n, line) => n + line.cantidad, 0) - total;
    const subtotal = lines.reduce(
      (n, line) =>
        n +
        cents(line.precio_unitario_aplicado) *
          (quantities[line.id_detalle] ?? 0),
      0,
    );
    const amount = total
      ? subtotal +
        cents(sale.adicional_delivery) +
        cents(
          sale.forma_pago === "Pagado" && sale.departamento_destino
            ? shippingCosts[sale.id_venta]
            : sale.costo_envio,
        )
      : 0;
    return { sale, lines, total, cancelled, amount };
  });
  const total = cards.reduce((sum, card) => sum + card.total, 0);
  const cancelled = cards.reduce((sum, card) => sum + card.cancelled, 0);
  const amount = cards.reduce((sum, card) => sum + card.amount, 0);
  function quantity(id: number, value: number) {
    setQuantities((current) => ({ ...current, [id]: value }));
  }
  async function confirm() {
    if (busy) return;
    if (
      orders.some(
        (sale) =>
          sale.forma_pago === "Pagado" &&
          sale.departamento_destino &&
          !/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(
            shippingCosts[sale.id_venta] || "0",
          ),
      )
    ) {
      setError(
        "Revisa el costo de envío: debe ser un importe no negativo con hasta dos decimales.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      onSaved(
        await salesApi.confirmMany(
          cards.map(({ sale, lines }) => ({
            id_venta: sale.id_venta,
            version: sale.version,
            ...(sale.forma_pago === "Pagado" && sale.departamento_destino
              ? { costo_envio: shippingCosts[sale.id_venta] || "0" }
              : {}),
            entregas: lines.map((line) => ({
              id_detalle: line.id_detalle,
              cantidad: quantities[line.id_detalle] ?? 0,
            })),
          })),
        ),
      );
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`Confirmar entregas · ${orders.length} ${orders.length === 1 ? "venta" : "ventas"}`}
      busy={busy}
      onClose={onClose}
    >
      <p className="mb-4 text-sm">
        Marca las prendas entregadas y ajusta sus cantidades. Las unidades sin
        marcar se cancelarán y volverán al inventario.
      </p>
      <div className="space-y-4">
        {cards.map(({ sale, lines, total, cancelled, amount }) => (
          <section
            key={sale.id_venta}
            className="panel"
            aria-label={`Entrega ${orderNumber(sale)}`}
          >
            <h3 className="mb-1 text-lg font-bold">{orderNumber(sale)}</h3>
            <p className="mb-3 text-sm text-muted">
              {sale.cliente_nombre ?? sale.cliente.nombre ?? "Cliente"} ·{" "}
              {sale.cliente_celular ?? sale.cliente.celular}
            </p>
            <p className="mb-3 text-sm">
              Forma de pago:{" "}
              {sale.forma_pago === "Pagado" ? "Pagado" : "Por pagar"}
            </p>
            <fieldset disabled={busy} className="space-y-3">
              {sale.forma_pago === "Pagado" && sale.departamento_destino && (
                <label className="block">
                  Costo de envío real (Bs)
                  <input
                    type="number"
                    min="0"
                    max="99999999.99"
                    step="0.01"
                    value={shippingCosts[sale.id_venta]}
                    placeholder="0.00"
                    onChange={(e) =>
                      setShippingCosts((current) => ({
                        ...current,
                        [sale.id_venta]: e.target.value,
                      }))
                    }
                  />
                </label>
              )}
              {lines.map((line) => {
                const amount = quantities[line.id_detalle] ?? 0;
                const name = `${line.nombre_vestido ?? line.variante.vestido.nombre} / ${line.color ?? line.variante.color}${line.talla ? ` / ${line.talla}` : ""}`;
                return (
                  <div key={line.id_detalle} className="sale-product">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={amount > 0}
                        onChange={() =>
                          quantity(line.id_detalle, amount ? 0 : line.cantidad)
                        }
                      />
                      <span>
                        {name}
                        <small className="block">
                          {line.cantidad} solicitadas ·{" "}
                          {money(line.precio_unitario_aplicado)} por unidad
                        </small>
                      </span>
                    </label>
                    <div className="quantity-control">
                      <button
                        type="button"
                        aria-label={`Entregar una menos de ${name}`}
                        disabled={!amount}
                        onClick={() => quantity(line.id_detalle, amount - 1)}
                      >
                        <Minus size={16} aria-hidden="true" />
                      </button>
                      <input
                        readOnly
                        value={amount}
                        aria-label={`Cantidad entregada de ${name}`}
                      />
                      <button
                        type="button"
                        aria-label={`Entregar una más de ${name}`}
                        disabled={amount >= line.cantidad}
                        onClick={() => quantity(line.id_detalle, amount + 1)}
                      >
                        <Plus size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </fieldset>
            <div className="mt-3 border-t border-line pt-3 text-sm">
              <p>
                {total} entregadas · {cancelled} se cancelarán
              </p>
              <p className="mt-1 font-bold">
                Total final: {money(decimal(amount))}
              </p>
              {!total && (
                <p className="mt-1 text-red-800">
                  Esta venta se cancelará completa.
                </p>
              )}
            </div>
          </section>
        ))}
      </div>
      <section className="sale-summary mt-4">
        <div>
          <span>Entregadas</span>
          <strong>{total}</strong>
        </div>
        <div>
          <span>Se cancelarán</span>
          <strong>{cancelled}</strong>
        </div>
        <div>
          <span>Total final</span>
          <strong>{money(decimal(amount))}</strong>
        </div>
        {!total && (
          <p role="status">Se cancelarán todas las ventas seleccionadas.</p>
        )}
      </section>
      {error && (
        <p className="error mt-3" role="alert">
          {error}
        </p>
      )}
      <footer className="mt-4 flex justify-end gap-3">
        <Button onClick={onClose} disabled={busy}>
          Volver
        </Button>
        <Button
          variant={total ? "primary" : "danger"}
          disabled={busy}
          onClick={() => void confirm()}
        >
          {busy
            ? "Guardando…"
            : total
              ? "Registrar entregas"
              : "Cancelar todas las prendas"}
        </Button>
      </footer>
    </Modal>
  );
}
