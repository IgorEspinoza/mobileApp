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

    // 2. Asegurar el perfil en la tabla users.
    //    El trigger `on_auth_user_created` (migracion 004) ya lo crea; este
    //    upsert es solo una red de seguridad y no debe romper el registro.
    const { error: profileError } = await supabase.from("users").upsert(
      {
        id: data.user.id,
        email,
        full_name,
        currency: "CLP",
        timezone: "America/Santiago",
        dark_mode: false,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      // Habitual cuando el registro requiere confirmacion de email: aun no hay
      // sesion, por lo que RLS rechaza el upsert. El trigger ya cubre el caso.
      console.warn("[register] profile upsert omitido:", profileError.message);
    }

    return NextResponse.json(
      { user: { id: data.user.id, email: data.user.email }, message: "Usuario creado exitosamente" },
      { status: 201 }
    );
  } catch (err) {
    console.error("[register] unexpected error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

