import { money, orderNumber, type Sale, type SaleLine } from "../types/sales";
export function registrationKey() {
  const a = crypto.getRandomValues(new Uint8Array(16));
  a[6] = (a[6] & 15) | 64;
  a[8] = (a[8] & 63) | 128;
  return Array.from(
    a,
    (b, i) =>
      `${[4, 6, 8, 10].includes(i) ? "-" : ""}${b.toString(16).padStart(2, "0")}`,
  ).join("");
}
export function displayHour(hour: string) {
  const [h, m] = hour.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
export function deliveryTime(start: string | null, end: string | null) {
  return start
    ? end
      ? `${displayHour(start)} a ${displayHour(end)}`
      : displayHour(start)
    : "Sin horario";
}
export const availableReturn = (line: SaleLine) =>
  line.tipo === "Devolucion"
    ? 0
    : Math.max(
        0,
        line.cantidad -
          (line.devoluciones ?? []).reduce((n, d) => n + d.cantidad, 0),
      );
export const linesForOwner = (sale: Sale, owner: string) =>
  !owner
    ? sale.detalles
    : sale.detalles.filter(
        (d) =>
          (d.id_propietario_venta ?? d.variante.vestido.id_propietario) ===
          Number(owner),
      );
export function differenceLabel(amount: string | number) {
  const n = Number(amount);
  return n > 0
    ? `Cobrar ${money(n)}`
    : n < 0
      ? `Devolver ${money(-n)}`
      : "Sin diferencia";
}
function dressText(d: SaleLine) {
  return `${d.nombre_vestido ?? d.variante.vestido.nombre} ×${d.cantidad} (${d.color ?? d.variante.color}${d.talla ? ` / ${d.talla}` : ""}) — Almacén: ${d.variante.vestido.ubicacion_almacen ?? d.ubicacion_almacen ?? "Sin asignar"}`;
}
export function whatsappMessage(sale: Sale) {
  const incoming = sale.detalles.filter((d) => d.tipo === "Devolucion"),
    outgoing = sale.detalles.filter((d) => d.tipo !== "Devolucion");
  const place = sale.departamento_destino
    ? [sale.departamento_destino.replaceAll("_", " "), sale.ciudad_provincia]
        .filter(Boolean)
        .join(" / ")
    : sale.link_ubicacion ||
      sale.direccion_entrega ||
      "Sin ubicación registrada";
  return [
    `📦: Pedido ${sale.numero_diario}${sale.tipo === "Cambio" && sale.venta_origen ? ` · Cambio de ${orderNumber(sale.venta_origen)}` : ""}`,
    ...(sale.tipo === "Cambio"
      ? [
          `↩️: Devolver: ${incoming.map(dressText).join("; ")}`,
          `🛍️: Entregar: ${outgoing.map(dressText).join("; ")}`,
        ]
      : [`🛍️: Vestidos: ${outgoing.map(dressText).join("; ")}`]),
    ...(sale.cliente_nombre ? [`👤: ${sale.cliente_nombre}`] : []),
    `📞: ${sale.cliente_celular ?? sale.cliente.celular}`,
    `📍: ${place}`,
    `🕒: Entrega ${deliveryTime(sale.hora_entrega_desde, sale.hora_entrega_hasta)}`,
    `💰: ${sale.tipo === "Cambio" ? differenceLabel(sale.total_cobrado) : `Monto a cobrar ${money(sale.total_cobrado)}`}`,
  ].join("\n");
}
export const whatsappUrl = (sale: Sale) =>
  `https://wa.me/?text=${encodeURIComponent(whatsappMessage(sale))}`;
