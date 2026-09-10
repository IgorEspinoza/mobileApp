import type { Metadata } from "next";
import { Providers } from "./providers";
import "../globals.css";

export const metadata: Metadata = {
  title: "MiDinero AI - Asistente Financiero Personal",
  description:
    "Controla tus gastos, ingresos y metas financieras con la ayuda de IA",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
