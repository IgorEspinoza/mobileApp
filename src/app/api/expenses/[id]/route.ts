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

    // Verificar que el gasto pertenece al usuario
    const { data: existing, error: fetchError } = await supabase
      .from("expenses")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Gasto no encontrado" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("expenses")
      .update({
        date: body.date,
        merchant: body.merchant,
        amount: body.amount,
        category: body.category,
        description: body.description,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Error al actualizar gasto: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Expense update error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Usar .select() para verificar que realmente se eliminó algo
    const { data: deleted, error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select();

    if (error) {
      console.error("Expense delete DB error:", error);
      return NextResponse.json(
        { error: "Error al eliminar gasto: " + error.message },
        { status: 400 }
      );
    }

    if (!deleted || deleted.length === 0) {
      console.error("Expense delete: no rows affected", { id, user_id: user.id });
      return NextResponse.json(
        { error: "No se encontró el gasto o no tienes permiso para eliminarlo" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Expense delete error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
