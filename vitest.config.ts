import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    testTimeout: 30_000,
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.test.ts",
        "**/*.config.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@ordo": path.resolve(__dirname, "./src"),
      "@ordo/identity": path.resolve(__dirname, "./src/identity"),
      "@ordo/lifecycle": path.resolve(__dirname, "./src/lifecycle"),
      "@ordo/economic": path.resolve(__dirname, "./src/economic"),
      "@ordo/evolution": path.resolve(__dirname, "./src/evolution"),
      "@ordo/intelligence": path.resolve(__dirname, "./src/intelligence"),
      "@ordo/consciousness": path.resolve(__dirname, "./src/consciousness"),
      "@ordo/civilization": path.resolve(__dirname, "./src/civilization"),
      "@ordo/safety": path.resolve(__dirname, "./src/safety"),
      "@ordo/infrastructure": path.resolve(__dirname, "./src/infrastructure"),
    },
  },
});
