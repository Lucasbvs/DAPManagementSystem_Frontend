const KEY = "dap_token";
export const tokenStore = {
  get: () => sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY),
  set: (token: string, rememberMe = false) => {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
    (rememberMe ? localStorage : sessionStorage).setItem(KEY, token);
  },
  clear: () => {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
  },
};
