import { useEffect, useState } from "react";
import { tokenStore } from "../services/token";
import { LoginPage } from "../pages/LoginPage";
import { InventoryPage } from "../pages/InventoryPage";
import { SalesPage } from "../pages/SalesPage";
import { AccountingPage } from "../pages/AccountingPage";
import { MainLayout } from "../layouts/MainLayout";
const pageFromHash = () =>
  location.hash === "#contabilidad"
    ? "accounting"
    : location.hash === "#ventas"
      ? "sales"
      : "inventory";
export function App() {
  const [page, setPage] = useState<"inventory" | "sales" | "accounting">(
    pageFromHash,
  );

  useEffect(() => {
    const change = () => setPage(pageFromHash());
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
      {page === "sales" ? (
        <SalesPage />
      ) : page === "accounting" ? (
        <AccountingPage />
      ) : (
        <InventoryPage />
      )}
    </MainLayout>
  );
}
