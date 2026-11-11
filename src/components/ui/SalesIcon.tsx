export function SalesIcon({
  name,
}: {
  name: "add" | "edit" | "cancel" | "exchange" | "print" | "whatsapp";
}) {
  const paths = {
    add: "M12 5v14M5 12h14",
    edit: "m16 3 5 5-12 12-6 1 1-6L16 3Zm-3 3 5 5",
    cancel: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
    exchange: "M3 7h17l-4-4M21 17H4l4 4M20 7l-4 4M4 17l4-4",
    print: "M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6v-7M17 12h1",
    whatsapp:
      "M20 11.5a8.5 8.5 0 0 1-12.7 7.4L3 21l1.9-4.7A8.5 8.5 0 1 1 20 11.5ZM8 7c0 5 4 9 8 9M8 7l2 2-1 2M16 16l-2-2-2 1",
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
