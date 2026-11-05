import { api } from "./api";
import type { Sale, SaleInput } from "../types/sales";
export const salesApi = {
  list: async (fecha: string) =>
    (await api.get<{ data: Sale[] }>("/ventas", { params: { fecha } })).data
      .data,
  save: async (data: SaleInput, id?: number) =>
    (id
      ? await api.put(`/ventas/${id}`, data)
      : await api.post("/ventas", data)
    ).data.data as Sale,
  cancel: async (sale: Sale) =>
    (
      await api.post(`/ventas/${sale.id_venta}/cancelar`, {
        version: sale.version,
      })
    ).data.data as Sale,
  print: async (fecha: string, ids: number[]) => {
    try {
      return (
        await api.post<Blob>(
          "/ventas/imprimir",
          { fecha, ids },
          { responseType: "blob", timeout: 60000 },
        )
      ).data;
    } catch (error) {
      const e = error as { response?: { data: unknown } };
      if (e.response?.data instanceof Blob) {
        try {
          e.response.data = JSON.parse(await e.response.data.text());
        } catch {}
      }
      throw error;
    }
  },
};
