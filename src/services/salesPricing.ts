import { cents, type SaleLine } from "../types/sales";

type PricingLine = Pick<SaleLine, "cantidad" | "precio_unitario_aplicado"> & {
  descuento_manual?: string;
};
export function lineDiscountCents(
  line: PricingLine,
  quantity: number,
  offset = 0,
) {
  const discount = BigInt(cents(line.descuento_manual ?? "0"));
  const prefix = (n: number) => (discount * BigInt(n)) / BigInt(line.cantidad);
  return Number(prefix(offset + quantity) - prefix(offset));
}
export function lineAmountCents(
  line: PricingLine,
  quantity: number,
  offset = 0,
) {
  return (
    cents(line.precio_unitario_aplicado) * quantity -
    lineDiscountCents(line, quantity, offset)
  );
}
export function summarizeOwners(
  lines: {
    ownerId: number;
    ownerName: string;
    quantity: number;
    unitCents: number;
    discountCents?: number;
  }[],
) {
  const owners = new Map<
    number,
    {
      ownerId: number;
      ownerName: string;
      quantity: number;
      baseCents: number;
      discountCents: number;
    }
  >();
  for (const line of lines) {
    const owner = owners.get(line.ownerId) ?? {
      ownerId: line.ownerId,
      ownerName: line.ownerName,
      quantity: 0,
      baseCents: 0,
      discountCents: 0,
    };
    owner.quantity += line.quantity;
    owner.baseCents += line.unitCents * line.quantity;
    owner.discountCents += line.discountCents ?? 0;
    owners.set(line.ownerId, owner);
  }
  return [...owners.values()];
}
export function validOwnerAmount(value: string, maximum: number) {
  return /^(0|[1-9]\d{0,7})$/.test(value) && cents(value) <= maximum;
}
