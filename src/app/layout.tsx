import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";
import { AuthProvider } from "@/lib/auth/auth-provider";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-archivo",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

// Meter readout face — use only for the live uptime % and the status
// duration counter. See docs/design-system.md section 3.
const dseg7 = localFont({
  src: [
    { path: "./fonts/DSEG7Classic-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/DSEG7Classic-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-dseg7",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nigeria Electricity Tracker",
  description:
    "Crowdsourced tracking of electricity availability across Nigerian states and LGAs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable} ${dseg7.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
