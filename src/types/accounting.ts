export type AccountingTotals = {
  ingresos: string;
  costos_gastos: string;
  resultado: string;
};
export type AccountingOwner = AccountingTotals & {
  id_propietario: number;
  nombre: string;
};
export type AccountingMovement = {
  id: string;
  fecha: string;
  concepto: string;
  tipo: "Ingreso" | "Costo" | "Gasto";
  importe: string;
  id_propietario: number;
  propietario_nombre: string;
  id_venta: number | null;
};
export type AccountingReport = {
  mes: string;
  propietarios: AccountingOwner[];
  movimientos: AccountingMovement[];
  totales: AccountingTotals;
};
export type ExpenseInput = {
  fecha: string;
  concepto: string;
  tipo: "Costo" | "Gasto";
  importe: string;
  id_propietario: number;
};
