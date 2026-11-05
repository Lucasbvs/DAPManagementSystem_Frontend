import { useState, type FormEvent } from "react";
import { login } from "../services/auth.api";
import { tokenStore } from "../services/token";
import { errorMessage } from "../services/api";
import { Button } from "../components/ui/Button";
export function LoginPage({
  onLogin,
  expired,
}: {
  onLogin: () => void;
  expired: boolean;
}) {
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await login(email, password, rememberMe);
      tokenStore.set(session.token, rememberMe);
      onLogin();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-dvh place-items-center p-5">
      <form onSubmit={submit} className="panel w-full max-w-md space-y-5">
        <div className="brand text-4xl">
          DAP <span className="text-lg">elegancia</span>
        </div>
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        <p className="text-muted">Accede para administrar el inventario.</p>
        {expired && (
          <p role="status">Tu sesión venció. Inicia sesión nuevamente.</p>
        )}
        <label>
          Correo electrónico
          <input
            type="email"
            required
            maxLength={254}
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            required
            maxLength={72}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Mantener sesión iniciada
        </label>
        <p className="text-sm text-muted">
          En este dispositivo, por hasta 30 días. Puedes cerrar sesión cuando
          quieras.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={busy}
        >
          {busy ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>
    </main>
  );
}
