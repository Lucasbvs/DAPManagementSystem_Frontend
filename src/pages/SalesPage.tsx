import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import {
  ActionResultModal,
  type ActionResult,
} from "../components/ui/ActionResultModal";
import { subscribeInventory } from "../services/inventoryLive";
import { errorMessage } from "../services/api";
import { SaleForm } from "../components/forms/SaleForm";
import { salesApi } from "../services/sales.api";
import {
  cents,
  decimal,
  money,
  orderNumber,
  today,
  type Sale,
} from "../types/sales";
export function SalesPage() {
  const [date, setDate] = useState(today),
    [sales, setSales] = useState<Sale[]>([]),
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
      const rows = await salesApi.list(date);
      if (alive.current && revision.current === request) {
        setSales(rows);
        setSelected((ids) =>
          ids.filter((id) => rows.some((s) => s.id_venta === id)),
        );
        setError("");
      }
    } catch (e) {
      if (alive.current && revision.current === request)
        setError(errorMessage(e));
    } finally {
      if (alive.current && revision.current === request) setLoading(false);
    }
  }, [date]);
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
    chosen = sales.filter((s) => selected.includes(s.id_venta)),
    one =
      chosen.length === 1 && chosen[0].estado === "Realizada"
        ? chosen[0]
        : undefined;
  const printable =
    chosen.length > 0 && chosen.every((s) => s.estado === "Realizada");
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
    for (const sale of chosen) {
      try {
        await salesApi.cancel(sale);
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
          "Se devolvieron las prendas al inventario y se actualizaron los totales.",
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
  return (
    <div className="sales-page">
      <section className="panel sales-stat" aria-label="Resumen de ventas">
        <p>TOTAL DE VENTAS DEL DÍA</p>
        <strong>{loading ? "…" : money(decimal(sum("monto_neto")))}</strong>
        <small>
          {money(decimal(sum("total_cobrado")))} cobrados −{" "}
          {money(decimal(sum("adicional_delivery")))} de adicionales
          {sum("costo_envio") > 0
            ? ` − ${money(decimal(sum("costo_envio")))} de envíos`
            : ""}{" "}
          − {money(decimal(sum("costo_delivery")))} de delivery ({active.length}{" "}
          pedidos × Bs 10)
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
                  {[32, 80, 134, 240, 76, 110, 110, 110, 130].map((w, i) => (
                    <col key={i} style={{ width: w }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label="Seleccionar todas las ventas"
                        disabled={!sales.length}
                        checked={
                          !!sales.length &&
                          sales.every((s) => selected.includes(s.id_venta))
                        }
                        onChange={() =>
                          setSelected(
                            sales.every((s) => selected.includes(s.id_venta))
                              ? []
                              : sales.map((s) => s.id_venta),
                          )
                        }
                      />
                    </th>
                    {[
                      "Venta",
                      "Celular cliente",
                      "Vestidos / unidades",
                      "Prendas",
                      "Delivery +",
                      "Total",
                      "Neto",
                      "Estado",
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
                      onClick={() => toggle(s.id_venta)}
                    >
                      <td>
                        <input
                          aria-label={`Seleccionar ${orderNumber(s)}`}
                          type="checkbox"
                          checked={selected.includes(s.id_venta)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggle(s.id_venta)}
                        />
                      </td>
                      <th scope="row">{orderNumber(s)}</th>
                      <td>{s.cliente_celular ?? s.cliente.celular}</td>
                      <td>
                        {s.detalles
                          .map(
                            (d) =>
                              `${d.nombre_vestido ?? d.variante.vestido.nombre} (${d.color ?? d.variante.color}${d.talla ? ` / ${d.talla}` : ""}) ×${d.cantidad}`,
                          )
                          .join(" · ")}
                      </td>
                      <td>{s.total_prendas}</td>
                      <td>{money(s.adicional_delivery)}</td>
                      <td>{money(s.total_cobrado)}</td>
                      <td>{money(s.monto_neto)}</td>
                      <td>{s.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="sales-mobile-cards">
                {sales.map((s) => (
                  <button
                    key={s.id_venta}
                    className={`mobile-card ${selected.includes(s.id_venta) ? "selected" : ""}`}
                    aria-pressed={selected.includes(s.id_venta)}
                    onClick={() => toggle(s.id_venta)}
                  >
                    <span className="flex justify-between gap-3">
                      <strong>
                        {orderNumber(s)} ·{" "}
                        {s.cliente_celular ?? s.cliente.celular}
                      </strong>
                      <span>{s.estado}</span>
                    </span>
                    <span className="my-3 block text-sm">
                      {s.detalles
                        .map(
                          (d) =>
                            `${d.nombre_vestido ?? d.variante.vestido.nombre} · ${d.color ?? d.variante.color} ×${d.cantidad}`,
                        )
                        .join(" / ")}
                    </span>
                    <span className="flex justify-between gap-2 text-sm">
                      <span>
                        {s.total_prendas} prendas
                        <br />
                        Delivery + {money(s.adicional_delivery)}
                      </span>
                      <span>
                        Total <strong>{money(s.total_cobrado)}</strong>
                        <br />
                        Neto {money(s.monto_neto)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              {!sales.length && (
                <p className="p-10 text-center text-muted">
                  No hay ventas registradas en esta fecha.
                </p>
              )}
            </>
          )}
        </div>
      </section>
      <div className="sales-actions">
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => setModal("new")}
        >
          Registrar venta
        </Button>
        <Button
          disabled={!one || busy || loading || !!error}
          onClick={() => setModal("edit")}
        >
          Editar venta
        </Button>
        <Button
          disabled={!printable || busy || loading || !!error}
          onClick={() => {
            setActionError("");
            setModal("cancel");
          }}
        >
          Cancelar venta
        </Button>
        <Button
          disabled={!one || busy || loading || !!error}
          onClick={() => setModal("exchange")}
        >
          Cambio de vestido
        </Button>
        <Button
          disabled={!printable || busy || loading || !!error}
          onClick={() => void print()}
        >
          {busy && !modal ? "Generando PDF…" : "Imprimir ventas"}
        </Button>
      </div>
      
      {actionError && modal !== "cancel" && (
        <p className="error" role="alert">
          {actionError}
        </p>
      )}
      {(modal === "new" ||
        ((modal === "edit" || modal === "exchange") && one)) && (
        <SaleForm
          sale={modal === "new" ? undefined : one}
          exchange={modal === "exchange"}
          onClose={() => setModal(null)}
          onSaved={(s) => {
            setModal(null);
            setResult({
              title: modal === "new" ? "Venta registrada" : "Venta actualizada",
              message: `Pedido ${orderNumber(s)} guardado correctamente.`,
            });
            if (date !== today() && modal === "new") setDate(today());
            else void reload();
          }}
        />
      )}
      {modal === "cancel" && (
        <Modal
          title="Cancelar venta"
          busy={busy}
          onClose={() => setModal(null)}
        >
          <p>
            ¿Cancelar {chosen.length} venta(s) seleccionada(s)? Se devolverá el
            stock de cada prenda. El pedido conservará su número y su historial.
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
