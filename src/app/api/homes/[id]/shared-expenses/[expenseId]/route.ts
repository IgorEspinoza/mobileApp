import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { CreateSharedExpenseSchema } from "@/lib/validations/schemas";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id, expenseId } = await params;
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
      .update({
        date: validated.data.date,
        merchant: validated.data.merchant,
        amount: validated.data.amount,
        category: validated.data.category,
        split_type: validated.data.split_type,
        splits: validated.data.splits,
        description: validated.data.description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", expenseId)
      .eq("home_id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id, expenseId } = await params;
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

    const { error } = await supabase
      .from("shared_expenses")
      .delete()
      .eq("id", expenseId)
      .eq("home_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
