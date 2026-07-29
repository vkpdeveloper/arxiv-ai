import { beforeEach, describe, expect, it } from "vitest";
import {
  extractPaperMarkdown,
  fitMarkdownToPrompt,
  getPaperContentRoot,
  paperCacheKey,
} from "../src/lib/extract";

describe("paper extraction", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("selects the arXiv article and keeps paper structure without page chrome", () => {
    document.body.innerHTML = `
      <div class="ltx_page_main">
        <article class="ltx_document">
          <h1>Useful Paper</h1>
          <div class="ltx_authors">Ada Author</div>
          <h2>Method</h2>
          <p>We combine CSPNet with <math alttext="F(x)">ignored</math>.</p>
          <div class="ltx_bibliography"><p>Reference noise</p></div>
        </article>
      </div>
    `;

    const root = getPaperContentRoot();
    expect(root?.tagName).toBe("ARTICLE");

    const markdown = extractPaperMarkdown(root!);
    expect(markdown).toContain("# Useful Paper");
    expect(markdown).toContain("## Method");
    expect(markdown).toContain("CSPNet");
    expect(markdown).toContain("F(x)");
    expect(markdown).not.toContain("Ada Author");
    expect(markdown).not.toContain("Reference noise");
  });

  it("uses a stable URL key without query strings or fragments", () => {
    const key = paperCacheKey(
      new URL("https://arxiv.org/html/2408.15857v1/?theme=dark#section-2"),
    );
    expect(key).toBe("https://arxiv.org/html/2408.15857v1");
  });

  it("compacts long papers across sections within the free-tier budget", () => {
    const section = (name: string, character: string) =>
      `## ${name}\n\n${character.repeat(6_000)}`;
    const markdown = [
      "# Paper",
      section("Introduction", "i"),
      section("Method", "m"),
      section("Experiments", "e"),
      section("Conclusion", "c"),
    ].join("\n\n");

    const compacted = fitMarkdownToPrompt(markdown);

    expect(compacted.length).toBeLessThanOrEqual(16_000);
    expect(compacted).toContain("## Introduction");
    expect(compacted).toContain("## Method");
    expect(compacted).toContain("## Experiments");
    expect(compacted).toContain("## Conclusion");
  });
});
