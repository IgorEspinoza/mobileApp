"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold">MiDinero AI</h1>
          <p className="text-xl text-muted-foreground">
            Asistente Financiero Personal Impulsado por IA
          </p>
        </div>

        <p className="text-lg max-w-md mx-auto text-muted-foreground">
          Controla tus gastos, ingresos, metas financieras y comparte gastos del
          hogar con inteligencia artificial
        </p>

        <div className="flex gap-4 justify-center pt-6">
          <Link
            href="/auth/login"
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/auth/register"
            className="px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:opacity-90 transition"
          >
            Registrarse
          </Link>
        </div>

        <div className="pt-12 space-y-4 text-sm text-muted-foreground">
          <p>🔐 Seguridad: Encriptación end-to-end</p>
          <p>🏠 Privado: Para ti y un amigo/a</p>
          <p>🤖 IA: Clasificación automática de gastos</p>
        </div>
      </div>
    </main>
  );
}

