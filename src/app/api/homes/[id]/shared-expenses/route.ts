import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { CreateSharedExpenseSchema } from "@/lib/validations/schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    // Check membership
    const { data: membership } = await supabase
      .from("home_members")
      .select("role")
      .eq("home_id", id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No eres miembro de este hogar" }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let query = supabase
      .from("shared_expenses")
      .select("*")
      .eq("home_id", id)
      .order("date", { ascending: false });

    if (from) query = query.gte("date", from);
    if (to) query = query.lte("date", to);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ expenses: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = CreateSharedExpenseSchema.safeParse(body);

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

    // Check membership
    const { data: membership } = await supabase
      .from("home_members")
      .select("role")
      .eq("home_id", id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "No eres miembro de este hogar" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("shared_expenses")
      .insert({
        home_id: id,
        created_by: user.id,
        date: validated.data.date,
        merchant: validated.data.merchant,
        amount: validated.data.amount,
        category: validated.data.category,
        split_type: validated.data.split_type,
        splits: validated.data.splits,
        description: validated.data.description,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Error al crear gasto compartido: " + error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
