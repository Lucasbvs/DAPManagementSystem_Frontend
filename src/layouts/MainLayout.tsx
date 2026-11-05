import { NavIcon } from '../components/ui/NavIcon';
import type { ReactNode } from 'react';
import { Button } from '../components/ui/Button';
export function MainLayout({children,onLogout,page}:{children:ReactNode;onLogout:()=>void;page:'inventory'|'sales'}){
 return <div className="app-shell md:pl-60">
  <aside className="sidebar"><div className="hidden md:block"><div className="brand text-5xl">DAP</div><p className="mt-2 tracking-[.3em] text-soft">elegancia</p><p className="mb-4 mt-16 text-[10px] text-soft">GESTIÓN DE TIENDA</p></div>
   <nav aria-label="Principal" className="flex w-full gap-3 md:flex-col">
    <a href="#ventas" aria-current={page==='sales'?'page':undefined} className={`nav-item ${page==='sales'?'nav-active':''}`}><NavIcon name="sales"/><span>Ventas</span></a>
    <a href="#inventario" aria-current={page==='inventory'?'page':undefined} className={`nav-item ${page==='inventory'?'nav-active':''}`}><NavIcon name="inventory"/><span>Inventario</span></a>
    <button disabled title="Disponible en una próxima etapa" className="nav-item"><NavIcon name="accounting"/><span>Contabilidad <small>Próximamente</small></span></button>
   </nav>
   <div className="mt-auto hidden pt-8 md:block"><Button className="inline-flex items-center gap-2" onClick={onLogout}><NavIcon name="logout"/>Cerrar sesión</Button></div>
  </aside>
  <div className="mobile-header flex shrink-0 items-center justify-between bg-ink p-4 text-white md:hidden"><span className="brand text-2xl">DAP elegancia</span><button onClick={onLogout}>Salir</button></div>
  <main id={page==='sales'?'ventas':'inventario'} className="app-main">{children}</main>
 </div>;
}
