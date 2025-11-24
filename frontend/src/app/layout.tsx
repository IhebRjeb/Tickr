import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tickr - Billetterie en Ligne",
  description: "Réservez vos billets pour les meilleurs événements en Tunisie",
  keywords: ["billetterie", "événements", "tickets", "concerts", "spectacles", "Tunisie"],
  authors: [{ name: "Tickr Team" }],
  openGraph: {
    title: "Tickr - Billetterie en Ligne",
    description: "Réservez vos billets pour les meilleurs événements en Tunisie",
    url: "https://tickr.tn",
    siteName: "Tickr",
    locale: "fr_TN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tickr - Billetterie en Ligne",
    description: "Réservez vos billets pour les meilleurs événements en Tunisie",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
