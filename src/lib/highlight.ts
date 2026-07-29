import type { Keyword } from "../types";

export interface HighlightMount {
  host: HTMLSpanElement;
  text: string;
  keyword: Keyword;
  id: string;
}

const READING_BLOCK_SELECTOR = "p, li, td, th, blockquote, dd, figcaption";
const EXCLUDED_ANCESTOR_SELECTOR = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "footer",
  "nav",
  "aside",
  "button",
  "a",
  "code",
  "pre",
  "math",
  "svg",
  "textarea",
  "input",
  "select",
  "[aria-hidden='true']",
  "[data-arxiv-ai-root]",
].join(",");

interface AliasEntry {
  keyword: Keyword;
  normalized: string;
  value: string;
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function eligibleTextNode(node: Text, root: HTMLElement): boolean {
  const parent = node.parentElement;
  if (!parent || !node.data.trim() || !root.contains(parent)) {
    return false;
  }

  if (!parent.closest(READING_BLOCK_SELECTOR)) {
    return false;
  }

  return parent.closest(EXCLUDED_ANCESTOR_SELECTOR) === null;
}

export function createKeywordHighlights(
  root: HTMLElement,
  keywords: Keyword[],
): HighlightMount[] {
  const aliasesByNormalizedValue = new Map<string, AliasEntry>();

  // Canonical terms always own their text, even when an earlier concept
  // incorrectly lists the same spelling as an alias.
  keywords.forEach((keyword) => {
    const value = keyword.term.trim();
    const normalized = value.toLocaleLowerCase();
    if (value.length >= 2 && !aliasesByNormalizedValue.has(normalized)) {
      aliasesByNormalizedValue.set(normalized, {
        keyword,
        normalized,
        value,
      });
    }
  });

  keywords.forEach((keyword) => {
    keyword.aliases.forEach((rawAlias) => {
      const value = rawAlias.trim();
      const normalized = value.toLocaleLowerCase();
      if (value.length >= 2 && !aliasesByNormalizedValue.has(normalized)) {
        aliasesByNormalizedValue.set(normalized, {
          keyword,
          normalized,
          value,
        });
      }
    });
  });

  const aliases = [...aliasesByNormalizedValue.values()].sort(
    (left, right) => right.value.length - left.value.length,
  );
  if (aliases.length === 0) {
    return [];
  }

  const expression = aliases
    .map(({ value }) => escapeRegularExpression(value))
    .join("|");
  const matcher = new RegExp(
    `(?<![\\p{L}\\p{N}])(${expression})(?![\\p{L}\\p{N}])`,
    "giu",
  );

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let currentNode: Node | null;
  while ((currentNode = walker.nextNode())) {
    if (eligibleTextNode(currentNode as Text, root)) {
      textNodes.push(currentNode as Text);
    }
  }

  const mounts: HighlightMount[] = [];
  let occurrence = 0;

  textNodes.forEach((textNode) => {
    const source = textNode.data;
    const matches = [...source.matchAll(matcher)];
    if (matches.length === 0) {
      return;
    }

    const fragment = document.createDocumentFragment();
    let cursor = 0;

    matches.forEach((match) => {
      const matchStart = match.index ?? 0;
      if (matchStart > cursor) {
        fragment.append(document.createTextNode(source.slice(cursor, matchStart)));
      }

      const matchedText = match[0];
      const alias = aliasesByNormalizedValue.get(
        matchedText.toLocaleLowerCase(),
      );

      if (!alias) {
        fragment.append(document.createTextNode(matchedText));
      } else {
        const host = document.createElement("span");
        const id = `arxiv-ai-term-${occurrence++}`;
        host.dataset.arxivAiHighlight = "true";
        host.style.display = "inline";
        fragment.append(host);
        mounts.push({
          host,
          text: matchedText,
          keyword: alias.keyword,
          id,
        });
      }

      cursor = matchStart + matchedText.length;
    });

    if (cursor < source.length) {
      fragment.append(document.createTextNode(source.slice(cursor)));
    }

    textNode.replaceWith(fragment);
  });

  return mounts;
}
