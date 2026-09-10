import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { CreateIncomeSchema } from "@/lib/validations/schemas";

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
    const offset = (page - 1) * limit;

    let query = supabase
      .from("incomes")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ incomes: data ?? [], total: count ?? 0, page, limit });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateIncomeSchema.safeParse(body);

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
      .from("incomes")
      .insert({
        user_id: user.id,
        date: validated.data.date,
        amount: validated.data.amount,
        source: validated.data.source,
        description: validated.data.description,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Error al crear ingreso: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Income creation error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
