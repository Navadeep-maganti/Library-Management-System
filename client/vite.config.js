import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  imo
const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = (env.VITE_API_URL).replace(/\/+$/, "");

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": apiBaseUrl,
      },
    },
  };
});
