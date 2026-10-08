import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url))).replace(/\\/g, "/")

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: `${root}/` }],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
})
