import { api } from "./api";
import type { ApiResponse } from "../types/api";
type Session = {
  token: string;
  user: { id: number; name: string; email: string };
};
export async function login(
  email: string,
  password: string,
  rememberMe = false,
) {
  const { data } = await api.post<ApiResponse<Session>>("/auth/login", {
    email,
    password,
    rememberMe,
  });
  if (!data.success) throw new Error(data.error.message);
  return data.data;
}
