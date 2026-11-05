import { useEffect, useState } from "react";
import { tokenStore } from "../services/token";
import { LoginPage } from "../pages/LoginPage";
import { InventoryPage } from "../pages/InventoryPage";
import { SalesPage } from "../pages/SalesPage";
import { MainLayout } from "../layouts/MainLayout";
export function App() {
  const [page, setPage] = useState<"inventory" | "sales">(() =>
    location.hash === "#ventas" ? "sales" : "inventory",
  );

  useEffect(() => {
    const change = () =>
      setPage(location.hash === "#ventas" ? "sales" : "inventory");
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
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
      page={page}
      onLogout={() => {
        tokenStore.clear();
        setLogged(false);
        setExpired(false);
      }}
    >
      {page === "sales" ? <SalesPage /> : <InventoryPage />}
    </MainLayout>
  );
}
