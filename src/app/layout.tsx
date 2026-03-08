import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Whole-Tel | All-Inclusive Group Hotels",
    template: "%s | Whole-Tel",
  },
  description: "Book hand-picked all-inclusive hotels for group travel in Cabo, Puerto Vallarta, and Miami. One booking, one crew, one unforgettable trip.",
  openGraph: {
    title: "Whole-Tel | All-Inclusive Group Hotels",
    description: "Hand-picked all-inclusive hotels with curated experiences for unforgettable group trips.",
    siteName: "Whole-Tel",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
