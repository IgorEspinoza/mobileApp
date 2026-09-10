import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { RegisterSchema } from "@/lib/validations/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = RegisterSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password, full_name } = validated.data;
    const supabase = await createServerClient();

    // 1. Crear usuario en Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });

    if (error) {
      const friendlyMessage =
        error.message === "User already registered"
          ? "Este email ya está registrado"
          : error.message;
      return NextResponse.json({ error: friendlyMessage }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: "No se pudo crear el usuario" }, { status: 400 });
    }

    // 2. Crear perfil en tabla users
    await supabase.from("users").insert({
      id: data.user.id,
      email,
      full_name,
      currency: "CLP",
      timezone: "America/Santiago",
      dark_mode: false,
    });

    return NextResponse.json(
      { user: { id: data.user.id, email: data.user.email }, message: "Usuario creado exitosamente" },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
