import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chamadas",
  description: "Organize turmas, registre presenças e acompanhe resultados.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Chamadas",
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: "#153450",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
