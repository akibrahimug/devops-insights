import React, { PropsWithChildren } from "react";
import { ThemeProvider } from "@/components/Theme/theme-provider";
import { HeaderProvider } from "@/app/contexts/HeaderContext";

export function TestProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <HeaderProvider>{children}</HeaderProvider>
    </ThemeProvider>
  );
}
