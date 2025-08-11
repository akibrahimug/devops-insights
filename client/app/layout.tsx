import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WebSocketProvider } from "@/app/contexts/WebSocketContext";
import { HeaderProvider } from "@/app/contexts/HeaderContext";
import HeaderMount from "@/components/layout/HeaderMount";
import { ThemeProvider } from "@/components/Theme/theme-provider";
const inter = Inter({ subsets: ["latin"] });

/**
 * Layout: RootLayout
 * Global providers (theme, websocket, header) and top-level structure.
 */

export const metadata: Metadata = {
  title: "DevOps Insights Dashboard",
  description:
    "Real-time monitoring dashboard for DevOps metrics across global regions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <WebSocketProvider>
            <HeaderProvider>
              <HeaderMount />
              <main className="max-w-7xl mx-auto px-0 sm:px-6 pb-10">
                {children}
              </main>
            </HeaderProvider>
          </WebSocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
