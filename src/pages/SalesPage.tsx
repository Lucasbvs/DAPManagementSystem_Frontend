import { CheckCheck, Search, X } from "lucide-react";
import { DeliveryForm } from "../components/forms/DeliveryForm";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import { CollapsibleSummary } from "../components/ui/CollapsibleSummary";
import { DataTable } from "../components/ui/DataTable";
import { OwnerFilter } from "../components/ui/OwnerFilter";
import { useScrollSummary } from "../hooks/useScrollSummary";
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
  matchesCustomerPhone,
  saleStatus,
  shippingCostLabel,
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
    <span
      className="whatsapp-link disabled"
      role="link"
      aria-disabled="true"
      aria-label={`WhatsApp ${orderNumber(sale)} (venta cancelada)`}
      title="No disponible para ventas canceladas"
    >
      <SalesIcon name="whatsapp" />
    </span>
  ) : (
    <a
      className="whatsapp-link"
      href={whatsappUrl(sale)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      aria-label={`WhatsApp ${orderNumber(sale)}`}
      title={`WhatsApp ${orderNumber(sale)}`}
    >
      <SalesIcon name="whatsapp" />
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
          {d.talla ? ` / ${d.talla}` : ""} ×
          {d.cantidad - (d.cantidad_cancelada ?? 0)}
          {d.cantidad_cancelada > 0 && ` · ${d.cantidad_cancelada} canceladas`}
        </span>
      ))}
    </span>
  );
}
export function SalesPage() {
  const [date, setDate] = useState(today),
    [owner, setOwner] = useState(""),
    [phoneQuery, setPhoneQuery] = useState(""),
    [owners, setOwners] = useState<Owner[]>([]);
  const [sales, setSales] = useState<Sale[]>([]),
    [selected, setSelected] = useState<number[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [modal, setModal] = useState<
      "new" | "edit" | "cancel" | "exchange" | "delivery" | null
    >(null),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(""),
    [result, setResult] = useState<ActionResult | null>(null);
  const { summaryHidden, resetSummary, scrollRef, onScroll } =
    useScrollSummary();
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
            rows.some((s) => s.id_venta === id && s.estado !== "Cancelada"),
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
    resetSummary();
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
  }, [reload, resetSummary]);
  const visibleSales = sales.filter((sale) =>
    matchesCustomerPhone(sale, phoneQuery),
  );
  const active = sales.filter((s) => s.estado !== "Cancelada"),
    visibleActive = visibleSales.filter((s) => s.estado !== "Cancelada"),
    chosen = visibleActive.filter((s) => selected.includes(s.id_venta)),
    one = chosen.length === 1 ? chosen[0] : undefined;
  const canEdit =
      !!one &&
      one.estado === "Pendiente" &&
      one.tipo !== "Cambio" &&
      !one.cambios.length,
    canExchange =
      !!one &&
      one.estado === "Realizada" &&
      one.detalles.some((d) => availableReturn(d) > 0);
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
    setPhoneQuery("");
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
      <CollapsibleSummary
        className="sales-mobile-overview md:hidden"
        hidden={summaryHidden}
      >
        <header className="sales-mobile-title">
          <h1>Ventas</h1>
          <label>
            <span className="sr-only">Fecha de ventas</span>
            <input
              type="date"
              required
              value={date}
              onChange={(event) => {
                if (event.target.value) {
                  setDate(event.target.value);
                  setActionError("");
                }
              }}
            />
          </label>
        </header>
        <section
          className="panel sales-mobile-summary"
          aria-label="Resumen de ventas de la fecha seleccionada"
        >
          <div className="sales-mobile-net">
            <span>
              {owner ? "Venta neta filtrada del día" : "Venta neta del día"}
            </span>
            <strong>{loading ? "…" : money(decimal(sum("monto_neto")))}</strong>
          </div>
          <dl>
            <div>
              <dt>Cobrado</dt>
              <dd>{loading ? "…" : money(decimal(sum("total_cobrado")))}</dd>
            </div>
            <div>
              <dt>Adicional de delivery</dt>
              <dd>
                {loading ? "…" : money(decimal(sum("adicional_delivery")))}
              </dd>
            </div>
            <div>
              <dt>Delivery descontado</dt>
              <dd>
                {loading ? "…" : `− ${money(decimal(sum("costo_delivery")))}`}
              </dd>
            </div>
            {sum("costo_envio") > 0 && (
              <div>
                <dt>Envíos</dt>
                <dd>{money(decimal(sum("costo_envio")))}</dd>
              </div>
            )}
          </dl>
        </section>
      </CollapsibleSummary>
      <section
        className="panel sales-stat sales-desktop-stat"
        aria-label="Resumen de ventas"
      >
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
          <div className="sales-filters">
            <label className="sales-phone-search">
              <span className="sr-only">
                Buscar por celular en las ventas del día seleccionado
              </span>
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                inputMode="tel"
                placeholder="Buscar por celular"
                maxLength={40}
                value={phoneQuery}
                disabled={busy}
                onChange={(event) => {
                  setPhoneQuery(event.target.value);
                  setSelected([]);
                  setActionError("");
                  resetSummary();
                }}
              />
            </label>
            <OwnerFilter
              owners={owners}
              label="Filtrar ventas por dueño"
              value={owner}
              onChange={(value) => {
                setOwner(value);
                setActionError("");
              }}
            />
            <label className="sales-desktop-date">
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
            <div className="sales-mobile-select md:hidden">
              <Button
                className="sales-select-all"
                disabled={blocked || !visibleActive.length}
                aria-pressed={
                  visibleActive.length > 0 &&
                  visibleActive.every((sale) =>
                    selected.includes(sale.id_venta),
                  )
                }
                onClick={() =>
                  setSelected(
                    visibleActive.every((sale) =>
                      selected.includes(sale.id_venta),
                    )
                      ? []
                      : visibleActive.map((sale) => sale.id_venta),
                  )
                }
              >
                <CheckCheck size={16} aria-hidden="true" />
                {visibleActive.length > 0 &&
                visibleActive.every((sale) => selected.includes(sale.id_venta))
                  ? "Deseleccionar todas"
                  : "Seleccionar todas"}
              </Button>
            </div>
          </div>
        </div>
        <div
          className="sales-status-legend"
          aria-label="Colores de los estados de venta"
        >
          <span className="sale-delivered">
            <i aria-hidden="true" />
            Entregadas
          </span>
          <span className="sale-pending">
            <i aria-hidden="true" />
            Pendientes
          </span>
          <span className="sale-cancelled">
            <i aria-hidden="true" />
            Canceladas
          </span>
        </div>
        <div
          ref={scrollRef}
          className="sales-scroll"
          onScroll={onScroll}
          tabIndex={0}
          aria-label="Ventas de la fecha seleccionada"
        >
          {loading ? (
            <p role="status" className="p-8 text-center">
              Cargando ventas…
            </p>
          ) : (
            <>
              <DataTable className="sales-table">
                <colgroup>
                  {[4, 7, 10, 11, null, 6, 8, 10, 8, 8].map((w, i) => (
                    <col
                      key={i}
                      style={w === null ? undefined : { width: `${w}%` }}
                    />
                  ))}
                  <col className="sales-whatsapp-column" />
                </colgroup>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label="Seleccionar todas las ventas visibles"
                        disabled={!visibleActive.length}
                        checked={
                          !!visibleActive.length &&
                          visibleActive.every((s) =>
                            selected.includes(s.id_venta),
                          )
                        }
                        onChange={() =>
                          setSelected(
                            visibleActive.every((s) =>
                              selected.includes(s.id_venta),
                            )
                              ? []
                              : visibleActive.map((s) => s.id_venta),
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
                      "Total / diferencia",
                      "Delivery +",
                      "Costo de envío",
                      "Neto",
                      "WhatsApp",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleSales.map((s) => (
                    <tr
                      key={s.id_venta}
                      className={`${saleStatus[s.estado].className} ${selected.includes(s.id_venta) ? "sale-picked" : ""}`}
                      title={saleStatus[s.estado].label}
                      onClick={() => {
                        if (s.estado !== "Cancelada") toggle(s.id_venta);
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
                        <span className="sr-only">
                          {" "}
                          · {saleStatus[s.estado].label}
                        </span>
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
                      <td>
                        {s.tipo === "Cambio" && !s.reemplazo_completo
                          ? differenceLabel(s.total_cobrado)
                          : money(s.total_cobrado)}
                      </td>
                      <td>{money(s.adicional_delivery)}</td>
                      <td>{shippingCostLabel(s)}</td>
                      <td>{money(s.monto_neto)}</td>
                      <td>
                        <WhatsApp sale={s} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
              <div className="sales-mobile-cards">
                {visibleSales.map((s) => (
                  <article
                    key={s.id_venta}
                    className={`mobile-card sale-mobile-card ${saleStatus[s.estado].className} ${selected.includes(s.id_venta) ? "sale-picked" : ""}`}
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
                        <span className="sale-status">
                          {saleStatus[s.estado].label}
                        </span>
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
                      {s.departamento_destino && s.costo_envio !== null && (
                        <span className="sale-card-shipping">
                          Costo de envío: {shippingCostLabel(s)}
                        </span>
                      )}
                    </button>
                    <footer className="sale-card-footer">
                      <div>
                        <span className="text-xs text-muted">
                          {s.tipo === "Cambio" && !s.reemplazo_completo
                            ? "Diferencia"
                            : "Total del pedido"}
                        </span>
                        <strong>
                          {s.tipo === "Cambio" && !s.reemplazo_completo
                            ? differenceLabel(s.total_cobrado)
                            : money(s.total_cobrado)}
                        </strong>
                      </div>
                      <WhatsApp sale={s} />
                    </footer>
                  </article>
                ))}
              </div>
              {!visibleSales.length && (
                <p className="p-10 text-center text-muted">
                  {phoneQuery.trim()
                    ? "No hay ventas con ese celular para la fecha y los filtros seleccionados."
                    : "No hay ventas para los filtros elegidos."}
                </p>
              )}
            </>
          )}
        </div>
      </section>
      <div className="sales-action-bar">
        {chosen.length > 0 && (
          <div className="sales-selection">
            <span role="status">
              {chosen.length}{" "}
              {chosen.length === 1
                ? "venta seleccionada"
                : "ventas seleccionadas"}
            </span>
            <button
              type="button"
              onClick={() => setSelected([])}
              disabled={busy}
            >
              <X size={16} aria-hidden="true" />
              Limpiar selección
            </button>
          </div>
        )}
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
            {chosen.some((sale) => sale.estado === "Pendiente") && (
              <Button
                disabled={
                  blocked || chosen.some((sale) => sale.estado !== "Pendiente")
                }
                title="Selecciona únicamente ventas pendientes"
                onClick={() => setModal("delivery")}
              >
                <CheckCheck aria-hidden="true" /> Confirmar entrega
              </Button>
            )}
            {canEdit && (
              <Button disabled={blocked} onClick={() => setModal("edit")}>
                <SalesIcon name="edit" />
                Editar venta
              </Button>
            )}
            {one?.estado === "Realizada" && (
              <Button
                disabled={!canExchange || blocked}
                onClick={() => setModal("exchange")}
              >
                <SalesIcon name="exchange" />
                Cambio de vestido
              </Button>
            )}
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
      {modal === "delivery" && chosen.length > 0 && (
        <DeliveryForm
          sales={chosen}
          onClose={() => setModal(null)}
          onSaved={(rows) => {
            setModal(null);
            setSelected([]);
            setResult({
              title: "Entregas registradas",
              message: `${rows.filter((row) => row.estado === "Realizada").length} ventas realizadas y ${rows.filter((row) => row.estado === "Cancelada").length} canceladas.`,
            });
            void reload();
          }}
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
