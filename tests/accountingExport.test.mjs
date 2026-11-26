import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = ts.transpileModule(
  await readFile(
    new URL("../src/services/accountingExport.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const { buildAccountingCsv } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const report = {
  mes: "2026-11",
  propietarios: [
    {
      id_propietario: 1,
      nombre: 'Ana; "DAP"',
      ingresos: "100.00",
      costos_gastos: "120.50",
      resultado: "-20.50",
    },
  ],
  movimientos: [
    {
      id: "movimiento-1",
      fecha: "2026-11-01",
      concepto: "Compra; bolsas\nGrandes",
      tipo: "Costo",
      importe: "120.50",
      propietario_nombre: 'Ana; "DAP"',
    },
  ],
  totales: { ingresos: "100.00", costos_gastos: "120.50", resultado: "-20.50" },
};
test("CSV conserva centavos, resultados negativos, comillas, separadores y acentos", () => {
  const csv = buildAccountingCsv(report);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"Ana; ""DAP""";100.00;120.50;-20.50'));
  assert.ok(csv.includes('"Compra; bolsas\nGrandes"'));
  assert.ok(csv.includes('"Total";100.00;120.50;-20.50'));
  assert.ok(csv.includes('"2026-11"'));
});
test("textos de movimientos y propietarios no ejecutan fórmulas", () => {
  for (const text of [
    '=HYPERLINK("x")',
    "+1+1",
    "-1+1",
    "@SUM(1)",
    "  =1+1",
    "\t1+1",
    "\n=1",
  ]) {
    const csv = buildAccountingCsv({
      ...report,
      movimientos: [
        { ...report.movimientos[0], concepto: text, propietario_nombre: text },
      ],
    });
    assert.ok(csv.includes(`"'${text.replaceAll('"', '""')}"`));
  }
  assert.throws(
    () =>
      buildAccountingCsv({
        ...report,
        totales: { ...report.totales, ingresos: "=1+1" },
      }),
    /inválido/,
  );
});
test("mes vacío exporta encabezados y totales en cero", () => {
  const csv = buildAccountingCsv({
    mes: "2026-12",
    propietarios: [],
    movimientos: [],
    totales: { ingresos: "0.00", costos_gastos: "0.00", resultado: "0.00" },
  });
  assert.ok(csv.includes('"Total";0.00;0.00;0.00'));
  assert.ok(
    csv.includes('"Fecha";"Concepto";"Tipo";"Importe (Bs)";"Contribuyente"'),
  );
});
