const MAX_AMOUNT = 999_999_999;
function amount(value: number): number {
  return Number.isFinite(value) ? Math.min(MAX_AMOUNT, Math.max(0, value)) : 0;
}
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateInvoice(input: { price: number; discount: number; installationCharges: number }) {
  const subtotal = round(amount(input.price));
  const discountPercent = Math.min(100, amount(input.discount));
  const discountAmount = round(subtotal * discountPercent / 100);
  const installationFee = round(amount(input.installationCharges));
  const total = round(Math.max(0, subtotal - discountAmount + installationFee));
  return { subtotal, discountPercent, discountAmount, installationFee, total };
}
