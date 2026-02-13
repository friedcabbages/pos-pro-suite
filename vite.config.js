import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 3000,
    allowedHosts: "all",
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },

  build: {
    sourcemap: false,
  },

  optimizeDeps: {
    exclude: ["lucide-react"],
  },

  logLevel: "info",
}));
