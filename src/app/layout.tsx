import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "AI ESG 报告生成与合规校验平台",
  description: "上传企业资料，自动生成 ESG 披露清单、报告初稿、风险校验和指标索引表。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
