/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the project site under /<repo>/.
// The repo is leongeadon-create/schlachtfeld -> base "/schlachtfeld/".
// Override with BASE_PATH env var for other hosting targets.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/schlachtfeld/",
  plugins: [react()],
  test: {
    environment: "node",
    include: ["engine/**/*.test.ts"],
  },
});
