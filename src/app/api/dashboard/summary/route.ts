import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerClient();

    // Obtener usuario actual
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    // Obtener el primer y último día del mes actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const startDate = startOfMonth.toISOString().split("T")[0];
    const endDate = endOfMonth.toISOString().split("T")[0];

    // 1. Obtener ingresos del mes
    const { data: incomesData } = await supabase
      .from("incomes")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate);

    const incomes = incomesData ?? [];

    const totalIncomes = incomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);

    // 2. Obtener gastos personales del mes
    const { data: expensesData } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_shared", false)
      .gte("date", startDate)
      .lte("date", endDate);

    const expenses = expensesData ?? [];

    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0
    );

    // 3. Calcular ahorro (ingresos - gastos)
    const savings = totalIncomes - totalExpenses;

    // 4. Saldo libre (ingresos - gastos)
    const freeBalance = totalIncomes - totalExpenses;

    return NextResponse.json(
      {
        month: now.toLocaleDateString("es-CL", {
          year: "numeric",
          month: "long",
        }),
        incomes: totalIncomes,
        expenses: totalExpenses,
        savings,
        freeBalance,
        data: {
          incomeCount: incomes.length,
          expenseCount: expenses.length,
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


