import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: "Arxiv AI Reader",
  description:
    "Understand arXiv papers in context with cached Groq summaries and inline concept explanations.",
  version: packageJson.version,
  minimum_chrome_version: "127",
  permissions: ["storage", "unlimitedStorage"],
  host_permissions: ["https://api.groq.com/*"],
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  action: {
    default_title: "Arxiv AI Reader",
    default_popup: "src/popup/index.html",
  },
  content_scripts: [
    {
      matches: ["https://arxiv.org/html/*"],
      js: ["src/content/index.tsx"],
      run_at: "document_idle",
    },
  ],
});
