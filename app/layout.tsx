import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "揪訂單｜簡單的團購訂餐",
  description: "建立訂購單、收集同事的餐點，立即統計總額。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
