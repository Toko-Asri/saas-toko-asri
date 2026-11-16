import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Toko Asri — SaaS ERP, SCM & CRM",
  description:
    "Aplikasi terintegrasi ERP, SCM, dan CRM untuk Toko Asri (retail frozen food).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
