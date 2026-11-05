export type SaleLine = {
  id_variante: number;
  cantidad: number;
  precio_unitario_aplicado: string;
  nombre_vestido: string | null;
  color: string | null;
  talla: string | null;
  variante: {
    color: string;
    talla: string | null;
    vestido: { nombre: string };
  };
};
export type Sale = {
  id_venta: number;
  numero_diario: number;
  fecha: string;
  estado: "Realizada" | "Cancelada";
  version: number;
  clave_registro: string | null;
  cliente_nombre: string | null;
  cliente_celular: string | null;
  direccion_entrega: string | null;
  link_ubicacion: string | null;
  cliente: {
    nombre: string | null;
    celular: string;
    direccion_entrega: string | null;
    link_ubicacion: string | null;
  };
  detalles: SaleLine[];
  total_prendas: number;
  tarifa_aplicada: "unitario" | "cuarta" | "media_docena";
  monto_vestidos: string;
  adicional_delivery: string;
  costo_delivery: string;
  departamento_destino: string | null;
  ciudad_provincia: string | null;
  costo_envio: string | null;
  total_cobrado: string;
  monto_neto: string;
};
export type SaleInput = {
  clave_registro: string;
  version?: number;
  cliente: {
    nombre: string | null;
    celular: string;
    direccion_entrega: string | null;
    link_ubicacion: string | null;
  };
  detalles: { id_variante: number; cantidad: number }[];
  adicional_delivery: string;
  departamento_destino: string | null;
  ciudad_provincia: string | null;
  costo_envio: string | null;
};
export const money = (value: string | number) =>
  new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(
    Number(value),
  );
export const orderNumber = (sale: Sale) =>
  `V-${String(sale.numero_diario).padStart(3, "0")}`;
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const cents = (value: string | number | null) =>
  Math.round(Number(value ?? 0) * 100);
export const decimal = (value: number) => (value / 100).toFixed(2);
