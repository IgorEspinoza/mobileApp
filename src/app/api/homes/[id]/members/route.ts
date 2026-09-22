import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { InviteToHomeSchema } from "@/lib/validations/schemas";

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

    const { data: members, error } = await supabase
      .from("home_members")
      .select("id, user_id, role, join_date, created_at")
      .eq("home_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Get user info
    const userIds = members?.map((m) => m.user_id) ?? [];
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, email, avatar_url")
      .in("id", userIds);

    const membersWithInfo = members?.map((m) => ({
      ...m,
      user: users?.find((u) => u.id === m.user_id) ?? null,
    }));

    return NextResponse.json({ members: membersWithInfo ?? [] });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = InviteToHomeSchema.safeParse(body);

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

    // Check if inviter is owner
    const { data: membership } = await supabase
      .from("home_members")
      .select("role")
      .eq("home_id", id)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Solo el dueño puede invitar miembros" }, { status: 403 });
    }

    // Find user by email
    const { data: invitedUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", validated.data.email)
      .single();

    if (!invitedUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado. Debe estar registrado en MiDinero AI." },
        { status: 404 }
      );
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("home_members")
      .select("id")
      .eq("home_id", id)
      .eq("user_id", invitedUser.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: "El usuario ya es miembro de este hogar" }, { status: 409 });
    }

    // Add member
    const { data, error } = await supabase
      .from("home_members")
      .insert({
        home_id: id,
        user_id: invitedUser.id,
        role: validated.data.role || "member",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json({ error: "memberId es requerido" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    // Check if requester is owner
    const { data: membership } = await supabase
      .from("home_members")
      .select("role")
      .eq("home_id", id)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Solo el dueño puede remover miembros" }, { status: 403 });
    }

    // Cannot remove yourself as owner
    const { data: targetMember } = await supabase
      .from("home_members")
      .select("user_id, role")
      .eq("id", memberId)
      .single();

    if (targetMember?.user_id === user.id) {
      return NextResponse.json({ error: "No puedes removerte a ti mismo" }, { status: 400 });
    }

    const { error } = await supabase
      .from("home_members")
      .delete()
      .eq("id", memberId)
      .eq("home_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
