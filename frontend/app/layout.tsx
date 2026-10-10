import type { Metadata } from "next";

import { themeInitScript } from "../features/theme/theme";
import { ThemeProvider } from "../features/theme/ThemeProvider";
import "./styles.css";

export const metadata: Metadata = {
  title: "学习轨迹",
  description: "Learn Everything 本地学习工作台",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
