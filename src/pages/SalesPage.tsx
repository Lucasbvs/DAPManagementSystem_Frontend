import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import {
  ActionResultModal,
  type ActionResult,
} from "../components/ui/ActionResultModal";
import { SalesIcon } from "../components/ui/SalesIcon";
import { subscribeInventory } from "../services/inventoryLive";
import { inventoryApi } from "../services/inventory.api";
import { errorMessage } from "../services/api";
import { SaleForm } from "../components/forms/SaleForm";
import { ExchangeForm } from "../components/forms/ExchangeForm";
import { salesApi } from "../services/sales.api";
import {
  availableReturn,
  deliveryTime,
  differenceLabel,
  linesForOwner,
  whatsappUrl,
} from "../services/salesRules";
import {
  cents,
  decimal,
  money,
  orderNumber,
  today,
  type Sale,
  type SaleLine,
} from "../types/sales";
import type { Owner } from "../types/inventory";

function WhatsApp({ sale }: { sale: Sale }) {
  return sale.estado === "Cancelada" ? (
    <span className="whatsapp-link disabled" aria-disabled="true">
      <SalesIcon name="whatsapp" />
      WhatsApp
    </span>
  ) : (
    <a
      className="whatsapp-link"
      href={whatsappUrl(sale)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      aria-label={`WhatsApp ${orderNumber(sale)}`}
    >
      <SalesIcon name="whatsapp" />
      WhatsApp
    </a>
  );
}
function LineList({ sale, owner }: { sale: Sale; owner: string }) {
  return (
    <span className="sale-lines">
      {linesForOwner(sale, owner).map((d: SaleLine) => (
        <span
          key={d.id_detalle}
          className={d.tipo === "Devolucion" ? "sale-return-line" : ""}
        >
          {sale.tipo === "Cambio"
            ? `${d.tipo === "Devolucion" ? "Devolver" : "Entregar"}: `
            : ""}
          {d.nombre_vestido ?? d.variante.vestido.nombre} ·{" "}
          {d.color ?? d.variante.color}
          {d.talla ? ` / ${d.talla}` : ""} ×{d.cantidad}
        </span>
      ))}
    </span>
  );
}
export function SalesPage() {
  const [date, setDate] = useState(today),
    [owner, setOwner] = useState(""),
    [owners, setOwners] = useState<Owner[]>([]);
  const [sales, setSales] = useState<Sale[]>([]),
    [selected, setSelected] = useState<number[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [modal, setModal] = useState<
      "new" | "edit" | "cancel" | "exchange" | null
    >(null),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(""),
    [result, setResult] = useState<ActionResult | null>(null);
  const revision = useRef(0),
    alive = useRef(false);
  const reload = useCallback(async () => {
    const request = ++revision.current;
    try {
      const [rows, people] = await Promise.all([
        salesApi.list(date, owner),
        inventoryApi.owners(),
      ]);
      if (alive.current && revision.current === request) {
        setSales(rows);
        setOwners(people);
        setSelected((ids) =>
          ids.filter((id) =>
            rows.some((s) => s.id_venta === id && s.estado === "Realizada"),
          ),
        );
        setError("");
      }
    } catch (e) {
      if (alive.current && revision.current === request)
        setError(errorMessage(e));
    } finally {
      if (alive.current && revision.current === request) setLoading(false);
    }
  }, [date, owner]);
  useEffect(() => {
    alive.current = true;
    setLoading(true);
    setSales([]);
    setSelected([]);
    void reload();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void reload(), 150);
    };
    const unsubscribe = subscribeInventory(refresh),
      fallback = setInterval(() => {
        if (document.visibilityState === "visible") refresh();
      }, 15000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => {
      alive.current = false;
      ++revision.current;
      unsubscribe();
      clearInterval(fallback);
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [reload]);
  const active = sales.filter((s) => s.estado === "Realizada"),
    chosen = active.filter((s) => selected.includes(s.id_venta)),
    one = chosen.length === 1 ? chosen[0] : undefined;
  const canEdit = !!one && one.tipo !== "Cambio" && !one.cambios.length,
    canExchange = !!one && one.detalles.some((d) => availableReturn(d) > 0);
  const blocked = busy || loading || !!error;
  const sum = (
    field:
      | "total_cobrado"
      | "adicional_delivery"
      | "costo_delivery"
      | "costo_envio"
      | "monto_neto",
  ) => active.reduce((n, s) => n + cents(s[field]), 0);
  function toggle(id: number) {
    setSelected((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }
  async function cancel() {
    setBusy(true);
    setActionError("");
    const failures: string[] = [];
    let done = 0;
    for (const sale of [...chosen].sort((a, b) => b.id_venta - a.id_venta)) {
      try {
        const fresh = (await salesApi.list(date)).find(
          (s) => s.id_venta === sale.id_venta,
        );
        await salesApi.cancel(fresh ?? sale);
        done++;
      } catch (e) {
        failures.push(`${orderNumber(sale)}: ${errorMessage(e)}`);
      }
    }
    await reload();
    setBusy(false);
    if (failures.length)
      setActionError(`${done} cancelada(s). ${failures.join(" · ")}`);
    else {
      setModal(null);
      setSelected([]);
      setResult({
        title: "Ventas canceladas",
        message:
          "Se revirtieron los movimientos de stock y se actualizaron los totales.",
      });
    }
  }
  async function print() {
    setBusy(true);
    setActionError("");
    try {
      const blob = await salesApi.print(
        date,
        chosen.map((s) => s.id_venta),
      );
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `DAP-ventas-${date}.pdf`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setActionError(errorMessage(e));
      void reload();
    } finally {
      setBusy(false);
    }
  }
  function saved(s: Sale) {
    const kind = modal;
    setModal(null);
    setSelected([]);
    setResult({
      title:
        kind === "new"
          ? "Venta registrada"
          : kind === "exchange"
            ? "Cambio registrado"
            : "Venta actualizada",
      message: `Pedido ${orderNumber(s)} guardado correctamente.`,
    });
    if (
      (kind === "new" || kind === "exchange") &&
      (date !== today() || owner)
    ) {
      setDate(today());
      setOwner("");
    } else void reload();
  }
  return (
    <div className="sales-page">
      <section className="panel sales-stat" aria-label="Resumen de ventas">
        <p>
          {owner
            ? "TOTAL NETO DE PEDIDOS FILTRADOS"
            : "TOTAL DE VENTAS DEL DÍA"}
        </p>
        <strong>{loading ? "…" : money(decimal(sum("monto_neto")))}</strong>
        <small>
          {money(decimal(sum("total_cobrado")))} cobrados −{" "}
          {money(decimal(sum("adicional_delivery")))} de adicionales
          {sum("costo_envio") > 0
            ? ` − ${money(decimal(sum("costo_envio")))} de envíos`
            : ""}{" "}
          − {money(decimal(sum("costo_delivery")))} de delivery
        </small>
      </section>
      {error && (
        <p className="error" role="alert">
          {error} <Button onClick={() => void reload()}>Reintentar</Button>
        </p>
      )}
      <section className="sales-list">
        <div className="sales-list-heading">
          <h2>Ventas del día</h2>
          <div className="sales-filters">
            <label>
              <span className="sr-only">Filtrar ventas por dueño</span>
              <select
                aria-label="Filtrar ventas por dueño"
                value={owner}
                onChange={(e) => {
                  setOwner(e.target.value);
                  setActionError("");
                }}
              >
                <option value="">Todos los dueños</option>
                {owners.map((o) => (
                  <option key={o.id_propietario} value={o.id_propietario}>
                    {o.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Filtrar ventas por fecha</span>
              <input
                aria-label="Filtrar ventas por fecha"
                type="date"
                required
                value={date}
                onChange={(e) => {
                  if (e.target.value) {
                    setDate(e.target.value);
                    setActionError("");
                  }
                }}
              />
            </label>
          </div>
        </div>
        <div
          className="sales-scroll"
          tabIndex={0}
          aria-label="Ventas de la fecha seleccionada"
        >
          {loading ? (
            <p role="status" className="p-8 text-center">
              Cargando ventas…
            </p>
          ) : (
            <>
              <table className="sales-table">
                <colgroup>
                  {[32, 78, 104, 116, 202, 64, 80, 100, 88, 84, 110].map(
                    (w, i) => (
                      <col key={i} style={{ width: w }} />
                    ),
                  )}
                </colgroup>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label="Seleccionar todas las ventas realizadas"
                        disabled={!active.length}
                        checked={
                          !!active.length &&
                          active.every((s) => selected.includes(s.id_venta))
                        }
                        onChange={() =>
                          setSelected(
                            active.every((s) => selected.includes(s.id_venta))
                              ? []
                              : active.map((s) => s.id_venta),
                          )
                        }
                      />
                    </th>
                    {[
                      "Pedido",
                      "Celular cliente",
                      "Entrega",
                      "Vestidos / unidades",
                      "Prendas",
                      "Delivery +",
                      "Total / diferencia",
                      "Neto",
                      "Estado",
                      "WhatsApp",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr
                      key={s.id_venta}
                      className={`${selected.includes(s.id_venta) ? "selected" : ""} ${s.estado === "Cancelada" ? "sale-cancelled" : ""}`}
                      onClick={() => {
                        if (s.estado === "Realizada") toggle(s.id_venta);
                      }}
                    >
                      <td>
                        <input
                          disabled={s.estado === "Cancelada"}
                          aria-label={`Seleccionar ${orderNumber(s)}`}
                          type="checkbox"
                          checked={selected.includes(s.id_venta)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggle(s.id_venta)}
                        />
                      </td>
                      <th scope="row">
                        {orderNumber(s)}
                        {s.tipo === "Cambio" && (
                          <small className="sale-kind">
                            Cambio
                            {s.venta_origen
                              ? ` de ${orderNumber(s.venta_origen)}`
                              : ""}
                          </small>
                        )}
                      </th>
                      <td>{s.cliente_celular ?? s.cliente.celular}</td>
                      <td>
                        {deliveryTime(
                          s.hora_entrega_desde,
                          s.hora_entrega_hasta,
                        )}
                      </td>
                      <td>
                        <LineList sale={s} owner={owner} />
                      </td>
                      <td>{s.total_prendas}</td>
                      <td>{money(s.adicional_delivery)}</td>
                      <td>
                        {s.tipo === "Cambio"
                          ? differenceLabel(s.total_cobrado)
                          : money(s.total_cobrado)}
                      </td>
                      <td>{money(s.monto_neto)}</td>
                      <td>{s.estado}</td>
                      <td>
                        <WhatsApp sale={s} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="sales-mobile-cards">
                {sales.map((s) => (
                  <article
                    key={s.id_venta}
                    className={`mobile-card sale-mobile-card ${selected.includes(s.id_venta) ? "selected" : ""} ${s.estado === "Cancelada" ? "sale-cancelled" : ""}`}
                  >
                    <button
                      className="sale-card-select"
                      disabled={s.estado === "Cancelada"}
                      aria-pressed={selected.includes(s.id_venta)}
                      aria-label={`Seleccionar ${orderNumber(s)}`}
                      onClick={() => toggle(s.id_venta)}
                    >
                      <span className="sale-card-title">
                        <strong>
                          {orderNumber(s)}
                          {s.tipo === "Cambio" && (
                            <span className="sale-kind">
                              Cambio
                              {s.venta_origen
                                ? ` de ${orderNumber(s.venta_origen)}`
                                : ""}
                            </span>
                          )}
                        </strong>
                        <span className="sale-status">{s.estado}</span>
                      </span>
                      <span className="sale-card-phone">
                        {s.cliente_celular ?? s.cliente.celular}
                        {s.cliente_nombre ? ` · ${s.cliente_nombre}` : ""}
                      </span>
                      <span className="sale-card-time">
                        Entrega:{" "}
                        {deliveryTime(
                          s.hora_entrega_desde,
                          s.hora_entrega_hasta,
                        )}
                      </span>
                      <LineList sale={s} owner={owner} />
                    </button>
                    <footer className="sale-card-footer">
                      <div>
                        <span className="text-xs text-muted">
                          {s.tipo === "Cambio"
                            ? "Diferencia"
                            : "Total del pedido"}
                        </span>
                        <strong>
                          {s.tipo === "Cambio"
                            ? differenceLabel(s.total_cobrado)
                            : money(s.total_cobrado)}
                        </strong>
                      </div>
                      <WhatsApp sale={s} />
                    </footer>
                  </article>
                ))}
              </div>
              {!sales.length && (
                <p className="p-10 text-center text-muted">
                  No hay ventas para los filtros elegidos.
                </p>
              )}
            </>
          )}
        </div>
      </section>
      <div className="sales-action-bar">
        <div className="sales-selection">
          {chosen.length > 0 && (
            <button onClick={() => setSelected([])} disabled={busy}>
              Limpiar selección
            </button>
          )}
        </div>
        <div
          className={`sales-actions ${chosen.length ? "has-selection" : ""}`}
        >
          <Button
            variant="primary"
            className="sales-register"
            disabled={busy}
            onClick={() => setModal("new")}
          >
            <SalesIcon name="add" />
            Registrar venta
          </Button>
          <div className="sales-secondary-actions">
            <Button
              title={
                one && !canEdit
                  ? "El pedido conserva historial de cambios"
                  : undefined
              }
              disabled={!canEdit || blocked}
              onClick={() => setModal("edit")}
            >
              <SalesIcon name="edit" />
              Editar venta
            </Button>
            <Button
              disabled={!canExchange || blocked}
              onClick={() => setModal("exchange")}
            >
              <SalesIcon name="exchange" />
              Cambio de vestido
            </Button>
            <Button
              disabled={!chosen.length || blocked}
              onClick={() => void print()}
            >
              <SalesIcon name="print" />
              {busy && !modal ? "Generando PDF…" : "Imprimir ventas"}
            </Button>
            <Button
              className="sales-cancel-action"
              disabled={!chosen.length || blocked}
              onClick={() => {
                setActionError("");
                setModal("cancel");
              }}
            >
              <SalesIcon name="cancel" />
              Cancelar venta
            </Button>
          </div>
        </div>
      </div>
      {actionError && modal !== "cancel" && (
        <p className="error" role="alert">
          {actionError}
        </p>
      )}
      {(modal === "new" || (modal === "edit" && one)) && (
        <SaleForm
          sale={modal === "new" ? undefined : one}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
      {modal === "exchange" && one && (
        <ExchangeForm
          sale={one}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
      {modal === "cancel" && (
        <Modal
          title="Cancelar venta"
          busy={busy}
          onClose={() => setModal(null)}
        >
          <p>
            ¿Cancelar {chosen.length} pedido(s)? Se revertirán sus movimientos
            de stock. Para cancelar una compra con cambios, primero deben
            cancelarse sus cambios vinculados.
          </p>
          {actionError && (
            <p role="alert" className="error mt-3">
              {actionError}
            </p>
          )}
          <footer className="mt-6 flex justify-end gap-3">
            <Button disabled={busy} onClick={() => setModal(null)}>
              Volver
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => void cancel()}
            >
              {busy ? "Cancelando…" : "Confirmar cancelación"}
            </Button>
          </footer>
        </Modal>
      )}
      {result && (
        <ActionResultModal result={result} onClose={() => setResult(null)} />
      )}
    </div>
  );
}
