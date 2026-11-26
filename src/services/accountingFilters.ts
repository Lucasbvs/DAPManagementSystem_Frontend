import type { AccountingReport } from "../types/accounting";

export function filterAccountingReport(
  report: AccountingReport,
  ownerId: string,
): AccountingReport {
  if (!ownerId) return report;

  const owner = report.propietarios.find(
    (person) => String(person.id_propietario) === ownerId,
  );

  return {
    ...report,
    propietarios: owner ? [owner] : [],
    movimientos: owner
      ? report.movimientos.filter(
          (movement) => movement.id_propietario === owner.id_propietario,
        )
      : [],
    totales: {
      ingresos: owner?.ingresos ?? "0.00",
      costos_gastos: owner?.costos_gastos ?? "0.00",
      resultado: owner?.resultado ?? "0.00",
    },
  };
}
