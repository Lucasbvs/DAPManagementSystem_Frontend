import { Eye, EyeOff } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
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
        <div>
          <label htmlFor="login-password">Contraseña</label>
          <div className="password-field">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              maxLength={72}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={
                showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              aria-controls="login-password"
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? (
                <EyeOff size={20} aria-hidden="true" />
              ) : (
                <Eye size={20} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
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
