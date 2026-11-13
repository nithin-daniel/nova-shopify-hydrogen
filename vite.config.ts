import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Load `.env` files into `process.env` for server code (loaders, middleware,
  // Hydrogen handlers). Vite only exposes `VITE_*` variables to the browser, so
  // nothing here leaks into client bundles. Real environment variables win.
  const fileEnv = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(fileEnv)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    plugins: [tailwindcss(), reactRouter()],
    resolve: { tsconfigPaths: true },
  };
});
