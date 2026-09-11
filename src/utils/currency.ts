export function formatCurrency(value: number, symbol = '₹'): string {
  return `${symbol}${(Number.isFinite(value) ? value : 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
