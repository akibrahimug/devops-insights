import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname);

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.tsx"],
    css: false,
    include: ["**/*.{test,spec}.?(c|m)[jt]s?(x)"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "lib/**/*.{ts,tsx}",
      ],
      exclude: [
        "node_modules/**",
        ".next/**",
        "**/*.d.ts",
        "**/types/**",
        "**/dist/**",
        "**/coverage/**",
        "next.config.ts",
        "postcss.config.mjs",
        "tailwind.config.ts",
        "eslint.config.mjs",
        "vitest.config.*",
      ],
    },
  },
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${root}/` },
      { find: "@", replacement: `${root}` },
    ],
  },
});
