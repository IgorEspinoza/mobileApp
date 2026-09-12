import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Lista clasificaciones pendientes para revision manual.
 *
 * NOTA: se filtra por `email_imports.user_id` para mantener compatibilidad con
 * el esquema actual, incluso antes de aplicar la migracion 005.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "20", 10), 100);
    const page = Math.max(Number.parseInt(searchParams.get("page") || "1", 10), 1);
    const status = searchParams.get("status") || "pending";
    const q = (searchParams.get("q") || "").trim();
    const offset = (page - 1) * limit;

    // Columnas base (esquema 001) y columnas añadidas por la migracion 005.
    // Si 005 no esta aplicada, la consulta completa falla y reintentamos con
    // el set minimo para no dejar la pantalla vacia.
    const BASE_COLUMNS = `
        id,
        email_import_id,
        subject,
        body_snippet,
        merchant,
        predicted_category,
        manual_category,
        confidence,
        status,
        expense_id,
        created_at,
        email_imports!inner (
          email_address,
          provider,
          user_id
        )
      `;

    const EXTENDED_COLUMNS = `
        id,
        email_import_id,
        subject,
        body_snippet,
        merchant,
        predicted_category,
        manual_category,
        confidence,
        status,
        expense_id,
        created_at,
        amount,
        currency,
        transaction_date,
        detected_type,
        num_installments,
        source,
        from_address,
        email_imports!inner (
          email_address,
          provider,
          user_id
        )
      `;

    const runQuery = async (columns: string) => {
      let query = supabase
        .from("expense_classifications")
        .select(columns, { count: "exact" })
        .eq("email_imports.user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (status !== "all") {
        query = query.eq("status", status);
      }

      if (q) {
        query = query.or(`subject.ilike.%${q}%,merchant.ilike.%${q}%`);
      }

      return query;
    };

    let { data, error, count } = await runQuery(EXTENDED_COLUMNS);

    if (error && /column .* does not exist|schema cache/i.test(error.message)) {
      ({ data, error, count } = await runQuery(BASE_COLUMNS));
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      items: data ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    console.error("[email/review][GET] unexpected error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

