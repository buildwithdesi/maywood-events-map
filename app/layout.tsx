import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import { SITE_URL } from "@/lib/base-path";
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

const siteUrl = SITE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  alternates: { canonical: `${siteUrl}/` },
  title: "Maywood Events Map: Summer 2026 Archive",
  description:
    "A map of Maywood, Illinois events listed for summer 2026 (July to September), including Village Hall in the Park, festivals, cookouts, health fairs, back to school events, and Maywood Fest. These events have passed. Community-compiled listings, not an official Village of Maywood record.",
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
    title: "Maywood Events Map: Summer 2026 Archive",
    description:
      "Browse the Maywood summer 2026 events listed on this archive map. These events have passed.",
    url: siteUrl,
    siteName: "Maywood Events Map",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Maywood Events Map: Summer 2026 Archive",
    description:
      "Browse the Maywood summer 2026 events listed on this archive map. These events have passed.",
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
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('maywood-theme');var d=m==='dark'||(m!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-ink antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
