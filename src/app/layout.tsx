import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#05070E",
};

export const metadata: Metadata = {
  title: "Préparation Entretien Campus France | Simulation IA Vocale Personnalisée",
  description:
    "Outil d'entraînement pédagogique indépendant pour réussir votre entretien Campus France grâce à une simulation vocale avec IA adaptative et bilan personnalisé.",
};

import { WhatsAppHelpButton } from "@/components/navigation/WhatsAppHelpButton";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-[#05070E] text-slate-100 selection:bg-[#0066FF]/30 selection:text-white`}
      >
        <LanguageProvider>
          {children}
          <WhatsAppHelpButton />
        </LanguageProvider>
      </body>
    </html>
  );
}
