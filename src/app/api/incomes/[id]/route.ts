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

    // Verificar que el ingreso pertenece al usuario
    const { data: income, error: fetchError } = await supabase
      .from("incomes")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !income) {
      return NextResponse.json(
        { error: "Ingreso no encontrado" },
        { status: 404 }
      );
    }

    // Actualizar ingreso
    const { data, error } = await supabase
      .from("incomes")
      .update({
        date: body.date,
        amount: body.amount,
        source: body.source,
        description: body.description,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Error al actualizar ingreso: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Income update error:", err);
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

    // Verificar que el ingreso pertenece al usuario
    const { data: income, error: fetchError } = await supabase
      .from("incomes")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !income) {
      return NextResponse.json(
        { error: "Ingreso no encontrado" },
        { status: 404 }
      );
    }

    // Usar .select() para verificar que realmente se eliminó algo
    const { data: deleted, error } = await supabase
      .from("incomes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select();

    if (error) {
      console.error("Income delete DB error:", error);
      return NextResponse.json(
        { error: "Error al eliminar ingreso: " + error.message },
        { status: 400 }
      );
    }

    if (!deleted || deleted.length === 0) {
      console.error("Income delete: no rows affected", { id, user_id: user.id });
      return NextResponse.json(
        { error: "No se encontró el ingreso o no tienes permiso para eliminarlo" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Ingreso eliminado exitosamente" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Income delete error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}


