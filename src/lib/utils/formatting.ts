// Number formatting
export function formatCurrency(
  value: number,
  currency: string = "CLP",
  locale: string = "es-CL"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(value);
}

export function formatNumber(
  value: number,
  locale: string = "es-CL"
): string {
  return new Intl.NumberFormat(locale).format(value);
}

// Date formatting
export function formatDate(
  date: string | Date,
  locale: string = "es-CL"
): string {
  return new Intl.DateTimeFormat(locale).format(new Date(date));
}

export function formatDateWithTime(
  date: string | Date,
  locale: string = "es-CL"
): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

// Percentage
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// Month/Year
export function formatMonthYear(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("es-CL", {
    year: "numeric",
    month: "long",
  });
}

