import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "内容监控工具原型",
  description: "用于内容分类监控、AI 选题分析与监控配置的前端原型页面"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
