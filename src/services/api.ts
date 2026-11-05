import axios from "axios";
import { tokenStore } from "./token";
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api",
  timeout: 15000,
});
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.config?.url !== "/auth/login") {
      if (
        error.config?.headers?.Authorization === `Bearer ${tokenStore.get()}`
      ) {
        tokenStore.clear();
        window.dispatchEvent(new Event("auth:expired"));
      }
    }
    return Promise.reject(error);
  },
);
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error))
    return (
      error.response?.data?.error?.message ??
      "No se pudo conectar con el servidor"
    );
  return error instanceof Error ? error.message : "Ocurrió un error inesperado";
}
