import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { CreateFixedExpenseSchema } from "@/lib/validations/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // format: YYYY-MM-DD (first of month)
    const homeId = searchParams.get("home_id");

    let query = supabase
      .from("fixed_expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (month) {
      query = query.eq("month", month);
    }

    if (homeId) {
      query = query.eq("home_id", homeId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ fixed_expenses: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateFixedExpenseSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0]?.message || "Validación fallida" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    // Check for duplicate (same category + month)
    if (validated.data.month) {
      const { data: existing } = await supabase
        .from("fixed_expenses")
        .select("id")
        .eq("user_id", user.id)
        .eq("category", validated.data.category)
        .eq("month", validated.data.month)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: `Ya existe un registro de ${validated.data.category} para este mes` },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from("fixed_expenses")
      .insert({
        user_id: user.id,
        home_id: validated.data.home_id ?? null,
        category: validated.data.category,
        amount: validated.data.amount,
        frequency: "monthly",
        month: validated.data.month,
        start_date: validated.data.month,
        is_active: true,
        description: validated.data.description ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Error al crear gasto fijo: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Fixed expense creation error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
