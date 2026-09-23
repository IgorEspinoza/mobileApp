import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    const limit = request.nextUrl.searchParams.get("limit") || "5";
    const limitNum = Math.min(parseInt(limit), 50); // Max 50

    // Obtener últimos ingresos
    const { data: incomesData } = await supabase
      .from("incomes")
      .select("id, date, amount, source, description")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(limitNum);

    const incomes = incomesData ?? [];

    const incomeTransactions = incomes.map((inc) => ({
      id: inc.id,
      date: inc.date,
      merchant: inc.source || "Ingreso",
      amount: inc.amount,
      category: inc.source || "other",
      type: "income" as const,
      description: inc.description,
    }));

    // Obtener últimos gastos
    const { data: expensesData } = await supabase
      .from("expenses")
      .select("id, date, merchant, amount, category, description")
      .eq("user_id", user.id)
      .eq("is_shared", false)
      .order("date", { ascending: false })
      .limit(limitNum);

    const expenses = expensesData ?? [];

    const expenseTransactions = expenses.map((exp) => ({
      id: exp.id,
      date: exp.date,
      merchant: exp.merchant,
      amount: exp.amount,
      category: exp.category,
      type: "expense" as const,
      description: exp.description,
    }));

    // Combinar y ordenar por fecha descendente
    const allTransactions = [...incomeTransactions, ...expenseTransactions]
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .slice(0, limitNum);

    return NextResponse.json(
      { transactions: allTransactions, count: allTransactions.length },
      { status: 200 }
    );
  } catch (error) {
    console.error("Recent transactions error:", error);
    return NextResponse.json(
      { error: "Error al obtener transacciones recientes" },
      { status: 500 }
    );
  }
}


