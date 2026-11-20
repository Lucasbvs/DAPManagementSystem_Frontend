import { useState } from "react";
import { Plus } from "lucide-react";
import "../styles/accounting.css";
import { Button } from "../components/ui/Button";
import {
  ActionResultModal,
  type ActionResult,
} from "../components/ui/ActionResultModal";
import { ExpenseForm } from "../components/forms/ExpenseForm";
import { useAccounting } from "../hooks/useAccounting";
import { downloadAccountingReport } from "../services/accountingExport";
import { money, today } from "../types/sales";
import type { AccountingMovement, AccountingOwner } from "../types/accounting";

const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("es-BO", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));

function OwnerSummary({ owner }: { owner: AccountingOwner }) {
  return (
    <section
      className="accounting-owner"
      aria-labelledby={`owner-${owner.id_propietario}`}
    >
      <h2 id={`owner-${owner.id_propietario}`}>{owner.nombre}</h2>
      <div className="accounting-stats">
        {[
          {
            label: "INGRESOS DEL MES",
            amount: owner.ingresos,
            detail: "Ventas entregadas",
            result: false,
          },
          {
            label: "COSTOS Y GASTOS",
            amount: owner.costos_gastos,
            detail: "Mercadería y operación",
            result: false,
          },
          {
            label: "RESULTADO DEL MES",
            amount: owner.resultado,
            detail: "Ingresos menos costos y gastos",
            result: true,
          },
        ].map((stat) => (
          <article
            key={stat.label}
            className={`panel accounting-stat ${stat.result ? "accounting-result" : ""}`}
          >
            <p>{stat.label}</p>
            <strong>{money(stat.amount)}</strong>
            <small>{stat.detail}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function MovementCard({ row }: { row: AccountingMovement }) {
  return (
    <article className="mobile-card accounting-movement">
      <div>
        <time dateTime={row.fecha}>{dateLabel(row.fecha)}</time>
        <strong>{money(row.importe)}</strong>
      </div>
      <h3>{row.concepto}</h3>
      <div>
        <span className="accounting-badge">{row.tipo}</span>
        <span className="accounting-contributor">{row.propietario_nombre}</span>
      </div>
    </article>
  );
}

export function AccountingPage() {
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const { report, loading, error, reload } = useAccounting(month);
  const [showExpense, setShowExpense] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="accounting-page" aria-label="Contabilidad">
      <div className="accounting-mobile-brand" aria-hidden="true">
        <div>
          <span className="brand">DAP</span>
          <small>elegancia</small>
        </div>
        <span>GESTIÓN DE TIENDA</span>
      </div>
      <div className="accounting-content">
        <header className="accounting-heading">
          <div>
            <h1>Contabilidad</h1>
            <p>Conoce tus ingresos, costos y el resultado de tu negocio.</p>
          </div>
          <label className="accounting-month">
            Mes del reporte
            <input
              type="month"
              aria-label="Mes del reporte"
              min="0001-01"
              max="9999-12"
              value={month}
              onChange={(event) => {
                if (/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value))
                  setMonth(event.target.value);
              }}
            />
          </label>
        </header>
        {error && (
          <div className="error" role="alert">
            <p>{error}</p>
            <Button className="mt-2" onClick={() => void reload()}>
              Reintentar
            </Button>
          </div>
        )}
        {loading && !report && (
          <p className="accounting-empty" role="status">
            Cargando contabilidad…
          </p>
        )}
        {report && (
          <>
            {report.propietarios.map((owner) => (
              <OwnerSummary key={owner.id_propietario} owner={owner} />
            ))}
            {!report.propietarios.length && (
              <p className="panel">
                No hay propietarios registrados para mostrar el resumen.
              </p>
            )}
            <section
              className="accounting-movements"
              aria-labelledby="accounting-movements-title"
            >
              <h2 id="accounting-movements-title">Movimientos del mes</h2>
              {report.movimientos.length ? (
                <>
                  <div className="accounting-table-wrap">
                    <table className="accounting-table">
                      <thead>
                        <tr>
                          <th scope="col">Fecha</th>
                          <th scope="col">Concepto</th>
                          <th scope="col">Tipo</th>
                          <th scope="col">Importe</th>
                          <th scope="col">Contribuyente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.movimientos.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <time dateTime={row.fecha}>
                                {dateLabel(row.fecha)}
                              </time>
                            </td>
                            <td>{row.concepto}</td>
                            <td>{row.tipo}</td>
                            <td className="accounting-amount">
                              {money(row.importe)}
                            </td>
                            <td>{row.propietario_nombre}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="accounting-mobile-movements">
                    {report.movimientos.map((row) => (
                      <MovementCard key={row.id} row={row} />
                    ))}
                  </div>
                </>
              ) : (
                <p className="accounting-empty">
                  No hay movimientos en este mes. Las ventas se suman al quedar
                  entregadas.
                </p>
              )}
              <div className="accounting-actions">
                <Button
                  variant="primary"
                  onClick={() => setShowExpense(true)}
                  disabled={!report.propietarios.length}
                >
                  <Plus size={18} aria-hidden="true" />
                  Registrar gasto
                </Button>
                <Button
                  onClick={() => downloadAccountingReport(report)}
                  disabled={!!error}
                >
                  Exportar reporte
                </Button>
              </div>
            </section>
            <p className="accounting-note">
              Ingresos de prendas entregadas, con descuentos y sin delivery ni
              envío. El mes corresponde a la fecha de registro de la venta en
              Bolivia.
            </p>
          </>
        )}
      </div>
      {showExpense && report && (
        <ExpenseForm
          owners={report.propietarios}
          month={month}
          onClose={() => setShowExpense(false)}
          onSaved={(date) => {
            setShowExpense(false);
            if (date.slice(0, 7) === month) void reload();
            else setMonth(date.slice(0, 7));
            setResult({
              title: "Gasto registrado",
              message:
                "El movimiento se guardó y se incluyó en el resumen de su contribuyente.",
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
