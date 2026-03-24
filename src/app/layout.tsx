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
    default: "Whole-Tel | Custom-Inclusive Group Getaways",
    template: "%s | Whole-Tel",
  },
  description: "Book hand-picked Custom-Inclusive villas for group travel in Cabo and Puerto Vallarta. One booking, one crew, one unforgettable trip.",
  openGraph: {
    title: "Whole-Tel | Custom-Inclusive Group Getaways",
    description: "Hand-picked Custom-Inclusive villas with curated experiences for unforgettable group trips.",
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
