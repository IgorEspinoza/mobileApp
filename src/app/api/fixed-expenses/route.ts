import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { CreateFixedExpenseSchema } from "@/lib/validations/schemas";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("fixed_expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

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

    const { data, error } = await supabase
      .from("fixed_expenses")
      .insert({
        user_id: user.id,
        category: validated.data.category,
        amount: validated.data.amount,
        frequency: validated.data.frequency,
        start_date: validated.data.start_date,
        end_date: validated.data.end_date ?? null,
        description: validated.data.description ?? null,
        is_active: true,
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

