import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "НоваСерт — декларации и сертификаты соответствия",
  description: "НоваСерт: подача заявок на декларации и сертификаты соответствия ЕАЭС",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header className="border-b border-border">
          <div className="mx-auto max-w-5xl px-6 py-3">
            <a href="/" className="text-lg font-semibold">
              НоваСерт
            </a>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
