import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getPaperContentRoot, paperCacheKey } from "../lib/extract";
import { ReaderApp } from "./ReaderApp";
import readerStyles from "./styles.css?inline";

function mountExtension(): void {
  const contentRoot = getPaperContentRoot();
  if (!contentRoot || document.querySelector("[data-arxiv-ai-root]")) {
    return;
  }

  const host = document.createElement("div");
  host.dataset.arxivAiRoot = "true";
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.zIndex = "2147483646";
  host.style.pointerEvents = "none";
  document.documentElement.append(host);

  const shadowRoot = host.attachShadow({ mode: "open" });
  const reactRoot = document.createElement("div");
  reactRoot.id = "arxiv-ai-react-root";
  shadowRoot.append(reactRoot);

  createRoot(reactRoot).render(
    <StrictMode>
      <style>{readerStyles}</style>
      <ReaderApp
        cacheKey={paperCacheKey(new URL(window.location.href))}
        contentRoot={contentRoot}
        pageTitle={document.title}
        pageUrl={window.location.href}
        shadowRoot={shadowRoot}
      />
    </StrictMode>,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountExtension, { once: true });
} else {
  mountExtension();
}
