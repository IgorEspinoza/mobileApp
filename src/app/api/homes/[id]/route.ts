import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
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

    // Get home with members
    const { data: home, error } = await supabase
      .from("homes")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !home) {
      return NextResponse.json({ error: "Hogar no encontrado" }, { status: 404 });
    }

    // Get members with user info
    const { data: members } = await supabase
      .from("home_members")
      .select("id, home_id, user_id, role, join_date, created_at")
      .eq("home_id", id);

    // Get user names for members
    const memberUserIds = members?.map((m) => m.user_id) ?? [];
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, email, avatar_url")
      .in("id", memberUserIds);

    const membersWithInfo = members?.map((m) => ({
      ...m,
      user: users?.find((u) => u.id === m.user_id) ?? null,
    }));

    return NextResponse.json({ ...home, members: membersWithInfo ?? [] });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

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

    // Check owner
    const { data: membership } = await supabase
      .from("home_members")
      .select("role")
      .eq("home_id", id)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Solo el dueño puede editar el hogar" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("homes")
      .update({
        name: body.name,
        description: body.description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    // Only creator can delete
    const { data: home } = await supabase
      .from("homes")
      .select("creator_id")
      .eq("id", id)
      .single();

    if (!home || home.creator_id !== user.id) {
      return NextResponse.json({ error: "Solo el creador puede eliminar el hogar" }, { status: 403 });
    }

    // Delete in order: shared_expenses -> home_members -> homes
    await supabase.from("shared_expenses").delete().eq("home_id", id);
    await supabase.from("home_members").delete().eq("home_id", id);
    const { error } = await supabase.from("homes").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
