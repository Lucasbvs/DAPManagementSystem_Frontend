export function NavIcon({
  name,
}: {
  name: "sales" | "inventory" | "accounting" | "logout";
}) {
  if (name !== "logout")
    return (
      <img
        aria-hidden="true"
        alt=""
        className="nav-icon figma-nav-icon"
        src={`/assets/figma/${name}.svg`}
      />
    );
  const paths = {
    sales: "M3 3h2l3 12h10l3-9H6 M9 20h.01 M18 20h.01",
    inventory: "M3 7l9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10M7.5 5 17 9",
    accounting: "M5 3h14v18H5V3Zm3 4h8M8 11h2m4 0h2m-8 4h2m4 0h2",
    logout: "M9 3H4v18h5M14 7l5 5-5 5M8 12h11",
  };
  return (
    <svg
      aria-hidden="true"
      className="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
