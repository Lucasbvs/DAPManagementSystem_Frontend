import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Printer,
  MessageCircle,
} from "lucide-react";

const icons = {
  add: Plus,
  edit: Pencil,
  cancel: Trash2,
  exchange: ArrowLeftRight,
  print: Printer,
  whatsapp: MessageCircle,
};

export function SalesIcon({
  name,
}: {
  name: "add" | "edit" | "cancel" | "exchange" | "print" | "whatsapp";
}) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" strokeWidth={1.8} />;
}
