import { useState } from "react";
import { Download, Plus } from "lucide-react";
import "../styles/accounting.css";
import { Button } from "../components/ui/Button";
import { CollapsibleSummary } from "../components/ui/CollapsibleSummary";
import { DataTable } from "../components/ui/DataTable";
import { OwnerFilter } from "../components/ui/OwnerFilter";
import {
  ActionResultModal,
  type ActionResult,
} from "../components/ui/ActionResultModal";
import { ExpenseForm } from "../components/forms/ExpenseForm";
import { useAccounting } from "../hooks/useAccounting";
import { useScrollSummary } from "../hooks/useScrollSummary";
import { downloadAccountingReport } from "../services/accountingExport";
import { filterAccountingReport } from "../services/accountingFilters";
import { money, today } from "../types/sales";
import type { AccountingMovement, AccountingTotals } from "../types/accounting";

const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("es-BO", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));

function AccountingSummary({ totals }: { totals?: AccountingTotals }) {
  return (
    <section
      className="accounting-stats"
      aria-label="Resumen del mes y dueño seleccionados"
    >
      {[
        {
          label: "Ingresos del mes",
          short: "Ingresos",
          amount: totals?.ingresos,
          detail: "Ventas entregadas",
        },
        {
          label: "Costos y gastos",
          short: "Gastos",
          amount: totals?.costos_gastos,
          detail: "Mercadería y operación",
        },
        {
          label: "Resultado del mes",
          short: "Resultado",
          amount: totals?.resultado,
          detail: "Ingresos menos costos y gastos",
          result: true,
        },
      ].map((stat) => (
        <article
          key={stat.label}
          className={`panel accounting-stat ${stat.result ? "accounting-result" : ""}`}
        >
          <p>
            <span className="hidden md:inline">{stat.label}</span>
            <span className="md:hidden">{stat.short}</span>
          </p>
          <strong>
            {stat.amount === undefined ? "—" : money(stat.amount)}
          </strong>
          <small>{stat.detail}</small>
        </article>
      ))}
    </section>
  );
}

function MovementType({ type }: { type: AccountingMovement["tipo"] }) {
  return (
    <span
      className={`accounting-badge ${type === "Ingreso" ? "accounting-income" : ""}`}
    >
      {type}
    </span>
  );
}

function MovementCard({ row }: { row: AccountingMovement }) {
  return (
    <article className="mobile-card accounting-movement">
      <div>
        <MovementType type={row.tipo} />
        <strong>{money(row.importe)}</strong>
      </div>
      <h3>{row.concepto}</h3>
      <div className="accounting-movement-footer">
        <time dateTime={row.fecha}>{dateLabel(row.fecha)}</time>
        <span>{row.propietario_nombre}</span>
      </div>
    </article>
  );
}

export function AccountingPage() {
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [owner, setOwner] = useState("");
  const { report, owners, loading, error, reload } = useAccounting(month);
  const { summaryHidden, resetSummary, scrollRef, onScroll } =
    useScrollSummary();
  const [showExpense, setShowExpense] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const filteredReport = report ? filterAccountingReport(report, owner) : null;
  const movements = filteredReport?.movimientos ?? [];

  return (
    <div className="accounting-page" aria-label="Contabilidad">
      <h1 className="sr-only">Contabilidad</h1>
      <CollapsibleSummary hidden={summaryHidden} className="accounting-summary">
        <AccountingSummary totals={filteredReport?.totales} />
      </CollapsibleSummary>
      {error && (
        <div className="error" role="alert">
          <p>{error}</p>
          <Button className="mt-2" onClick={() => void reload()}>
            Reintentar
          </Button>
        </div>
      )}
      <section
        className="accounting-movements"
        aria-labelledby="accounting-movements-title"
      >
        <div className="accounting-filters">
          <label>
            Mes del reporte
            <input
              type="month"
              min="0001-01"
              max="9999-12"
              value={month}
              onChange={(event) => {
                if (
                  /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)
                ) {
                  setMonth(event.target.value);
                  resetSummary();
                }
              }}
            />
          </label>
          <OwnerFilter
            owners={owners}
            value={owner}
            label="Dueño"
            visibleLabel
            onChange={(value) => {
              setOwner(value);
              resetSummary();
            }}
          />
        </div>
        <div className="accounting-list-heading">
          {filteredReport && (
            <span>
              {movements.length}{" "}
              {movements.length === 1 ? "movimiento" : "movimientos"}
            </span>
          )}
        </div>
        <div
          className="accounting-scroll"
          ref={scrollRef}
          onScroll={onScroll}
          tabIndex={0}
          role="region"
          aria-label="Lista de movimientos del mes"
          aria-busy={loading}
        >
          {loading && !report ? (
            <p className="accounting-empty" role="status">
              Cargando contabilidad…
            </p>
          ) : filteredReport ? (
            <>
              <DataTable
                className="accounting-table"
                aria-label="Movimientos del mes"
              >
                <colgroup>
                  <col className="accounting-date-column" />
                  <col />
                  <col className="accounting-type-column" />
                  <col className="accounting-amount-column" />
                  <col className="accounting-owner-column" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Concepto</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Importe</th>
                    <th scope="col">Dueño</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <time dateTime={row.fecha}>{dateLabel(row.fecha)}</time>
                      </td>
                      <td>{row.concepto}</td>
                      <td>
                        <MovementType type={row.tipo} />
                      </td>
                      <td className="accounting-amount">
                        {money(row.importe)}
                      </td>
                      <td>{row.propietario_nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
              <div className="accounting-mobile-movements">
                {movements.map((row) => (
                  <MovementCard key={row.id} row={row} />
                ))}
              </div>
              {!movements.length && (
                <p className="accounting-empty" role="status">
                  {!report?.propietarios.length
                    ? "No hay dueños registrados para mostrar el resumen."
                    : owner
                      ? "No hay movimientos de este dueño en el mes seleccionado."
                      : "No hay movimientos en este mes. Las ventas se suman al quedar entregadas."}
                </p>
              )}
            </>
          ) : null}
        </div>
      </section>
      <div className="accounting-actions">
        <Button
          variant="primary"
          onClick={() => setShowExpense(true)}
          disabled={!report?.propietarios.length || loading || !!error}
        >
          <Plus size={18} aria-hidden="true" />
          Registrar gasto
        </Button>
        <Button
          onClick={() => {
            if (filteredReport) downloadAccountingReport(filteredReport);
          }}
          disabled={!filteredReport || loading || !!error}
        >
          <Download size={18} aria-hidden="true" />
          Exportar reporte
        </Button>
      </div>
      {showExpense && report && (
        <ExpenseForm
          owners={report.propietarios}
          defaultOwnerId={owner ? Number(owner) : undefined}
          month={month}
          onClose={() => setShowExpense(false)}
          onSaved={(date) => {
            setShowExpense(false);
            resetSummary();
            if (date.slice(0, 7) === month) void reload();
            else setMonth(date.slice(0, 7));
            setResult({
              title: "Gasto registrado",
              message:
                "El movimiento se guardó y se incluyó en el resumen de su dueño.",
            });
          }}
        />
      )}
      {result && (
        <ActionResultModal result={result} onClose={() => setResult(null)} />
      )}
    </div>
  );
}
