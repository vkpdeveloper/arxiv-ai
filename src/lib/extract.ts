import TurndownService from "turndown";

const REMOVE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "nav",
  "header",
  "footer",
  "form",
  ".ltx_page_header",
  ".ltx_page_footer",
  ".ltx_bibliography",
  ".ltx_authors",
  ".ltx_dates",
  ".ltx_role_affiliationtext",
  ".ltx_role_email",
  ".ltx_note_mark",
  ".ltx_ERROR",
].join(",");

export function getPaperContentRoot(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>("article.ltx_document") ??
    document.querySelector<HTMLElement>("article") ??
    document.querySelector<HTMLElement>(".ltx_page_main") ??
    document.querySelector<HTMLElement>("main")
  );
}

export function paperCacheKey(url: URL): string {
  return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
}

export function extractPaperMarkdown(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(REMOVE_SELECTORS).forEach((element) => element.remove());

  const turndown = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
    strongDelimiter: "**",
  });

  turndown.addRule("arxivMath", {
    filter: (node) => node.nodeName.toLowerCase() === "math",
    replacement: (_content, node) => {
      const expression = (node as Element).getAttribute("alttext")?.trim();
      return expression ? ` ${expression} ` : "";
    },
  });

  turndown.addRule("dropImages", {
    filter: (node) => node.nodeName === "IMG" || node.nodeName === "SVG",
    replacement: () => "",
  });

  const markdown = turndown.turndown(clone);
  return markdown
    .replace(/\n{4,}/g, "\n\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function fitMarkdownToPrompt(markdown: string): string {
  const maxCharacters = 16_000;
  if (markdown.length <= maxCharacters) {
    return markdown;
  }

  const sections = markdown
    .split(/(?=^#{1,4}\s+)/m)
    .map((section) => section.trim())
    .filter(Boolean);

  if (sections.length <= 1) {
    return `${markdown.slice(0, 12_000)}\n\n[Content compacted]\n\n${markdown.slice(-3_900)}`;
  }

  const priorityPattern =
    /\b(abstract|introduction|method|approach|architecture|experiment|evaluation|result|discussion|conclusion|dataset)\b/i;
  const essentialPattern = /\b(abstract|introduction|conclusion)\b/i;
  const weightedSections = sections.map((section, index) => {
    const heading = section.split("\n", 1)[0] ?? "";
    const weight =
      index === 0 || essentialPattern.test(heading)
        ? 3
        : priorityPattern.test(heading)
          ? 2
          : 1;
    return { section, heading, weight };
  });
  const totalWeight = weightedSections.reduce(
    (total, section) => total + section.weight,
    0,
  );
  const separatorBudget = weightedSections.length * 30;
  const availableCharacters = maxCharacters - separatorBudget;

  const compacted = weightedSections.map(({ section, heading, weight }) => {
    const body = section.slice(heading.length).trim();
    const sectionBudget = Math.max(
      220,
      Math.floor((availableCharacters * weight) / totalWeight),
    );
    const bodyBudget = Math.max(120, sectionBudget - heading.length - 2);
    if (body.length <= bodyBudget) {
      return section;
    }

    const leadingCharacters = Math.floor(bodyBudget * 0.78);
    const trailingCharacters = bodyBudget - leadingCharacters;
    return `${heading}\n\n${body.slice(0, leadingCharacters).trim()}\n\n[…]\n\n${body.slice(-trailingCharacters).trim()}`;
  });

  return compacted.join("\n\n").slice(0, maxCharacters);
}
