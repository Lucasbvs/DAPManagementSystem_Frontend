import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const compile = async (path) =>
  ts.transpileModule(await readFile(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
const data = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const types = data(await compile("../src/types/sales.ts"));
const source = (await compile("../src/services/salesPricing.ts")).replace(
  /["']\.\.\/types\/sales["']/,
  JSON.stringify(types),
);
const { summarizeOwners, validOwnerAmount, lineAmountCents } = await import(
  data(source)
);

test("agrupa cantidades e importes por identidad del dueño, incluso con nombres iguales", () => {
  const groups = summarizeOwners([
    { ownerId: 1, ownerName: "Ana", quantity: 2, unitCents: 10000 },
    { ownerId: 2, ownerName: "Ana", quantity: 1, unitCents: 12000 },
    {
      ownerId: 1,
      ownerName: "Ana",
      quantity: 1,
      unitCents: 8000,
      discountCents: 1000,
    },
  ]);
  assert.deepEqual(groups, [
    {
      ownerId: 1,
      ownerName: "Ana",
      quantity: 3,
      baseCents: 28000,
      discountCents: 1000,
    },
    {
      ownerId: 2,
      ownerName: "Ana",
      quantity: 1,
      baseCents: 12000,
      discountCents: 0,
    },
  ]);
  assert.equal(
    summarizeOwners([
      { ownerId: 1, ownerName: "Ana", quantity: 2, unitCents: 10000 },
    ]).length,
    1,
  );
  assert.deepEqual(summarizeOwners([]), []);
});
test("rebaja por dueño acepta enteros y cero; rechaza decimales, aumentos y negativos", () => {
  for (const value of ["0", "99", "100"])
    assert.equal(validOwnerAmount(value, 10000), true);
  for (const value of [
    "",
    "-1",
    "99.99",
    "99.5",
    "100.00",
    "100.01",
    "1.001",
    "NaN",
  ])
    assert.equal(validOwnerAmount(value, 10000), false);
});
test("la entrega parcial, devolución y remanente no pierden centavos de la rebaja", () => {
  const line = {
    cantidad: 3,
    precio_unitario_aplicado: "100",
    descuento_manual: "200",
  };
  assert.equal(lineAmountCents(line, 3), 10000);
  assert.equal(lineAmountCents(line, 2), 6667);
  assert.equal(lineAmountCents(line, 1), 3334);
  assert.equal(lineAmountCents(line, 1, 1), 3333);
  assert.equal(
    lineAmountCents(line, 1) + lineAmountCents(line, 1, 1),
    lineAmountCents(line, 2),
  );
  assert.equal(
    lineAmountCents({ cantidad: 3, precio_unitario_aplicado: "100" }, 2),
    20000,
  );
  assert.equal(lineAmountCents(line, 0), 0);
});
