import { deliveryTime } from "../../services/salesRules";
export function DeliverySchedule({
  start,
  end,
  setStart,
  setEnd,
  range,
  setRange,
}: {
  start: string;
  end: string;
  range: boolean;
  setStart: (v: string) => void;
  setEnd: (v: string) => void;
  setRange: (v: boolean) => void;
}) {
  const invalid = range && !!start && !!end && end <= start;
  return (
    <fieldset className="delivery-schedule">
      <legend>
        Horario de entrega <span className="required-mark">*</span>
      </legend>
      <label>
        Tipo de horario
        <select
          value={range ? "range" : "fixed"}
          onChange={(e) => setRange(e.target.value === "range")}
        >
          <option value="fixed">Hora fija</option>
          <option value="range">Rango de horas</option>
        </select>
      </label>
      <div className="sale-fields">
        <label>
          {range ? "Desde" : "Hora de entrega"}
          <input
            required
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        {range && (
          <label>
            Hasta
            <input
              required
              type="time"
              value={end}
              aria-invalid={invalid || undefined}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        )}
      </div>
      {invalid ? (
        <p role="alert" className="error">
          La hora final debe ser posterior a la inicial.
        </p>
      ) : (
        start && (
          <p className="text-sm text-primary">
            Entrega: {deliveryTime(start, range ? end : null)}
          </p>
        )
      )}
    </fieldset>
  );
}
