import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let startDate = startOfMonth.toISOString().split("T")[0];
    let endDate = endOfMonth.toISOString().split("T")[0];
    let monthLabel = now.toLocaleDateString("es-CL", {
      year: "numeric",
      month: "long",
    });

    // 1. Obtener ingresos del periodo
    let { data: incomesData } = await supabase
      .from("incomes")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate);

    // 2. Obtener gastos personales del periodo (excluir gastos fijos tipo "Gastos Comunes" etc.)
    let { data: expensesData } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_shared", false)
      .gte("date", startDate)
      .lte("date", endDate);

    let incomes = incomesData ?? [];
    let expenses = expensesData ?? [];

    // Si no hay datos este mes, buscar el mes más reciente con datos
    if (incomes.length === 0 && expenses.length === 0) {
      const { data: latestExpense } = await supabase
        .from("expenses")
        .select("date")
        .eq("user_id", user.id)
        .eq("is_shared", false)
        .order("date", { ascending: false })
        .limit(1);

      const { data: latestIncome } = await supabase
        .from("incomes")
        .select("date")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1);

      const dates: Date[] = [];
      if (latestExpense?.[0]?.date) dates.push(new Date(latestExpense[0].date));
      if (latestIncome?.[0]?.date) dates.push(new Date(latestIncome[0].date));

      if (dates.length > 0) {
        const mostRecent = dates.sort((a, b) => b.getTime() - a.getTime())[0];
        const altStart = new Date(mostRecent.getFullYear(), mostRecent.getMonth(), 1);
        const altEnd = new Date(mostRecent.getFullYear(), mostRecent.getMonth() + 1, 0);

        startDate = altStart.toISOString().split("T")[0];
        endDate = altEnd.toISOString().split("T")[0];
        monthLabel = mostRecent.toLocaleDateString("es-CL", {
          year: "numeric",
          month: "long",
        });

        const { data: altIncomes } = await supabase
          .from("incomes")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", startDate)
          .lte("date", endDate);

        const { data: altExpenses } = await supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_shared", false)
          .gte("date", startDate)
          .lte("date", endDate);

        incomes = altIncomes ?? [];
        expenses = altExpenses ?? [];
      }
    }

    const totalIncomes = incomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    // 3. Obtener gastos fijos del mes
    const displayMonthFirst = startDate; // first of the displayed month
    const { data: fixedExpensesData } = await supabase
      .from("fixed_expenses")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", displayMonthFirst);

    const fixedExpenses = fixedExpensesData ?? [];
    const totalFixed = fixedExpenses.reduce((sum, fe) => sum + (fe.amount || 0), 0);

    // Total real del mes = gastos variables + gastos fijos
    const totalAllExpenses = totalExpenses + totalFixed;
    const savings = totalIncomes - totalAllExpenses;

    // --- Totales acumulados (todas las fechas) ---
    const { data: allIncomesData } = await supabase
      .from("incomes")
      .select("amount")
      .eq("user_id", user.id);

    const { data: allExpensesData } = await supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", user.id)
      .eq("is_shared", false);

    const { data: allFixedData } = await supabase
      .from("fixed_expenses")
      .select("amount")
      .eq("user_id", user.id);

    const accumulatedIncomes = (allIncomesData ?? []).reduce(
      (sum, inc) => sum + (inc.amount || 0),
      0
    );
    const accumulatedExpenses = (allExpensesData ?? []).reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0
    );
    const accumulatedFixed = (allFixedData ?? []).reduce(
      (sum, fe) => sum + (fe.amount || 0),
      0
    );

    return NextResponse.json(
      {
        month: monthLabel,
        incomes: totalIncomes,
        expenses: totalExpenses,
        fixedExpenses: totalFixed,
        totalExpenses: totalAllExpenses,
        savings,
        freeBalance: savings,
        accumulated: {
          incomes: accumulatedIncomes,
          expenses: accumulatedExpenses + accumulatedFixed,
          balance: accumulatedIncomes - accumulatedExpenses - accumulatedFixed,
        },
        data: {
          incomeCount: incomes.length,
          expenseCount: expenses.length,
          fixedExpenseCount: fixedExpenses.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return NextResponse.json(
      { error: "Error al obtener resumen del dashboard" },
      { status: 500 }
    );
  }
}
