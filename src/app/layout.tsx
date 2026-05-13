import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Декларации и сертификаты соответствия",
  description: "Подача заявок на декларации и сертификаты соответствия ЕАЭС",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
