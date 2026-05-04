import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Simulador OAB",
  description: "Simulador da 1ª fase da OAB com importação de questões por JSON."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Navigation />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
