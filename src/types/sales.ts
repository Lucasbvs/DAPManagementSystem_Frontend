export type SaleLine = {
  id_detalle: number;
  id_variante: number;
  cantidad: number;
  tipo: "Entrega" | "Devolucion";
  id_detalle_origen: number | null;
  precio_unitario_aplicado: string;
  nombre_vestido: string | null;
  color: string | null;
  talla: string | null;
  id_propietario_venta: number | null;
  propietario_nombre: string | null;
  ubicacion_almacen: string | null;
  devoluciones: { cantidad: number }[];
  variante: {
    color: string;
    talla: string | null;
    vestido: {
      nombre: string;
      ubicacion_almacen: string | null;
      id_propietario: number;
      propietario: { nombre: string };
    };
  };
};
export type Sale = {
  id_venta: number;
  numero_diario: number;
  fecha: string;
  estado: "Realizada" | "Cancelada";
  tipo: "Venta" | "Cambio";
  id_venta_origen: number | null;
  venta_origen: {
    id_venta: number;
    numero_diario: number;
    fecha: string;
  } | null;
  cambios: { id_venta: number; estado: "Realizada" | "Cancelada" }[];
  hora_entrega_desde: string | null;
  hora_entrega_hasta: string | null;
  monto_devolucion: string;
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
  hora_entrega_desde: string;
  hora_entrega_hasta: string | null;
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
export type ExchangeInput = {
  clave_registro: string;
  version: number;
  hora_entrega_desde: string;
  hora_entrega_hasta: string | null;
  devoluciones: { id_detalle: number; cantidad: number }[];
  entregas: { id_variante: number; cantidad: number }[];
};
export const money = (value: string | number) =>
  new Intl.NumberFormat("es-BO", { style: "currency", currency: "BOB" }).format(
    Number(value),
  );
export const orderNumber = (sale: { numero_diario: number }) =>
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
