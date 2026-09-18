import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const sans = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
});

const heading = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JEP Lyon 2026 — lieux gratuits sur la carte",
  description:
    "Carte des lieux gratuits des Journées européennes du patrimoine à Lyon, 19 et 20 septembre 2026 : affluence estimée, intérêt patrimonial, ouvertures exceptionnelles.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${sans.variable} ${heading.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
