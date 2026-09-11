import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const EmailConfigSchema = z.object({
  email_address: z.string().email("Correo electrónico inválido"),
  provider: z.enum(["gmail", "outlook"]),
  app_password: z.string().min(4, "La contraseña o App Password es requerida"),
});

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: config, error } = await supabaseAdmin
      .from("email_imports")
      .select("id, email_address, provider, last_sync, is_active, created_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      configured: !!config,
      config: config || null,
    });
  } catch (err) {
    console.error("[email/config][GET] unexpected error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sin autenticación" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = EmailConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const { email_address, provider, app_password } = parsed.data;
    // Las contraseñas de aplicación de Google suelen copiarse con espacios ("abcd efgh ijkl mnop"). Los limpiamos:
    const cleanPassword = app_password.replace(/\s+/g, "");

    const supabaseAdmin = getSupabaseAdmin();

    // Comprobar si ya existe una importación para este usuario y correo
    const { data: existing } = await supabaseAdmin
      .from("email_imports")
      .select("id")
      .eq("user_id", user.id)
      .eq("email_address", email_address.toLowerCase().trim())
      .maybeSingle();

    if (existing?.id) {
      const { error: updateError } = await supabaseAdmin
        .from("email_imports")
        .update({
          provider,
          access_token: cleanPassword,
          is_active: true,
        })
        .eq("id", existing.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
    } else {
      // Desactivar importaciones anteriores si existieran
      await supabaseAdmin
        .from("email_imports")
        .update({ is_active: false })
        .eq("user_id", user.id);

      const { error: insertError } = await supabaseAdmin
        .from("email_imports")
        .insert({
          user_id: user.id,
          email_address: email_address.toLowerCase().trim(),
          provider,
          access_token: cleanPassword,
          is_active: true,
        });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Configuración de correo guardada correctamente",
    });
  } catch (err) {
    console.error("[email/config][POST] unexpected error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

