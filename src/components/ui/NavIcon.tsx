import { ShoppingBag, Package, Calculator, LogOut } from "lucide-react";

const icons = {
  sales: ShoppingBag,
  inventory: Package,
  accounting: Calculator,
  logout: LogOut,
};

export function NavIcon({
  name,
}: {
  name: "sales" | "inventory" | "accounting" | "logout";
}) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" className="nav-icon" strokeWidth={1.8} />;
}
