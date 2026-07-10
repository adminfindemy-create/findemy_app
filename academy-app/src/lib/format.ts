/**
 * Render a paise amount as INR. Default: rounded to whole rupees with
 * en-IN grouping ("₹1,500"). `withDecimals: true` keeps two decimals
 * ("₹1,500.00"). Negative amounts render as "−₹50". Non-finite input → "₹0".
 *
 * Shared across the Findemy Studio app — see Group D sub-plan contract.
 */
export function formatRupees(paise: number, opts?: { withDecimals?: boolean }): string {
  if (!Number.isFinite(paise)) return '₹0';
  const withDecimals = opts?.withDecimals ?? false;
  const sign = paise < 0 ? '−' : '';
  const rupees = Math.abs(paise) / 100;
  const value = withDecimals
    ? rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(rupees).toLocaleString('en-IN');
  return `${sign}₹${value}`;
}
