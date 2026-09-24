import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { ApproveEmailClassificationSchema } from "@/lib/validations/schemas";
import { FIXED_EXPENSE_CATEGORIES } from "@/lib/utils/constants";

const FIXED_CATEGORIES = new Set<string>(FIXED_EXPENSE_CATEGORIES);

/**
 * Aprueba una clasificación pendiente y la convierte en:
 * - gasto (expenses)
 * - ingreso (incomes)
 * - cuota (installments)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const body = await request.json();
    const validated = ApproveEmailClassificationSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Validación fallida" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    // Verifica que la clasificación pertenece al usuario autenticado.
    const { data: classification, error: classificationError } = await supabase
      .from("expense_classifications")
      .select(
        `
        id,
        status,
        merchant,
        subject,
        body_snippet,
        predicted_category,
        manual_category,
        email_imports!inner(user_id)
      `
      )
      .eq("id", id)
      .eq("email_imports.user_id", user.id)
      .single();

    if (classificationError || !classification) {
      return NextResponse.json(
        { error: "Clasificación no encontrada" },
        { status: 404 }
      );
    }

    if (classification.status === "rejected") {
      return NextResponse.json(
        { error: "Esta clasificación ya fue rechazada" },
        { status: 409 }
      );
    }

    const payload = validated.data;
    const description =
      payload.description ||
      classification.body_snippet ||
      classification.subject ||
      "Movimiento aprobado desde revisión manual";

    const merchantFromSource =
      payload.merchant?.trim() ||
      classification.merchant ||
      classification.subject ||
      "Sin comercio";

    let createdRecord: Record<string, unknown> | null = null;

    if (payload.destination === "expense") {
      const category =
        payload.category ||
        classification.manual_category ||
        classification.predicted_category ||
        "Otros";

      const isFixedExpense = FIXED_CATEGORIES.has(category);

      if (isFixedExpense) {
        // Gastos fijos van a la tabla fixed_expenses
        const txDate = new Date(payload.date);
        const month = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}-01`;

        const { data: fixedExpense, error: fixedError } = await supabase
          .from("fixed_expenses")
          .insert({
            user_id: user.id,
            category,
            amount: payload.amount,
            month,
            description,
            frequency: "monthly",
            start_date: month,
          })
          .select()
          .single();

        if (fixedError || !fixedExpense) {
          return NextResponse.json(
            { error: `Error al crear gasto fijo: ${fixedError?.message || "sin detalle"}` },
            { status: 400 }
          );
        }

        createdRecord = fixedExpense as unknown as Record<string, unknown>;

        const { error: updateError } = await supabase
          .from("expense_classifications")
          .update({
            status: "manual_classified",
            manual_category: category,
          })
          .eq("id", id);

        if (updateError) {
          return NextResponse.json(
            { error: `Gasto fijo creado, pero no se pudo actualizar clasificación: ${updateError.message}` },
            { status: 400 }
          );
        }

      } else {
        // Gastos variables van a la tabla expenses
        const { data: expense, error: expenseError } = await supabase
          .from("expenses")
          .insert({
            user_id: user.id,
            date: payload.date,
            merchant: merchantFromSource,
            amount: payload.amount,
            category,
            description,
            is_shared: false,
          })
          .select()
          .single();

        if (expenseError || !expense) {
          return NextResponse.json(
            { error: `Error al crear gasto: ${expenseError?.message || "sin detalle"}` },
            { status: 400 }
          );
        }

        createdRecord = expense as unknown as Record<string, unknown>;

        const { error: updateError } = await supabase
          .from("expense_classifications")
          .update({
            status: "manual_classified",
            manual_category: category,
            expense_id: expense.id,
          })
          .eq("id", id);

        if (updateError) {
          return NextResponse.json(
            { error: `Gasto creado, pero no se pudo actualizar clasificación: ${updateError.message}` },
            { status: 400 }
          );
        }
      }
    }

    if (payload.destination === "income") {
      const { data: income, error: incomeError } = await supabase
        .from("incomes")
        .insert({
          user_id: user.id,
          date: payload.date,
          amount: payload.amount,
          source: payload.source || "other",
          description,
        })
        .select()
        .single();

      if (incomeError || !income) {
        return NextResponse.json(
          { error: `Error al crear ingreso: ${incomeError?.message || "sin detalle"}` },
          { status: 400 }
        );
      }

      createdRecord = income as unknown as Record<string, unknown>;

      const { error: updateError } = await supabase
        .from("expense_classifications")
        .update({
          status: "manual_classified",
          manual_category: "Otros",
          expense_id: null,
        })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: `Ingreso creado, pero no se pudo actualizar clasificación: ${updateError.message}` },
          { status: 400 }
        );
      }
    }

    if (payload.destination === "installment") {
      const { data: installment, error: installmentError } = await supabase
        .from("installments")
        .insert({
          user_id: user.id,
          product_name: merchantFromSource,
          total_amount: payload.amount,
          num_installments: payload.num_installments,
          start_date: payload.date,
          current_installment: 1,
          is_active: true,
        })
        .select()
        .single();

      if (installmentError || !installment) {
        return NextResponse.json(
          { error: `Error al crear cuota: ${installmentError?.message || "sin detalle"}` },
          { status: 400 }
        );
      }

      createdRecord = installment as unknown as Record<string, unknown>;

      const { error: updateError } = await supabase
        .from("expense_classifications")
        .update({
          status: "manual_classified",
          manual_category: payload.category || classification.predicted_category || "Otros",
          expense_id: null,
        })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: `Cuota creada, pero no se pudo actualizar clasificación: ${updateError.message}` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        message: "Clasificación aprobada y convertida correctamente",
        destination: payload.destination,
        item: createdRecord,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[email/review/:id/approve][POST] unexpected error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

