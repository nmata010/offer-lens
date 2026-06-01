import path from "node:path"
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1]
const isUserPagesRepo = repoName?.endsWith(".github.io")
const base =
  process.env.GITHUB_ACTIONS && repoName && !isUserPagesRepo
    ? `/${repoName}/`
    : "/"

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
})
