export type Owner = {
  id_propietario: number;
  nombre: string;
  telefono: string | null;
};
export type Variant = {
  id_variante?: number;
  color: string;
  talla: string | null;
  cantidad_stock: number;
};
export type DressInput = {
  ubicacion_almacen: string;
  nombre: string;
  descripcion: string;
  precio_unitario: string;
  precio_cuarta: string | null;
  precio_media_docena: string | null;
  id_propietario: number;
  variantes: Variant[];
};
export type Dress = Omit<DressInput, "ubicacion_almacen"> & {
  ubicacion_almacen: string | null;
} & {
  id_vestido: number;
  numero_vestido: number;
  propietario: Owner;
  stock_total: number;
};
