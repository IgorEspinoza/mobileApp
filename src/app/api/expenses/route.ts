import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { CreateExpenseSchema } from "@/lib/validations/schemas";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const category = searchParams.get("category");
    const isShared = searchParams.get("is_shared");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("expenses")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);
    if (category) query = query.eq("category", category);
    if (isShared !== null) query = query.eq("is_shared", isShared === "true");

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ expenses: data ?? [], total: count ?? 0, page, limit });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateExpenseSchema.safeParse(body);

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
      return NextResponse.json(
        { error: "Sin autenticación" },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: user.id,
        date: validated.data.date,
        merchant: validated.data.merchant,
        amount: validated.data.amount,
        category: validated.data.category,
        description: validated.data.description,
        is_shared: validated.data.is_shared,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Error al crear gasto: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Expense creation error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
