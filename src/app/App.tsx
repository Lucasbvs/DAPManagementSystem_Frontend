import { useEffect, useState } from "react";
import { tokenStore } from "../services/token";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { InventoryPage } from "../features/inventory/pages/InventoryPage";
import { MainLayout } from "../layouts/MainLayout";
export function App() {
  const [logged, setLogged] = useState(!!tokenStore.get()),
    [expired, setExpired] = useState(false);
  useEffect(() => {
    const onExpire = () => {
      setLogged(false);
      setExpired(true);
    };
    window.addEventListener("auth:expired", onExpire);
    return () => window.removeEventListener("auth:expired", onExpire);
  }, []);
  if (!logged)
    return (
      <LoginPage
        expired={expired}
        onLogin={() => {
          setLogged(true);
          setExpired(false);
        }}
      />
    );
  return (
    <MainLayout
      onLogout={() => {
        tokenStore.clear();
        setLogged(false);
        setExpired(false);
      }}
    >
      <InventoryPage />
    </MainLayout>
  );
}
