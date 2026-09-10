import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type InstallmentRow = {
  id: string;
  user_id: string;
  product_name: string;
  total_amount: number;
  num_installments: number;
  start_date: string;
  current_installment: number;
  is_active: boolean;
};

type InstallmentChargeRow = {
  id: string;
  expense_id: string | null;
};

const toUtcDateOnly = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const addMonthsClamped = (baseDate: Date, months: number) => {
  const year = baseDate.getUTCFullYear();
  const month = baseDate.getUTCMonth() + months;
  const day = baseDate.getUTCDate();

  const firstDayTargetMonth = new Date(Date.UTC(year, month, 1));
  const lastDayTargetMonth = new Date(
    Date.UTC(
      firstDayTargetMonth.getUTCFullYear(),
      firstDayTargetMonth.getUTCMonth() + 1,
      0
    )
  ).getUTCDate();

  return new Date(
    Date.UTC(
      firstDayTargetMonth.getUTCFullYear(),
      firstDayTargetMonth.getUTCMonth(),
      Math.min(day, lastDayTargetMonth)
    )
  );
};

const getInstallmentAmount = (
  totalAmount: number,
  installmentNumber: number,
  numInstallments: number
) => {
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / numInstallments);
  const remainderCents = totalCents - baseCents * numInstallments;
  const cents = installmentNumber === numInstallments ? baseCents + remainderCents : baseCents;
  return cents / 100;
};

const isCronAuthorized = (request: NextRequest) => {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) return false;

  const authHeader = request.headers.get("authorization") || "";
  return authHeader === `Bearer ${expectedSecret}`;
};

const parseRunDate = (value: string | null) => {
  if (!value) return toUtcDateOnly(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const parsed = toUtcDateOnly(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const isUniqueViolation = (error: unknown) => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    String((error as { code?: string }).code) === "23505"
  );
};

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const runDateParam = request.nextUrl.searchParams.get("date");
  const today = parseRunDate(runDateParam);
  const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";

  if (!today) {
    return NextResponse.json(
      { error: "Parámetro date inválido. Usa formato YYYY-MM-DD." },
      { status: 400 }
    );
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: installments, error } = await supabaseAdmin
      .from("installments")
      .select("id, user_id, product_name, total_amount, num_installments, start_date, current_installment, is_active")
      .eq("is_active", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const rows = (installments ?? []) as InstallmentRow[];

    let generatedCharges = 0;
    let createdExpenses = 0;
    let updatedInstallments = 0;
    const errors: string[] = [];

    for (const installment of rows) {
      const startDate = toUtcDateOnly(installment.start_date);
      let nextInstallmentNumber = Math.max(installment.current_installment, 1);
      let hadChanges = false;

      while (nextInstallmentNumber <= installment.num_installments) {
        const dueDate = addMonthsClamped(startDate, nextInstallmentNumber - 1);
        if (dueDate > today) break;

        const amount = getInstallmentAmount(
          installment.total_amount,
          nextInstallmentNumber,
          installment.num_installments
        );
        const dueDateValue = dueDate.toISOString().slice(0, 10);

        try {
          const { data: existingCharge, error: existingChargeError } = await supabaseAdmin
            .from("installment_charges")
            .select("id, expense_id")
            .eq("installment_id", installment.id)
            .eq("installment_number", nextInstallmentNumber)
            .maybeSingle<InstallmentChargeRow>();

          if (existingChargeError) {
            throw new Error(existingChargeError.message);
          }

          if (existingCharge?.expense_id) {
            nextInstallmentNumber += 1;
            hadChanges = true;
            continue;
          }

          if (dryRun) {
            generatedCharges += 1;
            nextInstallmentNumber += 1;
            hadChanges = true;
            continue;
          }

          let chargeId = existingCharge?.id ?? null;

          if (!chargeId) {
            const { data: createdCharge, error: createChargeError } = await supabaseAdmin
              .from("installment_charges")
              .insert({
                installment_id: installment.id,
                user_id: installment.user_id,
                installment_number: nextInstallmentNumber,
                charge_date: dueDateValue,
                amount,
                expense_id: null,
              })
              .select("id")
              .single<{ id: string }>();

            if (createChargeError && !isUniqueViolation(createChargeError)) {
              throw new Error(createChargeError.message);
            }

            if (createdCharge?.id) {
              chargeId = createdCharge.id;
            } else {
              const { data: racedCharge, error: racedChargeError } = await supabaseAdmin
                .from("installment_charges")
                .select("id, expense_id")
                .eq("installment_id", installment.id)
                .eq("installment_number", nextInstallmentNumber)
                .maybeSingle<InstallmentChargeRow>();

              if (racedChargeError) {
                throw new Error(racedChargeError.message);
              }

              if (racedCharge?.expense_id) {
                nextInstallmentNumber += 1;
                hadChanges = true;
                continue;
              }

              chargeId = racedCharge?.id ?? null;
            }
          }

          if (!chargeId) {
            throw new Error("No fue posible reservar el cargo de cuota");
          }

          const { data: expense, error: expenseError } = await supabaseAdmin
            .from("expenses")
            .insert({
              user_id: installment.user_id,
              date: dueDateValue,
              merchant: installment.product_name,
              amount,
              category: "Otros",
              description: `Cuota ${nextInstallmentNumber}/${installment.num_installments} - ${installment.product_name}`,
              is_shared: false,
            })
            .select("id")
            .single<{ id: string }>();

          if (expenseError) {
            throw new Error(expenseError.message);
          }

          const { data: linkedCharge, error: linkError } = await supabaseAdmin
            .from("installment_charges")
            .update({ expense_id: expense.id })
            .eq("id", chargeId)
            .is("expense_id", null)
            .select("id")
            .maybeSingle<{ id: string }>();

          if (linkError || !linkedCharge) {
            await supabaseAdmin.from("expenses").delete().eq("id", expense.id);
            throw new Error(linkError?.message || "No fue posible enlazar el gasto al cargo");
          }

          createdExpenses += 1;
          generatedCharges += 1;
          nextInstallmentNumber += 1;
          hadChanges = true;
        } catch (error) {
          errors.push(
            `[${installment.id}] cuota ${nextInstallmentNumber}: ${
              error instanceof Error ? error.message : "error desconocido"
            }`
          );
          break;
        }
      }

      if (!dryRun && hadChanges) {
        const isStillActive = nextInstallmentNumber <= installment.num_installments;

        const { error: updateError } = await supabaseAdmin
          .from("installments")
          .update({
            current_installment: nextInstallmentNumber,
            is_active: isStillActive,
          })
          .eq("id", installment.id)
          .eq("user_id", installment.user_id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        updatedInstallments += 1;
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      dry_run: dryRun,
      processed_at: today.toISOString().slice(0, 10),
      totals: {
        active_installments: rows.length,
        updated_installments: updatedInstallments,
        generated_charges: generatedCharges,
        created_expenses: createdExpenses,
      },
      errors,
    });
  } catch (err) {
    console.error("Installments cron generation error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}



