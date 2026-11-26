import type { TableHTMLAttributes } from "react";

export function DataTable({
  className = "",
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={`ui-data-table ${className}`} {...props} />;
}
