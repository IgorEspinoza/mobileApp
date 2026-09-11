import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Marca una clasificacion como rechazada desde la bandeja manual.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    // Verifica pertenencia por la relacion con email_imports.user_id
    const { data: ownedClassification, error: ownedError } = await supabase
      .from("expense_classifications")
      .select("id, email_imports!inner(user_id)")
      .eq("id", id)
      .eq("email_imports.user_id", user.id)
      .single();

    if (ownedError || !ownedClassification) {
      return NextResponse.json(
        { error: "Clasificación no encontrada" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("expense_classifications")
      .update({ status: "rejected" })
      .eq("id", id)
      .select("id, status")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Clasificación rechazada", item: data },
      { status: 200 }
    );
  } catch (err) {
    console.error("[email/review/:id/reject][POST] unexpected error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

