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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from("installments")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("installments")
      .update({
        product_name: body.product_name,
        total_amount: body.total_amount,
        num_installments: body.num_installments,
        start_date: body.start_date,
        current_installment: body.current_installment ?? 1,
        is_active: body.is_active ?? true,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Error al actualizar cuota: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Installment update error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from("installments")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Cuota no encontrada" }, { status: 404 });
    }

    const { error } = await supabase
      .from("installments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Error al eliminar cuota: " + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Cuota eliminada exitosamente" }, { status: 200 });
  } catch (err) {
    console.error("Installment delete error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

