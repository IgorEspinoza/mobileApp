import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from("fixed_expenses")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Gasto fijo no encontrado" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("fixed_expenses")
      .update({
        category: body.category,
        amount: body.amount,
        month: body.month ?? null,
        description: body.description ?? null,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Error al actualizar gasto fijo: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Fixed expense update error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from("fixed_expenses")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Gasto fijo no encontrado" }, { status: 404 });
    }

    const { error } = await supabase
      .from("fixed_expenses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Error al eliminar gasto fijo: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Gasto fijo eliminado exitosamente" });
  } catch (err) {
    console.error("Fixed expense delete error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
