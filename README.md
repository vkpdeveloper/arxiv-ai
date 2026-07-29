# Arxiv AI Reader

A Manifest V3 Chrome extension that turns arXiv HTML papers into an
in-context reading companion. It converts the paper to Markdown with
[Turndown](https://www.npmjs.com/package/turndown), analyzes it with Groq
Compound Mini, caches the result in extension-owned IndexedDB, and highlights
important concepts throughout the paper body.

## What it does

- Runs only on `https://arxiv.org/html/*`.
- Checks the local paper cache before showing any processing UI.
- Uses `groq/compound-mini` for paper analysis and keeps
  `groq/compound` as the default general-purpose model.
- Highlights every occurrence of each returned concept in paragraphs, lists,
  tables, blockquotes, and figure captions—never in paper headlines.
- Opens an accessible Base UI popover with a paper-specific definition,
  context, and why the concept matters. Escape closes it.
- Stores the Groq key in Chrome extension storage and never injects it into
  the arXiv page.
- Keeps free-tier requests small by sending a balanced, section-aware digest
  while retaining the complete Markdown in IndexedDB.
- Reads Groq's `retry-after` response on temporary rate limits, shows a
  countdown, and resumes the analysis automatically.

## Run locally

```sh
npm install
npm run build
```

Then open `chrome://extensions`, enable **Developer mode**, choose
**Load unpacked**, and select the generated `dist` directory.

Click the extension icon, add a Groq API key, and open an arXiv HTML paper such
as <https://arxiv.org/html/2408.15857v1>.

## Development

```sh
npm run dev
```

Load the development output shown by Vite in Chrome. After source changes,
reload the extension and the target arXiv tab.

## Privacy note

The API key is persisted locally in `chrome.storage.local`; Chrome extension
storage is not an encrypted secret vault. Paper Markdown and Groq analysis are
stored in IndexedDB under the extension origin. The extension sends the paper
digest and its URL/title to Groq only when a paper is not already cached.
