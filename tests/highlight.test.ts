import { beforeEach, describe, expect, it } from "vitest";
import { createKeywordHighlights } from "../src/lib/highlight";
import type { Keyword } from "../src/types";

const keywords: Keyword[] = [
  {
    term: "CSPNet",
    aliases: ["Cross Stage Partial Network"],
    shortDefinition: "A feature extraction architecture.",
    paperContext: "Used by the detector.",
    whyItMatters: "It shapes the backbone.",
    color: "#F8C8DC",
  },
  {
    term: "FPN+PAN",
    aliases: ["FPN"],
    shortDefinition: "A feature aggregation design.",
    paperContext: "Combines multi-scale features.",
    whyItMatters: "It affects detection at different scales.",
    color: "#CDE7FF",
  },
];

describe("createKeywordHighlights", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("highlights every content occurrence but excludes headlines and controls", () => {
    document.body.innerHTML = `
      <article>
        <h1>CSPNet headline</h1>
        <h2>FPN+PAN section</h2>
        <p>CSPNet pairs with CSPNet and FPN+PAN.</p>
        <ul><li>Cross Stage Partial Network is also called CSPNet.</li></ul>
        <p><a href="#">CSPNet link</a> and <code>FPN</code></p>
        <button>CSPNet action</button>
      </article>
    `;
    const root = document.querySelector("article") as HTMLElement;

    const mounts = createKeywordHighlights(root, keywords);

    expect(mounts.map((mount) => mount.text)).toEqual([
      "CSPNet",
      "CSPNet",
      "FPN+PAN",
      "Cross Stage Partial Network",
      "CSPNet",
    ]);
    expect(document.querySelector("h1")?.textContent).toBe("CSPNet headline");
    expect(document.querySelector("h2")?.textContent).toBe("FPN+PAN section");
    expect(document.querySelector("a")?.textContent).toBe("CSPNet link");
    expect(document.querySelector("code")?.textContent).toBe("FPN");
  });

  it("prefers a longer overlapping term", () => {
    document.body.innerHTML = "<article><p>The model uses FPN+PAN.</p></article>";
    const root = document.querySelector("article") as HTMLElement;

    const mounts = createKeywordHighlights(root, keywords);

    expect(mounts).toHaveLength(1);
    expect(mounts[0]?.text).toBe("FPN+PAN");
    expect(mounts[0]?.keyword.term).toBe("FPN+PAN");
  });

  it("gives a canonical concept priority over another concept's alias", () => {
    const conflictingKeywords: Keyword[] = [
      {
        ...keywords[1]!,
        aliases: ["PANet"],
      },
      {
        term: "PANet",
        aliases: ["Path Aggregation Network"],
        shortDefinition: "A path-based feature aggregation network.",
        paperContext: "The paper uses it within the detector neck.",
        whyItMatters: "It improves bottom-up information flow.",
        color: "#D8F3DC",
      },
    ];
    document.body.innerHTML =
      "<article><p>PANet is one component of FPN+PAN.</p></article>";
    const root = document.querySelector("article") as HTMLElement;

    const mounts = createKeywordHighlights(root, conflictingKeywords);

    expect(mounts).toHaveLength(2);
    expect(mounts[0]?.text).toBe("PANet");
    expect(mounts[0]?.keyword.term).toBe("PANet");
    expect(mounts[1]?.keyword.term).toBe("FPN+PAN");
  });
});
