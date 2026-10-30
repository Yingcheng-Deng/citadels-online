import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Citadels · 远方的城",
  description: "一张圆桌，几位老友。无论相隔多远，一起建造你的城。",
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
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
