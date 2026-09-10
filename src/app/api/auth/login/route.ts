import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { LoginSchema } from "@/lib/validations/schemas";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = LoginSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validated.data.email,
      password: validated.data.password,
    });

    if (error) {
      const friendlyMessage =
        error.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos"
          : error.message;
      return NextResponse.json({ error: friendlyMessage }, { status: 401 });
    }

    return NextResponse.json(
      { user: { id: data.user.id, email: data.user.email } },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
