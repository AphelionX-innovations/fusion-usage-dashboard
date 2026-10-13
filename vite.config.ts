import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      port: 5180,
      proxy: {
        "/auth-api": {
          target: env.AUTH_API_PROXY ?? "http://localhost:3001",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/auth-api/, ""),
        },
        "/fusion-api": {
          target: env.FUSION_API_PROXY ?? "http://localhost:3000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/fusion-api/, ""),
        },
      },
    },
  };
});
