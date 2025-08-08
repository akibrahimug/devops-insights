import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WebSocketProvider } from "@/app/contexts/WebSocketContext";
import { ThemeProvider } from "@/components/Theme/providers";
const inter = Inter({ subsets: ["latin"] });

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
        <WebSocketProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </WebSocketProvider>
      </body>
    </html>
  );
}
