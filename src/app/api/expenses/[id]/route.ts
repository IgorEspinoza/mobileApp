import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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
    const { data: expense, error: fetchError } = await supabase
      .from("expenses")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !expense) {
      return NextResponse.json(
        { error: "Gasto no encontrado" },
        { status: 404 }
      );
    }

    // Actualizar gasto
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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
    const { data: expense, error: fetchError } = await supabase
      .from("expenses")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !expense) {
      return NextResponse.json(
        { error: "Gasto no encontrado" },
        { status: 404 }
      );
    }

    // Eliminar gasto
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Error al eliminar gasto: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Gasto eliminado exitosamente" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Expense delete error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}


