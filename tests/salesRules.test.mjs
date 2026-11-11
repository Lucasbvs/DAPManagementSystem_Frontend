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
const rules = (await compile("../src/services/salesRules.ts")).replace(
  "'../types/sales'",
  JSON.stringify(types),
);
const {
  deliveryTime,
  differenceLabel,
  availableReturn,
  linesForOwner,
  whatsappMessage,
  whatsappUrl,
} = await import(data(rules));
const line = {
  id_detalle: 1,
  tipo: "Entrega",
  cantidad: 3,
  precio_unitario_aplicado: "100",
  nombre_vestido: "Aurora & Dalia",
  color: "Verde",
  talla: "M",
  id_propietario_venta: 1,
  ubicacion_almacen: "A1",
  devoluciones: [{ cantidad: 1 }],
  variante: {
    color: "Verde",
    talla: "M",
    vestido: {
      nombre: "Actualizado",
      ubicacion_almacen: "M12",
      id_propietario: 2,
    },
  },
};
const sale = {
  numero_diario: 7,
  tipo: "Venta",
  estado: "Realizada",
  cliente_nombre: null,
  cliente_celular: "70000001",
  cliente: { celular: "70000001" },
  detalles: [line],
  hora_entrega_desde: "14:00",
  hora_entrega_hasta: "16:00",
  departamento_destino: null,
  ciudad_provincia: null,
  link_ubicacion: "https://maps.google.com/?q=A&B",
  direccion_entrega: null,
  total_cobrado: "300",
};
test("horarios de entrega en formato de 12 horas y diferencias con su signo", () => {
  assert.equal(deliveryTime("00:30", null), "12:30 AM");
  assert.equal(deliveryTime("12:30", null), "12:30 PM");
  assert.equal(deliveryTime("14:00", "16:00"), "2:00 PM a 4:00 PM");
  assert.equal(deliveryTime(null, null), "Sin horario");
  assert.match(differenceLabel("-25"), /^Devolver/);
  assert.match(differenceLabel("25"), /^Cobrar/);
  assert.equal(differenceLabel("0"), "Sin diferencia");
});
test("WhatsApp respeta estructura, ubicación actual y codifica el mensaje sin elegir destinatario", () => {
  const message = whatsappMessage(sale);
  assert.match(message, /📦: Pedido 7/);
  assert.match(message, /🛍️: Vestidos: Aurora & Dalia/);
  assert.match(message, /Almacén: M12/);
  assert.match(message, /📞: 70000001/);
  assert.match(message, /📍: https:\/\/maps.google.com\/\?q=A&B/);
  assert.equal(message.includes("👤:"), false);
  const url = new URL(whatsappUrl(sale));
  assert.equal(url.host, "wa.me");
  assert.equal(url.pathname, "/");
  assert.equal(url.searchParams.get("text"), message);
  const shipping = whatsappMessage({
    ...sale,
    cliente_nombre: "Ana",
    departamento_destino: "La_Paz",
    link_ubicacion: null,
  });
  assert.match(shipping, /👤: Ana/);
  assert.match(shipping, /📍: La Paz/);
  assert.equal(shipping.includes("null"), false);
});
test("cambios detallan devolver/entregar y limitan devoluciones y filtro al dueño histórico", () => {
  assert.equal(availableReturn(line), 2);
  assert.equal(availableReturn({ ...line, tipo: "Devolucion" }), 0);
  assert.equal(linesForOwner(sale, "1").length, 1);
  assert.equal(linesForOwner(sale, "2").length, 0);
  const message = whatsappMessage({
    ...sale,
    tipo: "Cambio",
    venta_origen: { numero_diario: 1 },
    total_cobrado: "-25",
    detalles: [{ ...line, tipo: "Devolucion" }, line],
  });
  assert.match(message, /↩️: Devolver/);
  assert.match(message, /🛍️: Entregar/);
  assert.match(message, /💰: Devolver/);
});
