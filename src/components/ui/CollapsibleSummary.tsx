import { useEffect, useState, type ReactNode } from "react";

type Props = {
  hidden: boolean;
  children: ReactNode;
  className?: string;
};

export function CollapsibleSummary({
  hidden,
  children,
  className = "",
}: Props) {
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 767px)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const collapsed = mobile && hidden;
  return (
    <div
      className={`ui-collapsible-summary ${collapsed ? "ui-summary-hidden" : ""} ${className}`}
      aria-hidden={collapsed || undefined}
      inert={collapsed || undefined}
    >
      <div className="ui-summary-content">{children}</div>
    </div>
  );
}
