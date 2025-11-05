// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT:
// - If your GitHub repo is named "hallucination-guard", keep base as-is.
// - If you choose a different repo name, change the string below to "/YourRepoName/".
export default defineConfig({
  plugins: [react()],
  base: "/hallucination-guard/", // <-- set to "/<REPO_NAME>/", include leading & trailing slash
});
