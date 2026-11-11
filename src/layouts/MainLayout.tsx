import { NavIcon } from "../components/ui/NavIcon";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from "react";
import { Button } from "../components/ui/Button";
export function MainLayout({
  children,
  onLogout,
  page,
}: {
  children: ReactNode;
  onLogout: () => void;
  page: "inventory" | "sales";
}) {
  const [navHidden, setNavHidden] = useState(false);
  const scrollPositions = useRef(
    new WeakMap<HTMLElement, { top: number; height: number }>(),
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const reset = () => {
      setNavHidden(false);
      scrollPositions.current = new WeakMap();
    };
    reset();
    media.addEventListener("change", reset);
    return () => media.removeEventListener("change", reset);
  }, [page]);

  function handleScroll(event: UIEvent<HTMLElement>) {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.closest("dialog")) return;
    const top = Math.max(0, target.scrollTop);
    const height = target.clientHeight;
    const previous = scrollPositions.current.get(target);
    if (previous && previous.height !== height) {
      scrollPositions.current.set(target, { top, height });
      return;
    }
    const delta = top - (previous?.top ?? 0);
    if (top <= 8) setNavHidden(false);
    else if (Math.abs(delta) < 8) return;
    else setNavHidden(delta > 0);
    scrollPositions.current.set(target, { top, height });
  }

  return (
    <div className="app-shell md:pl-60">
      <aside className={`sidebar ${navHidden ? "mobile-nav-hidden" : ""}`}>
        <div className="hidden md:block">
          <div className="brand text-5xl">DAP</div>
          <p className="mt-2 tracking-[.3em] text-soft">elegancia</p>
          <p className="mb-4 mt-16 text-[10px] text-soft">GESTIÓN DE TIENDA</p>
        </div>
        <nav aria-label="Principal" className="flex w-full gap-3 md:flex-col">
          <a
            href="#ventas"
            aria-label="Ventas"
            aria-current={page === "sales" ? "page" : undefined}
            className={`nav-item ${page === "sales" ? "nav-active" : ""}`}
          >
            <NavIcon name="sales" />
            <span>Ventas</span>
          </a>
          <a
            href="#inventario"
            aria-label="Inventario"
            aria-current={page === "inventory" ? "page" : undefined}
            className={`nav-item ${page === "inventory" ? "nav-active" : ""}`}
          >
            <NavIcon name="inventory" />
            <span>Inventario</span>
          </a>
          <button
            disabled
            title="Disponible en una próxima etapa"
            aria-label="Contabilidad (próximamente)"
            className="nav-item"
          >
            <NavIcon name="accounting" />
            <span>
              Contabilidad <small>Próximamente</small>
            </span>
          </button>
        </nav>
        <div className="mt-auto hidden pt-8 md:block">
          <Button className="inline-flex items-center gap-2" onClick={onLogout}>
            <NavIcon name="logout" />
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <main
        id={page === "sales" ? "ventas" : "inventario"}
        className="app-main"
        onScrollCapture={handleScroll}
      >
        {children}
      </main>
    </div>
  );
}
