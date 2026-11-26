type OwnerOption = { id_propietario: number; nombre: string };

type Props = {
  owners: OwnerOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  visibleLabel?: boolean;
  className?: string;
  disabled?: boolean;
};

export function OwnerFilter({
  owners,
  value,
  onChange,
  label = "Filtrar por dueño",
  visibleLabel = false,
  className = "",
  disabled,
}: Props) {
  return (
    <label className={`ui-owner-filter ${className}`}>
      <span className={visibleLabel ? undefined : "sr-only"}>{label}</span>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Todos los dueños</option>
        {owners.map((owner) => (
          <option key={owner.id_propietario} value={owner.id_propietario}>
            {owner.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
