import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { EXPENSE_CATEGORIES } from "@/lib/utils/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_CATEGORIES = new Set<string>(EXPENSE_CATEGORIES);

type ClassificationRow = {
  id: string;
  status: string;
  merchant: string | null;
  subject: string | null;
  body_snippet: string | null;
  predicted_category: string | null;
  manual_category: string | null;
  amount: number | null;
  transaction_date: string | null;
  detected_type: string | null;
  num_installments: number | null;
};

function normalizeCategory(value: string | null | undefined): string {
  if (value && VALID_CATEGORIES.has(value)) return value;
  return "Otros";
}

/**
 * Aprueba en bloque varias clasificaciones usando el monto, la fecha y el tipo
 * que el parser ya detecto. Convierte cada una en gasto, ingreso o cuota.
 *
 * Body:
 *   ids?: string[]  -> si se omite, aprueba todas las clasificaciones
 *                      aprobables del usuario que tengan monto detectado.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    let requestedIds: string[] | null = null;
    try {
      const body = await request.json();
      if (Array.isArray(body?.ids) && body.ids.length > 0) {
        requestedIds = body.ids.filter((v: unknown): v is string => typeof v === "string");
      }
    } catch {
      // Sin body: se aprueban todas las candidatas.
    }

    const SELECT_COLUMNS = `
      id,
      status,
      merchant,
      subject,
      body_snippet,
      predicted_category,
      manual_category,
      amount,
      transaction_date,
      detected_type,
      num_installments,
      email_imports!inner(user_id)
    `;

    let query = supabase
      .from("expense_classifications")
      .select(SELECT_COLUMNS)
      .eq("email_imports.user_id", user.id)
      .in("status", ["pending", "auto_classified"])
      .limit(200);

    if (requestedIds && requestedIds.length > 0) {
      query = query.in("id", requestedIds);
    }

    const { data, error } = await query;

    if (error) {
      if (/column .* does not exist|schema cache/i.test(error.message)) {
        return NextResponse.json(
          {
            error:
              "La migración 005_email_parsing.sql no está aplicada, por lo que las clasificaciones no tienen monto. Aplícala en Supabase para poder aprobar en bloque.",
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const rows = (data ?? []) as unknown as ClassificationRow[];

    let approved = 0;
    let skipped = 0;
    let failed = 0;
    const warnings: string[] = [];

    for (const row of rows) {
      const amount = Number(row.amount);

      // Sin monto no podemos crear un movimiento real: queda para revision manual.
      if (!Number.isFinite(amount) || amount <= 0) {
        skipped += 1;
        continue;
      }

      const date = row.transaction_date || new Date().toISOString().slice(0, 10);
      const merchant = row.merchant || row.subject || "Sin comercio";
      const description = row.body_snippet || row.subject || "Movimiento importado desde correo";
      const category = normalizeCategory(row.manual_category || row.predicted_category);

      try {
        if (row.detected_type === "income") {
          const { error: incomeError } = await supabase.from("incomes").insert({
            user_id: user.id,
            date,
            amount,
            source: "other",
            description,
          });

          if (incomeError) throw new Error(incomeError.message);
        } else if (row.detected_type === "installment") {
          const numInstallments =
            row.num_installments && row.num_installments > 1 ? row.num_installments : 2;

          const { error: installmentError } = await supabase.from("installments").insert({
            user_id: user.id,
            product_name: merchant,
            total_amount: amount,
            num_installments: numInstallments,
            start_date: date,
            current_installment: 1,
            is_active: true,
          });

          if (installmentError) throw new Error(installmentError.message);
        } else {
          const { error: expenseError } = await supabase.from("expenses").insert({
            user_id: user.id,
            date,
            merchant,
            amount,
            category,
            description,
            is_shared: false,
          });

          if (expenseError) throw new Error(expenseError.message);
        }

        const { error: updateError } = await supabase
          .from("expense_classifications")
          .update({
            status: "manual_classified",
            manual_category: category,
          })
          .eq("id", row.id);

        if (updateError) {
          warnings.push(
            `Movimiento creado pero no se pudo marcar como aprobado "${merchant}": ${updateError.message}`
          );
        }

        approved += 1;
      } catch (rowError) {
        failed += 1;
        warnings.push(
          `No se pudo aprobar "${merchant}": ${
            rowError instanceof Error ? rowError.message : "error desconocido"
          }`
        );
      }
    }

    return NextResponse.json({
      message: "Aprobación masiva completada",
      stats: {
        candidates: rows.length,
        approved,
        skipped,
        failed,
      },
      warnings: warnings.slice(0, 20),
    });
  } catch (err) {
    console.error("[email/review/approve-bulk][POST] unexpected error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

