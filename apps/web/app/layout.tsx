import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BimeBazar Performance Management",
  description: "Authentication scaffold for the BimeBazar performance platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
