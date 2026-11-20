import { api } from "./api";
import type {
  AccountingReport,
  AccountingMovement,
  ExpenseInput,
} from "../types/accounting";

export const accountingApi = {
  report: async (mes: string) =>
    (
      await api.get<{ data: AccountingReport }>("/contabilidad", {
        params: { mes },
      })
    ).data.data,
  registerExpense: async (input: ExpenseInput) =>
    (
      await api.post<{ data: AccountingMovement }>(
        "/contabilidad/gastos",
        input,
      )
    ).data.data,
};
