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
  nombre: string;
  descripcion: string;
  precio_unitario: string;
  precio_cuarta: string | null;
  precio_media_docena: string | null;
  id_propietario: number;
  variantes: Variant[];
};
export type Dress = DressInput & {
  id_vestido: number;
  numero_vestido: number;
  propietario: Owner;
  stock_total: number;
};
