import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { CreateHomeSchema } from "@/lib/validations/schemas";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    // Get homes where user is a member
    const { data: memberships, error: memberError } = await supabase
      .from("home_members")
      .select("home_id")
      .eq("user_id", user.id);

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 400 });
    }

    const homeIds = memberships?.map((m) => m.home_id) ?? [];

    if (homeIds.length === 0) {
      return NextResponse.json({ homes: [] });
    }

    const { data: homes, error } = await supabase
      .from("homes")
      .select("*")
      .in("id", homeIds)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ homes: homes ?? [] });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateHomeSchema.safeParse(body);

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

    // Create home
    const { data: home, error: homeError } = await supabase
      .from("homes")
      .insert({
        creator_id: user.id,
        name: validated.data.name,
        description: validated.data.description,
        currency: validated.data.currency,
      })
      .select()
      .single();

    if (homeError) {
      return NextResponse.json({ error: "Error al crear hogar: " + homeError.message }, { status: 400 });
    }

    // Add creator as owner member
    const { error: memberError } = await supabase
      .from("home_members")
      .insert({
        home_id: home.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) {
      // Rollback home creation
      await supabase.from("homes").delete().eq("id", home.id);
      return NextResponse.json({ error: "Error al crear miembro: " + memberError.message }, { status: 400 });
    }

    return NextResponse.json(home, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
