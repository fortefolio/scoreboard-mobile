import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  define: {
    __DEV__: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "react-native": "react-native-web",
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "tests/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: ["node_modules", ".expo", "dist"],
  },
});
