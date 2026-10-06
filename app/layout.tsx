import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AuraGen",
  description: "Self-Healing Generative UI via Cognitive Load",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
