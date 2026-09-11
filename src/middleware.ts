import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnvAnonKey, getSupabaseEnvUrl } from "@/lib/supabase/env";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/reset-password",
];

// Rutas que deben responder siempre, con o sin sesion
// (callback de OAuth y cambio de password via email)
const ALWAYS_ALLOWED = ["/auth/callback", "/update-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  if (ALWAYS_ALLOWED.some((route) => pathname.startsWith(route))) {
    return response;
  }

  const supabase = createServerClient(
    getSupabaseEnvUrl(),
    getSupabaseEnvAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refrescar sesión (IMPORTANTE: no desechar el resultado)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Sin sesión y ruta protegida → login
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Con sesión en auth pages → dashboard
  if (session && isPublicRoute && pathname !== "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
