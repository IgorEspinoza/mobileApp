import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** Umbral de confianza para auto-aprobar sin revisión manual. */
export const AUTO_APPROVE_CONFIDENCE = 0.85;

type ClassificationRow = {
  id: string;
  user_id: string;
  merchant: string | null;
  amount: number | null;
  currency: string | null;
  transaction_date: string | null;
  detected_type: string | null;
  predicted_category: string | null;
  confidence: number | null;
  status: string;
  subject: string | null;
  body_snippet: string | null;
};

/**
 * Auto-aprueba clasificaciones con alta confianza que sean claramente
 * gastos o ingresos. Crea el registro en expenses/incomes y actualiza
 * la clasificación para que no aparezca en la cola de revisión manual.
 *
 * Retorna la cantidad de registros auto-aprobados.
 */
export async function autoApproveClassifications(
  userId: string,
  emailImportId: string,
): Promise<{ approved: number; errors: string[] }> {
  const supabaseAdmin = getSupabaseAdmin();
  const errors: string[] = [];
  let approved = 0;

  // Buscar clasificaciones que califican para auto-aprobación
  const { data: candidates, error: fetchError } = await supabaseAdmin
    .from("expense_classifications")
    .select("id, user_id, merchant, amount, currency, transaction_date, detected_type, predicted_category, confidence, status, subject, body_snippet")
    .eq("email_import_id", emailImportId)
    .eq("user_id", userId)
    .eq("status", "auto_classified")
    .is("expense_id", null);

  if (fetchError || !candidates) {
    return { approved: 0, errors: [fetchError?.message || "No candidates"] };
  }

  for (const row of candidates as unknown as ClassificationRow[]) {
    if (
      !row.amount ||
      !row.transaction_date ||
      !row.detected_type ||
      (row.confidence ?? 0) < AUTO_APPROVE_CONFIDENCE
    ) {
      continue;
    }

    const description = (row.body_snippet || row.subject || "Auto-aprobado").slice(0, 500);
    const merchant = row.merchant || row.subject || "Sin comercio";

    if (row.detected_type === "expense") {
      const { data: expense, error: expError } = await supabaseAdmin
        .from("expenses")
        .insert({
          user_id: row.user_id,
          date: row.transaction_date,
          merchant,
          amount: row.amount,
          category: row.predicted_category || "Otros",
          description,
          is_shared: false,
        })
        .select("id")
        .single();

      if (expError) {
        errors.push(`Expense: ${expError.message}`);
        continue;
      }

      await supabaseAdmin
        .from("expense_classifications")
        .update({ expense_id: expense.id, manual_category: row.predicted_category || "Otros" })
        .eq("id", row.id);

      approved += 1;

    } else if (row.detected_type === "income") {
      const { error: incError } = await supabaseAdmin
        .from("incomes")
        .insert({
          user_id: row.user_id,
          date: row.transaction_date,
          amount: row.amount,
          source: "other",
          description,
        });

      if (incError) {
        errors.push(`Income: ${incError.message}`);
        continue;
      }

      await supabaseAdmin
        .from("expense_classifications")
        .update({ manual_category: "Otros" })
        .eq("id", row.id);

      approved += 1;
    }
  }

  return { approved, errors };
}
