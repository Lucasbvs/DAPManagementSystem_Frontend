import { useState } from "react";
import { useInventory } from "../hooks/useInventory";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import {
  ActionResultModal,
  type ActionResult,
} from "../../../components/ui/ActionResultModal";
import { DressForm } from "../components/DressForm";
import { inventoryApi } from "../services/inventory.api";
import { errorMessage } from "../../../services/api";
const money = (v: string | null) =>
  v === null
    ? "Sin descuento"
    : new Intl.NumberFormat("es-BO", {
        style: "currency",
        currency: "BOB",
      }).format(Number(v));
export function InventoryPage() {
  const { dresses, owners, loading, error, reload } = useInventory();
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState<number[]>([]),
    [modal, setModal] = useState<"new" | "edit" | "delete" | null>(null);
  const [busy, setBusy] = useState(false),
    [deleteError, setDeleteError] = useState(""),
    [result, setResult] = useState<ActionResult | null>(null);
  const search = useDebouncedValue(query).trim().toLocaleLowerCase();
  const filtered = dresses.filter((d) =>
    `${d.nombre} ${d.descripcion}`.toLocaleLowerCase().includes(search),
  );
  const selectedDresses = dresses.filter((d) =>
    selected.includes(d.id_vestido),
  );
  const dress = selectedDresses.length === 1 ? selectedDresses[0] : undefined;
  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }
  const low = dresses.filter((d) => d.stock_total < 5);
  async function remove() {
    if (!selectedDresses.length) return;
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
            ? "El vestido se eliminó correctamente."
            : `Los ${removed.length} vestidos se eliminaron correctamente.`,
      });
    }
    await reload();
    setBusy(false);
  }
  return (
    <div className="inventory-page" aria-label="Inventario">
      <section aria-label="Resumen del inventario" className="inventory-stats">
        {[
          {
            label: "MODELOS REGISTRADOS",
            short: "Modelos",
            value: dresses.length,
            detail: "Modelos de vestidos en catálogo",
          },
          {
            label: "VESTIDOS DISPONIBLES",
            short: "Disponibles",
            value: dresses.reduce((n, d) => n + d.stock_total, 0),
            detail: "Unidades listas para vender",
          },
          {
            label: "STOCK BAJO",
            short: "Stock bajo",
            value: low.length,
            detail: "Menos de 5 unidades",
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
        <label className="inventory-search block">
          <span className="sr-only">Buscar por nombre o descripción</span>
          <input
            type="search"
            className="search-input"
            placeholder="Buscar por nombre o descripción"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected([]);
            }}
          />
        </label>
        <div
          className="inventory-scroll"
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
                <table className="inventory-table">
                  <colgroup>
                    {[4, 5, 12, 23, 12, 8, 9, 9, 9, 9].map((width, index) => (
                      <col key={index} style={{ width: `${width}%` }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      {[
                        "",
                        "Nro.",
                        "Nombre",
                        "Descripción",
                        "Colores",
                        "Cantidad",
                        "p unitario",
                        "p cuarta",
                        "p media",
                        "Dueño de la prenda",
                      ].map((h, i) => (
                        <th key={i} scope="col">
                          {h || <span className="sr-only">Seleccionar</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d) => (
                      <tr
                        key={d.id_vestido}
                        className={
                          selected.includes(d.id_vestido) ? "selected" : ""
                        }
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
                        <th scope="row">{d.nombre}</th>
                        <td>{d.descripcion}</td>
                        <td>
                          {[...new Set(d.variantes.map((v) => v.color))].join(
                            " · ",
                          )}
                        </td>
                        <td>{d.stock_total}</td>
                        <td>{money(d.precio_unitario)}</td>
                        <td>{money(d.precio_cuarta)}</td>
                        <td>{money(d.precio_media_docena)}</td>
                        <td>{d.propietario.nombre}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 md:hidden">
                {filtered.map((d) => (
                  <button
                    key={d.id_vestido}
                    aria-pressed={selected.includes(d.id_vestido)}
                    onClick={() => toggle(d.id_vestido)}
                    className={`mobile-card ${selected.includes(d.id_vestido) ? "selected" : ""}`}
                  >
                    <span className="card-heading flex justify-between gap-3">
                      <strong>
                        {d.numero_vestido}. {d.nombre}
                      </strong>
                      <span className="stock-badge">{d.stock_total} disp.</span>
                    </span>
                    <span className="my-2 block text-sm text-muted">
                      {d.descripcion}
                    </span>
                    <span className="block text-sm">
                      {[...new Set(d.variantes.map((v) => v.color))].join(
                        " · ",
                      )}{" "}
                      · {d.propietario.nombre}
                    </span>
                    <span className="card-prices mt-3 grid grid-cols-3 gap-2 text-xs">
                      {[
                        ["Unitario", d.precio_unitario],
                        ["Cuarta", d.precio_cuarta],
                        ["6 o más", d.precio_media_docena],
                      ].map(([label, price]) => (
                        <span key={label}>
                          {label}
                          <strong className="mt-1 block">{money(price)}</strong>
                        </span>
                      ))}
                    </span>
                  </button>
                ))}
              </div>
              {!filtered.length && (
                <p className="py-10 text-center text-muted">
                  {query
                    ? "No se encontraron vestidos."
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
          + Vestido
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
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m16 3 5 5-12 12-6 1 1-6L16 3Z" />
            <path d="m13 6 5 5" />
          </svg>
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
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
          </svg>
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
          onSaved={() => {
            const edited = modal === "edit";
            setModal(null);
            setResult({
              title: edited ? "Vestido editado" : "Vestido creado",
              message: edited
                ? "Los cambios del vestido se guardaron correctamente."
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
            y todas sus variantes? Esta acción no se puede deshacer.
          </p>
          <p className="my-3 text-sm text-muted">
            Si tiene ventas registradas, la eliminación será rechazada.
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
