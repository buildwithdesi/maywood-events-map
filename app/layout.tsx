import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const siteUrl = "https://maywood-events-map.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Maywood Summer 2026 Events Map",
  description:
    "An interactive map of Maywood, Illinois summer 2026 events. Village Hall in the Park, festivals, cookouts, health fairs, back to school bashes, and Maywood Fest. Filter by date and find what is happening near you.",
  keywords: [
    "Maywood",
    "Maywood Illinois",
    "Maywood events",
    "Maywood Fest 2026",
    "Village of Maywood",
    "Proviso",
    "summer events",
    "community events map",
  ],
  authors: [{ name: "Digital Alchemy Software" }],
  openGraph: {
    title: "Maywood Summer 2026 Events Map",
    description:
      "Find every Maywood summer 2026 event on one interactive map. Filter by date and category.",
    url: siteUrl,
    siteName: "Maywood Events Map",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Maywood Summer 2026 Events Map",
    description:
      "Find every Maywood summer 2026 event on one interactive map. Filter by date and category.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
