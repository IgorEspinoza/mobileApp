/**
 * Utilidades de fechas para el "mes fiscal" de ingresos.
 *
 * Regla de negocio: los ingresos recibidos después del día 25 del mes
 * corresponden al presupuesto del mes SIGUIENTE. Esto refleja que los
 * sueldos en Chile se pagan entre el 25 y el 30 para el mes que viene.
 *
 * Para un mes objetivo (ej: octubre 2026), los ingresos que le corresponden
 * son los recibidos entre el 26 de septiembre y el 25 de octubre.
 */

/** Día de corte: ingresos del 26 en adelante son del mes siguiente. */
export const INCOME_CUTOFF_DAY = 25;

/**
 * Dado un mes objetivo, retorna el rango de fechas [from, to] (YYYY-MM-DD)
 * de los ingresos que le corresponden.
 *
 * Ejemplo: para octubre 2026 → { from: "2026-09-26", to: "2026-10-25" }
 */
export function getIncomeDateRange(year: number, month: number): { from: string; to: string } {
  // "from" = día 26 del mes ANTERIOR
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const fromDay = INCOME_CUTOFF_DAY + 1; // 26
  const from = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(fromDay).padStart(2, "0")}`;

  // "to" = día 25 del mes objetivo
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(INCOME_CUTOFF_DAY).padStart(2, "0")}`;

  return { from, to };
}

/**
 * Dado una fecha de ingreso, retorna el mes fiscal al que pertenece
 * como { year, month } (month 0-indexed como JS Date).
 *
 * Si el día > 25, pertenece al mes siguiente.
 */
export function getIncomeFiscalMonth(date: Date | string): { year: number; month: number } {
  const d = typeof date === "string" ? new Date(date + "T12:00:00") : date;
  let year = d.getFullYear();
  let month = d.getMonth(); // 0-indexed

  if (d.getDate() > INCOME_CUTOFF_DAY) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return { year, month };
}

/**
 * Etiqueta del mes fiscal para mostrar en UI.
 */
export function getFiscalMonthLabel(year: number, month: number): string {
  const d = new Date(year, month, 1);
  return d.toLocaleDateString("es-CL", { year: "numeric", month: "long" });
}
