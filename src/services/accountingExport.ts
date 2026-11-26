import type { AccountingReport } from "../types/accounting";

const textCell = (value: string) => {
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
};
const amountCell = (value: string) => {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value))
    throw new Error("Importe contable inválido");
  return value;
};

export function buildAccountingCsv(report: AccountingReport) {
  const rows = [
    ["DAP Elegancia · Contabilidad", report.mes].map(textCell).join(";"),
    textCell(
      "Ingresos de prendas entregadas; sin delivery ni envío. Fecha comercial de la venta en Bolivia.",
    ),
    "",
    ["Contribuyente", "Ingresos (Bs)", "Costos y gastos (Bs)", "Resultado (Bs)"]
      .map(textCell)
      .join(";"),
    ...report.propietarios.map((owner) =>
      [
        textCell(owner.nombre),
        amountCell(owner.ingresos),
        amountCell(owner.costos_gastos),
        amountCell(owner.resultado),
      ].join(";"),
    ),
    [
      textCell("Total"),
      amountCell(report.totales.ingresos),
      amountCell(report.totales.costos_gastos),
      amountCell(report.totales.resultado),
    ].join(";"),
    "",
    ["Fecha", "Concepto", "Tipo", "Importe (Bs)", "Contribuyente"]
      .map(textCell)
      .join(";"),
    ...report.movimientos.map((row) =>
      [
        textCell(row.fecha),
        textCell(row.concepto),
        textCell(row.tipo),
        amountCell(row.importe),
        textCell(row.propietario_nombre),
      ].join(";"),
    ),
  ];
  return "\uFEFF" + rows.join("\r\n") + "\r\n";
}

export function downloadAccountingReport(report: AccountingReport) {
  const url = URL.createObjectURL(
    new Blob([buildAccountingCsv(report)], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `DAP-contabilidad-${report.mes}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
