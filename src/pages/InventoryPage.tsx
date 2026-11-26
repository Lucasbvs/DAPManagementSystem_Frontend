import { Pencil, Trash2, Plus, Check, CheckCheck, Search } from "lucide-react";
import { useState } from "react";
import { useInventory } from "../hooks/useInventory";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
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
import { DressForm } from "../components/forms/DressForm";
import { inventoryApi } from "../services/inventory.api";
import { errorMessage } from "../services/api";
import { LOW_STOCK_LIMIT, stockByColor } from "../services/inventoryRules";
import type { Dress } from "../types/inventory";
function Colors({
  dress,
  className = "",
}: {
  dress: Dress;
  className?: string;
}) {
  return (
    <span className={`inventory-colors ${className}`}>
      {stockByColor(dress.variantes).map(({ color, quantity }) => (
        <span
          key={color}
          className={
            quantity <= LOW_STOCK_LIMIT ? "color-stock-low" : "color-stock"
          }
        >
          {color} · {quantity}
          {quantity <= LOW_STOCK_LIMIT && (
            <span> · {quantity === 0 ? "Agotado" : "Stock bajo"}</span>
          )}
        </span>
      ))}
    </span>
  );
}
const money = (v: string | null) =>
  v === null
    ? "Sin descuento"
    : new Intl.NumberFormat("es-BO", {
        style: "currency",
        currency: "BOB",
      }).format(Number(v));
export function InventoryPage() {
  const { dresses, owners, loading, error, reload } = useInventory();
  const { summaryHidden, resetSummary, scrollRef, onScroll } =
    useScrollSummary();
  const [ownerFilter, setOwnerFilter] = useState("");
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState<number[]>([]),
    [modal, setModal] = useState<"new" | "edit" | "delete" | null>(null);
  const [busy, setBusy] = useState(false),
    [deleteError, setDeleteError] = useState(""),
    [result, setResult] = useState<ActionResult | null>(null);
  const search = useDebouncedValue(query).trim().toLocaleLowerCase();
  const ownerDresses = dresses.filter(
    (d) => !ownerFilter || d.id_propietario === Number(ownerFilter),
  );
  const filtered = ownerDresses.filter((d) =>
    `${d.nombre} ${d.descripcion} ${d.ubicacion_almacen ?? ""}`
      .toLocaleLowerCase()
      .includes(search),
  );
  const selectedDresses = filtered.filter((d) =>
    selected.includes(d.id_vestido),
  );
  const allSelected =
    filtered.length > 0 && selectedDresses.length === filtered.length;
  function toggleAll() {
    setSelected(allSelected ? [] : filtered.map((d) => d.id_vestido));
  }
  const dress = selectedDresses.length === 1 ? selectedDresses[0] : undefined;
  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }
  const low = ownerDresses.filter((d) => d.stock_total <= LOW_STOCK_LIMIT);
  async function remove() {
    if (busy || !selectedDresses.length) return;
    setBusy(true);
    setDeleteError("");
    const removed: number[] = [],
      failures: string[] = [];
    for (const item of selectedDresses) {
      try {
        await inventoryApi.remove(item.id_vestido);
        removed.push(item.id_vestido);
      } catch (e) {
        failures.push(`${item.nombre}: ${errorMessage(e)}`);
      }
    }
    setSelected((current) => current.filter((id) => !removed.includes(id)));
    if (failures.length) {
      setDeleteError(
        `${removed.length ? `${removed.length} vestido(s) eliminado(s). ` : ""}No se pudieron eliminar: ${failures.join(" · ")}`,
      );
    } else {
      setModal(null);
      setResult({
        title:
          removed.length === 1 ? "Vestido eliminado" : "Vestidos eliminados",
        message:
          removed.length === 1
            ? "El vestido se retiró del inventario. Su historial de ventas se conserva."
            : `Los ${removed.length} vestidos se retiraron del inventario. Su historial de ventas se conserva.`,
      });
    }
    await reload();
    setBusy(false);
  }
  return (
    <div className="inventory-page" aria-label="Inventario">
      <CollapsibleSummary
        className="inventory-mobile-heading md:hidden"
        hidden={summaryHidden}
      >
        <h1>Inventario</h1>
        <div className="inventory-mobile-totals">
          <p>
            {loading
              ? "Cargando…"
              : `${ownerDresses.length} modelos · ${ownerDresses.reduce((total, item) => total + item.stock_total, 0)} prendas`}
          </p>
          <span
            className="inventory-mobile-low"
            title="Modelos con 2 unidades o menos"
          >
            Stock bajo: {loading ? "…" : low.length}
          </span>
        </div>
      </CollapsibleSummary>
      <section aria-label="Resumen del inventario" className="inventory-stats">
        {[
          {
            label: "MODELOS REGISTRADOS",
            short: "Modelos",
            value: ownerDresses.length,
            detail: "Modelos de vestidos en catálogo",
          },
          {
            label: "VESTIDOS DISPONIBLES",
            short: "Disponibles",
            value: ownerDresses.reduce((n, d) => n + d.stock_total, 0),
            detail: "Unidades listas para vender",
          },
          {
            label: "STOCK BAJO",
            short: "Stock bajo",
            value: low.length,
            detail: "2 unidades o menos por modelo",
            suffix: low.length === 1 ? "modelo" : "modelos",
          },
        ].map(({ label, short, value, detail, suffix }) => (
          <article
            key={label}
            className="panel inventory-stat"
            aria-label={`${label}: ${value}`}
          >
            <p className="text-[13px] text-muted">
              <span className="hidden md:inline">{label}</span>
              <span className="md:hidden">{short}</span>
            </p>
            <p className="stat-value my-1 text-[28px] font-bold">
              {loading ? "…" : value}
              {suffix && <span className="hidden md:inline"> {suffix}</span>}
            </p>
            <p className="text-[11px] text-primary">{detail}</p>
          </article>
        ))}
      </section>

      {error && (
        <div role="alert" className="error">
          {error} <Button onClick={() => void reload()}>Reintentar</Button>
        </div>
      )}
      <section className="inventory-list" aria-label="Lista de vestidos">
        <div className="inventory-filters">
          <label className="inventory-search block">
            <span className="sr-only">
              Buscar por nombre, descripción o ubicación
            </span>
            <Search
              className="inventory-search-icon md:hidden"
              size={20}
              aria-hidden="true"
            />
            <input
              type="search"
              className="search-input"
              placeholder="Buscar vestido"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected([]);
                resetSummary();
              }}
            />
          </label>
          <OwnerFilter
            className="inventory-owner-filter"
            owners={owners}
            label="Filtrar por dueño de la prenda"
            value={ownerFilter}
            onChange={(value) => {
              setOwnerFilter(value);
              setSelected([]);
              resetSummary();
            }}
          />
        </div>
        <div className="inventory-selection-bar">
          <Button
            className="inventory-select-all"
            disabled={loading || !!error || busy || !filtered.length}
            aria-pressed={allSelected}
            onClick={toggleAll}
          >
            <CheckCheck size={18} aria-hidden="true" />
            {allSelected ? "Deseleccionar todos" : "Seleccionar todos"}
          </Button>
          <span role="status">
            {selectedDresses.length} de {filtered.length} seleccionados
          </span>
        </div>
        <div
          className="inventory-scroll"
          ref={scrollRef}
          onScroll={onScroll}
          tabIndex={0}
          aria-label="Vestidos disponibles"
        >
          {loading ? (
            <p role="status" className="py-10 text-center">
              Cargando inventario…
            </p>
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable className="inventory-table">
                  <colgroup>
                    {[4, 5, 12, 18, 8, 13, 7, 9, 8, 8, 8].map(
                      (width, index) => (
                        <col key={index} style={{ width: `${width}%` }} />
                      ),
                    )}
                  </colgroup>
                  <thead>
                    <tr>
                      {[
                        "",
                        "Nro.",
                        "Nombre",
                        "Descripción",
                        "Ubicación",
                        "Colores",
                        "Cantidad",
                        "p unitario",
                        "p cuarta",
                        "p media",
                        "Dueño de la prenda",
                      ].map((h, i) => (
                        <th key={i} scope="col">
                          {h || (
                            <input
                              type="checkbox"
                              aria-label="Seleccionar todos los vestidos visibles"
                              checked={allSelected}
                              ref={(element) => {
                                if (element)
                                  element.indeterminate =
                                    selectedDresses.length > 0 && !allSelected;
                              }}
                              disabled={
                                loading || !!error || busy || !filtered.length
                              }
                              onChange={toggleAll}
                            />
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d) => (
                      <tr
                        key={d.id_vestido}
                        className={`${selected.includes(d.id_vestido) ? "selected" : ""} ${d.stock_total <= LOW_STOCK_LIMIT || stockByColor(d.variantes).some((c) => c.quantity <= LOW_STOCK_LIMIT) ? "inventory-stock-low" : ""}`}
                        onClick={() => toggle(d.id_vestido)}
                      >
                        <td>
                          <input
                            aria-label={`Seleccionar ${d.nombre}`}
                            type="checkbox"
                            onClick={(e) => e.stopPropagation()}
                            checked={selected.includes(d.id_vestido)}
                            onChange={() => toggle(d.id_vestido)}
                          />
                        </td>
                        <td>{String(d.numero_vestido).padStart(2, "0")}</td>
                        <th scope="row">
                          {d.nombre}
                          {d.stock_total <= LOW_STOCK_LIMIT && (
                            <span className="model-stock-warning">
                              {d.stock_total === 0 ? "Agotado" : "Stock bajo"}
                            </span>
                          )}
                        </th>
                        <td>{d.descripcion}</td>
                        <td>
                          <span className="warehouse-location">
                            {d.ubicacion_almacen ?? "Sin asignar"}
                          </span>
                        </td>
                        <td>
                          <Colors dress={d} />
                        </td>
                        <td>{d.stock_total}</td>
                        <td>{money(d.precio_unitario)}</td>
                        <td>{money(d.precio_cuarta)}</td>
                        <td>{money(d.precio_media_docena)}</td>
                        <td>{d.propietario.nombre}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </div>
              <div className="inventory-mobile-cards md:hidden">
                {filtered.map((d) => (
                  <button
                    type="button"
                    key={d.id_vestido}
                    aria-pressed={selected.includes(d.id_vestido)}
                    onClick={() => toggle(d.id_vestido)}
                    className={`mobile-card inventory-dress-card ${selected.includes(d.id_vestido) ? "selected" : ""} ${d.stock_total <= LOW_STOCK_LIMIT ? "inventory-stock-low" : ""}`}
                  >
                    <span className="inventory-dress-heading">
                      <strong>{d.nombre}</strong>
                      <span className="inventory-selection" aria-hidden="true">
                        {selected.includes(d.id_vestido) && <Check size={20} />}
                      </span>
                    </span>
                    <span className="inventory-dress-description">
                      {d.descripcion}
                    </span>
                    <span className="inventory-dress-stock">
                      {d.stock_total} disponibles
                      {d.stock_total <= LOW_STOCK_LIMIT && (
                        <span className="inventory-stock-note">
                          {" "}
                          · {d.stock_total === 0 ? "Agotado" : "Stock bajo"}
                        </span>
                      )}
                    </span>
                    <Colors dress={d} className="inventory-dress-colors" />
                    <span className="inventory-dress-details">
                      <span>
                        Ubicación:{" "}
                        <strong>{d.ubicacion_almacen ?? "Sin asignar"}</strong>
                      </span>
                      <span>
                        Dueño: <strong>{d.propietario.nombre}</strong>
                      </span>
                    </span>
                    <span className="inventory-dress-prices">
                      {[
                        ["Unitario", d.precio_unitario],
                        ["Cuarta", d.precio_cuarta],
                        ["6 o más", d.precio_media_docena],
                      ].map(([label, price]) => (
                        <span key={label}>
                          <span>{label}</span>
                          <strong>{money(price)}</strong>
                        </span>
                      ))}
                    </span>
                  </button>
                ))}
              </div>
              {!filtered.length && (
                <p className="py-10 text-center text-muted">
                  {query || ownerFilter
                    ? "No se encontraron vestidos para los filtros elegidos."
                    : "Aún no hay vestidos. Registra el primero."}
                </p>
              )}
            </>
          )}
        </div>
      </section>
      <div className="inventory-actions flex gap-3">
        <Button
          variant="primary"
          disabled={loading || !!error || !owners.length}
          onClick={() => setModal("new")}
        >
          <Plus aria-hidden="true" /> Vestido
        </Button>
        <Button
          className="inventory-edit"
          title={
            selectedDresses.length > 1
              ? "Selecciona un solo vestido para editar"
              : undefined
          }
          disabled={loading || !!error || !dress}
          onClick={() => setModal("edit")}
        >
          <Pencil aria-hidden="true" />
          Editar
        </Button>
        <Button
          className="inventory-delete"
          disabled={loading || !!error || !selectedDresses.length}
          onClick={() => {
            setDeleteError("");
            setModal("delete");
          }}
        >
          <Trash2 aria-hidden="true" />
          Eliminar
        </Button>
      </div>
      {!loading && !error && !owners.length && (
        <p role="status">
          Ejecuta el seed del backend para registrar a Ana y Dylan.
        </p>
      )}
      {(modal === "new" || (modal === "edit" && dress)) && (
        <DressForm
          dress={modal === "edit" ? dress : undefined}
          owners={owners}
          onClose={() => setModal(null)}
          onSaved={(reactivated) => {
            const edited = modal === "edit";
            setModal(null);
            setSelected([]);
            setResult({
              title: edited
                ? "Vestido editado"
                : reactivated
                  ? "Vestido reactivado"
                  : "Vestido creado",
              message: edited
                ? "Los cambios del vestido se guardaron correctamente."
                : reactivated
                  ? "El vestido volvió al inventario con los nuevos datos y existencias."
                  : "El vestido se registró correctamente.",
            });
            void reload();
          }}
        />
      )}
      {modal === "delete" && selectedDresses.length > 0 && (
        <Modal
          title={
            selectedDresses.length === 1
              ? "Eliminar vestido"
              : "Eliminar vestidos"
          }
          onClose={() => setModal(null)}
          busy={busy}
        >
          <p>
            ¿Eliminar{" "}
            <strong>
              {selectedDresses.length === 1
                ? selectedDresses[0].nombre
                : `${selectedDresses.length} vestidos seleccionados`}
            </strong>{" "}
            del inventario?
          </p>
          <p className="my-3 text-sm text-muted">
            Los vestidos con ventas se archivarán para conservar su historial.
            Al registrar otro vestido con el mismo nombre, se reactivarán con
            los nuevos datos. Los vestidos sin ventas se eliminarán
            definitivamente.
          </p>
          {deleteError && (
            <p role="alert" className="error">
              {deleteError}
            </p>
          )}
          <footer className="mt-6 flex justify-end gap-3">
            <Button disabled={busy} onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? "Eliminando…" : "Confirmar eliminación"}
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
