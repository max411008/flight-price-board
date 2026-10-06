import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "航價簿｜多航班歷史票價",
  description: "儲存想查詢的航班，比較已取得的歷史價格與最新查詢紀錄。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
