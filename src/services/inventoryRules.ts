import type { Variant } from "../types/inventory";
export const LOW_STOCK_LIMIT = 2;
export function stockByColor(variants: Variant[]) {
  const colors = new Map<string, { color: string; quantity: number }>();
  for (const v of variants) {
    const key = v.color.trim().toLocaleLowerCase();
    const entry = colors.get(key) ?? { color: v.color.trim(), quantity: 0 };
    entry.quantity += v.cantidad_stock;
    colors.set(key, entry);
  }
  return [...colors.values()];
}
export function priceOrderError(
  unit: string,
  quarter: string | null,
  half: string | null,
) {
  const u = Number(unit),
    q = quarter?.trim() ? Number(quarter) : null,
    h = half?.trim() ? Number(half) : null;
  if (q !== null && q > 0 && u > 0 && q >= u)
    return "El precio de cuarta debe ser menor que el precio unitario.";
  if (h !== null && h > 0 && u > 0 && h >= u)
    return "El precio de media docena debe ser menor que el precio unitario.";
  if (q !== null && h !== null && q > 0 && h > 0 && h >= q)
    return "El precio de media docena debe ser menor que el precio de cuarta.";
  return "";
}
