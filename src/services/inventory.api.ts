import { api } from "./api";
import type { ApiResponse } from "../types/api";
import type { Dress, DressInput, Owner } from "../types/inventory";
function unwrap<T>(r: ApiResponse<T>): T {
  if (!r.success) throw new Error(r.error.message);
  return r.data;
}
export const inventoryApi = {
  list: async () =>
    unwrap((await api.get<ApiResponse<Dress[]>>("/vestidos")).data),
  owners: async () =>
    unwrap((await api.get<ApiResponse<Owner[]>>("/propietarios")).data),
  create: async (input: DressInput) =>
    unwrap((await api.post<ApiResponse<Dress>>("/vestidos", input)).data),
  update: async (id: number, input: DressInput) =>
    unwrap((await api.put<ApiResponse<Dress>>(`/vestidos/${id}`, input)).data),
  remove: async (id: number) =>
    unwrap(
      (await api.delete<ApiResponse<{ id_vestido: number }>>(`/vestidos/${id}`))
        .data,
    ),
};
