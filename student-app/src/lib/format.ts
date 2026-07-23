import { format } from 'date-fns';

/**
 * Render a paise amount as INR. Default: rounded to whole rupees with
 * en-IN grouping ("₹1,500"). `withDecimals` keeps two decimals ("₹1,500.00").
 * Negative amounts render as "−₹50".
 */
export function formatRupees(paise: number, opts?: { withDecimals?: boolean }): string {
  const withDecimals = opts?.withDecimals ?? false;
  const sign = paise < 0 ? '−' : '';
  const rupees = Math.abs(paise) / 100;
  const value = withDecimals
    ? rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(rupees).toLocaleString('en-IN');
  return `${sign}₹${value}`;
}

/** "Saturday, 19 April 2026" */
export function formatTrialDate(iso: string): string {
  return format(new Date(iso), 'EEEE, d MMMM yyyy');
}

/** "Sat, 19 Apr" */
export function formatTrialDateShort(iso: string): string {
  return format(new Date(iso), 'EEE, d MMM');
}
