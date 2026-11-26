import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const load = async (path) => {
  const source = ts.transpileModule(
    await readFile(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  );
};
const { filterAccountingReport } = await load(
  "../src/services/accountingFilters.ts",
);
const { buildAccountingCsv } = await load(
  "../src/services/accountingExport.ts",
);

const report = {
  mes: "2026-11",
  propietarios: [
    {
      id_propietario: 1,
      nombre: "Ana",
      ingresos: "100.05",
      costos_gastos: "120.50",
      resultado: "-20.45",
    },
    {
      id_propietario: 2,
      nombre: "Ana",
      ingresos: "300.00",
      costos_gastos: "10.00",
      resultado: "290.00",
    },
    {
      id_propietario: 3,
      nombre: "Dylan",
      ingresos: "0.00",
      costos_gastos: "0.00",
      resultado: "0.00",
    },
  ],
  movimientos: [
    ["venta-1", "Ingreso", "100.05", 1],
    ["costo-1", "Costo", "100.00", 1],
    ["gasto-1", "Gasto", "20.50", 1],
    ["venta-2", "Ingreso", "300.00", 2],
    ["gasto-2", "Gasto", "10.00", 2],
  ].map(([id, tipo, importe, id_propietario]) => ({
    id,
    fecha: "2026-11-01",
    concepto: id,
    tipo,
    importe,
    id_propietario,
    propietario_nombre: "Ana",
    id_venta: null,
  })),
  totales: {
    ingresos: "400.05",
    costos_gastos: "130.50",
    resultado: "269.55",
  },
};

test("todos los dueños conserva el reporte completo", () => {
  assert.strictEqual(filterAccountingReport(report, ""), report);
});

test("filtra ingresos, costos y gastos por ID aunque los nombres coincidan", () => {
  const before = structuredClone(report);
  const filtered = filterAccountingReport(report, "1");

  assert.deepEqual(filtered.propietarios, [report.propietarios[0]]);
  assert.deepEqual(
    filtered.movimientos.map((movement) => movement.id),
    ["venta-1", "costo-1", "gasto-1"],
  );
  assert.equal(filtered.mes, "2026-11");
  assert.deepEqual(report, before);
});

test("conserva los totales del dueño con centavos y resultado negativo", () => {
  assert.deepEqual(filterAccountingReport(report, "1").totales, {
    ingresos: "100.05",
    costos_gastos: "120.50",
    resultado: "-20.45",
  });
  assert.deepEqual(filterAccountingReport(report, "2").totales, {
    ingresos: "300.00",
    costos_gastos: "10.00",
    resultado: "290.00",
  });
});

test("un dueño sin movimientos conserva su resumen en cero", () => {
  const filtered = filterAccountingReport(report, "3");
  assert.deepEqual(filtered.propietarios, [report.propietarios[2]]);
  assert.deepEqual(filtered.movimientos, []);
  assert.deepEqual(filtered.totales, {
    ingresos: "0.00",
    costos_gastos: "0.00",
    resultado: "0.00",
  });
});

test("un dueño inexistente no expone movimientos ni totales de otros", () => {
  const filtered = filterAccountingReport(report, "999");
  assert.deepEqual(filtered, {
    mes: "2026-11",
    propietarios: [],
    movimientos: [],
    totales: {
      ingresos: "0.00",
      costos_gastos: "0.00",
      resultado: "0.00",
    },
  });
});

test("la exportación del reporte filtrado coincide con el dueño elegido", () => {
  const csv = buildAccountingCsv(filterAccountingReport(report, "1"));
  assert.ok(csv.includes('"Ana";100.05;120.50;-20.45'));
  assert.ok(csv.includes('"Total";100.05;120.50;-20.45'));
  assert.ok(csv.includes('"venta-1";"Ingreso";100.05;"Ana"'));
  assert.ok(csv.includes('"costo-1";"Costo";100.00;"Ana"'));
  assert.ok(csv.includes('"gasto-1";"Gasto";20.50;"Ana"'));
  assert.ok(!csv.includes('"venta-2"'));
  assert.ok(!csv.includes('"gasto-2"'));
  assert.ok(!csv.includes('"Dylan"'));
});
