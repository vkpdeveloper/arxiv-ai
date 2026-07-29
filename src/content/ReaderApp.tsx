import { Popover } from "@base-ui/react/popover";
import {
  BookOpenText,
  ChevronDown,
  KeyRound,
  LoaderCircle,
  Sparkles,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  extractPaperMarkdown,
} from "../lib/extract";
import {
  createKeywordHighlights,
  type HighlightMount,
} from "../lib/highlight";
import { sendBackgroundMessage } from "../lib/messages";
import type { Keyword, PaperAnalysis } from "../types";

type ReaderStatus = "checking" | "processing" | "ready" | "error";

interface ReaderAppProps {
  cacheKey: string;
  contentRoot: HTMLElement;
  pageTitle: string;
  pageUrl: string;
  shadowRoot: ShadowRoot;
}

const keywordPopover = Popover.createHandle<Keyword>();

function HighlightTrigger({ mount }: { mount: HighlightMount }) {
  return createPortal(
    <Popover.Trigger
      handle={keywordPopover}
      id={mount.id}
      payload={mount.keyword}
      className="arxiv-ai-highlight"
      style={{
        backgroundColor: mount.keyword.color,
        color: "#171512",
        WebkitTextFillColor: "#171512",
      }}
      aria-label={`Explain ${mount.keyword.term}`}
    >
      {mount.text}
    </Popover.Trigger>,
    mount.host,
  );
}

function KeywordPopover({
  shadowRoot,
}: {
  shadowRoot: ShadowRoot;
}) {
  return (
    <Popover.Root handle={keywordPopover}>
      {({ payload }) => {
        if (!payload) {
          return null;
        }

        return (
          <Popover.Portal container={shadowRoot}>
            <Popover.Positioner
              sideOffset={10}
              collisionPadding={16}
              className="keyword-positioner"
            >
              <Popover.Popup className="keyword-popover">
                <Popover.Arrow className="keyword-arrow">
                  <ArrowSvg />
                </Popover.Arrow>
                <div
                  className="keyword-color-bar"
                  style={{ backgroundColor: payload.color }}
                />
                <div className="keyword-popover-header">
                  <div>
                    <span className="eyebrow">In this paper</span>
                    <Popover.Title className="keyword-title">
                      {payload.term}
                    </Popover.Title>
                  </div>
                  <Popover.Close
                    className="icon-button"
                    aria-label="Close explanation"
                  >
                    <X size={16} strokeWidth={2} />
                  </Popover.Close>
                </div>

                <Popover.Description className="keyword-definition">
                  {payload.shortDefinition}
                </Popover.Description>

                <div className="keyword-section">
                  <span className="keyword-section-label">How it appears here</span>
                  <p>{payload.paperContext}</p>
                </div>

                <div className="keyword-section keyword-why">
                  <span className="keyword-section-label">Why it matters</span>
                  <p>{payload.whyItMatters}</p>
                </div>

                <p className="escape-hint">
                  Press <kbd>Esc</kbd> to close
                </p>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        );
      }}
    </Popover.Root>
  );
}

function ArrowSvg() {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden="true">
      <path d="M0 10 8.15 1.85a2.62 2.62 0 0 1 3.7 0L20 10Z" />
    </svg>
  );
}

function ProcessingOverlay({
  retryAfterSeconds,
}: {
  retryAfterSeconds: number | null;
}) {
  const waitingForRateLimit = retryAfterSeconds !== null;

  return (
    <div className="page-overlay" role="status" aria-live="polite">
      <div className="processing-card">
        <div className="loader-wrap">
          <div className="loader-glow" />
          <LoaderCircle className="loader" size={36} strokeWidth={1.7} />
        </div>
        <span className="eyebrow">Arxiv AI Reader</span>
        <h2>
          {waitingForRateLimit
            ? "Waiting for the free-tier window"
            : "Building your reading map"}
        </h2>
        <p>
          {waitingForRateLimit
            ? `Groq asked us to pause. Retrying automatically in ${retryAfterSeconds}s—keep this tab open.`
            : "Finding the concepts, datasets, and methods that make this paper click."}
        </p>
        <div className="processing-steps" aria-hidden="true">
          <span className="active" />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

function ErrorOverlay({
  code,
  error,
  onRetry,
}: {
  code: string;
  error: string;
  onRetry: () => void;
}) {
  const missingKey = code === "MISSING_API_KEY";

  const openSettings = async () => {
    await sendBackgroundMessage({ type: "OPEN_POPUP" });
  };

  return (
    <div className="page-overlay error-overlay" role="alert">
      <div className="error-card">
        <div className="error-icon">
          {missingKey ? <KeyRound size={24} /> : <Sparkles size={24} />}
        </div>
        <span className="eyebrow">Arxiv AI Reader</span>
        <h2>{missingKey ? "Add your Groq API key" : "Analysis paused"}</h2>
        <p>{error}</p>
        <div className="error-actions">
          {missingKey ? (
            <button className="primary-button" type="button" onClick={openSettings}>
              Open extension settings
            </button>
          ) : (
            <button className="primary-button" type="button" onClick={onRetry}>
              Try again
            </button>
          )}
          <span>
            {missingKey
              ? "The page will continue automatically after you save it."
              : "Your paper content remains on this page."}
          </span>
        </div>
      </div>
    </div>
  );
}

function PaperBrief({
  analysis,
  mounts,
  initiallyOpen,
}: {
  analysis: PaperAnalysis;
  mounts: HighlightMount[];
  initiallyOpen: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  const jumpToKeyword = (keyword: Keyword) => {
    const occurrence = mounts.find((mount) => mount.keyword.term === keyword.term);
    occurrence?.host.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <aside className={`paper-brief-shell ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="brief-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="toggle-icon">
          <BookOpenText size={17} strokeWidth={2} />
        </span>
        <span className="toggle-copy">
          <strong>Paper brief</strong>
          <small>{analysis.keywords.length} concepts mapped</small>
        </span>
        <ChevronDown className="toggle-chevron" size={17} />
      </button>

      {open && (
        <div className="brief-panel">
          <div className="brief-header">
            <span className="eyebrow">Reading companion</span>
            <button
              type="button"
              className="icon-button"
              aria-label="Close paper brief"
              onClick={() => setOpen(false)}
            >
              <X size={17} />
            </button>
          </div>

          <h2>{analysis.title}</h2>
          <p className="one-sentence">{analysis.oneSentence}</p>

          <div className="summary-copy">
            {analysis.summary
              .split(/\n{2,}/)
              .filter(Boolean)
              .map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
          </div>

          {analysis.readingGuide.length > 0 && (
            <section className="reading-guide">
              <h3>Keep in mind while reading</h3>
              {analysis.readingGuide.map((item) => (
                <div className="guide-item" key={`${item.label}-${item.detail}`}>
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                </div>
              ))}
            </section>
          )}

          <section className="concept-list">
            <div className="concept-heading">
              <h3>Concept map</h3>
              <span>Click a term in the paper for context</span>
            </div>
            <div className="concept-chips">
              {analysis.keywords.map((keyword) => (
                <button
                  type="button"
                  key={keyword.term}
                  onClick={() => jumpToKeyword(keyword)}
                  style={{ backgroundColor: keyword.color }}
                >
                  {keyword.term}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}

export function ReaderApp({
  cacheKey,
  contentRoot,
  pageTitle,
  pageUrl,
  shadowRoot,
}: ReaderAppProps) {
  const [status, setStatus] = useState<ReaderStatus>("checking");
  const [analysis, setAnalysis] = useState<PaperAnalysis | null>(null);
  const [mounts, setMounts] = useState<HighlightMount[]>([]);
  const [error, setError] = useState({ code: "", message: "" });
  const [wasCached, setWasCached] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(
    null,
  );
  const hasStarted = useRef(false);

  const analyze = useCallback(
    async (skipCache = false) => {
      if (!skipCache) {
        const cachedResponse = await sendBackgroundMessage({
          type: "GET_CACHE",
          cacheKey,
        });
        if (cachedResponse.ok && cachedResponse.cached) {
          setWasCached(true);
          setAnalysis(cachedResponse.cached.analysis);
          setStatus("ready");
          return;
        }
      }

      setStatus("processing");
      setError({ code: "", message: "" });
      setRetryAfterSeconds(null);

      const markdown = extractPaperMarkdown(contentRoot);
      const response = await sendBackgroundMessage({
        type: "ANALYZE_PAGE",
        cacheKey,
        url: pageUrl,
        title: pageTitle,
        markdown,
      });

      if (!response.ok) {
        if (
          response.code === "RATE_LIMIT" &&
          response.retryAfterSeconds !== undefined &&
          response.retryAfterSeconds <= 120
        ) {
          setRetryAfterSeconds(response.retryAfterSeconds);
          return;
        }
        setError({ code: response.code, message: response.error });
        setStatus("error");
        return;
      }

      const result = response.analysis ?? response.cached?.analysis;
      if (!result) {
        setError({
          code: "EMPTY_ANALYSIS",
          message: "The analysis completed without any readable concepts.",
        });
        setStatus("error");
        return;
      }

      setWasCached(false);
      setRetryAfterSeconds(null);
      setAnalysis(result);
      setStatus("ready");
    },
    [cacheKey, contentRoot, pageTitle, pageUrl],
  );

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }
    hasStarted.current = true;
    void analyze();
  }, [analyze]);

  useEffect(() => {
    if (retryAfterSeconds === null) {
      return;
    }

    if (retryAfterSeconds <= 0) {
      setRetryAfterSeconds(null);
      void analyze(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setRetryAfterSeconds((seconds) =>
        seconds === null ? null : seconds - 1,
      );
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [analyze, retryAfterSeconds]);

  useEffect(() => {
    if (status !== "error" || error.code !== "MISSING_API_KEY") {
      return;
    }

    const onStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName === "local" && changes.settings) {
        void analyze(true);
      }
    };

    chrome.storage.onChanged.addListener(onStorageChange);
    return () => chrome.storage.onChanged.removeListener(onStorageChange);
  }, [analyze, error.code, status]);

  useEffect(() => {
    if (!analysis) {
      return;
    }

    const nextMounts = createKeywordHighlights(contentRoot, analysis.keywords);
    setMounts(nextMounts);

    return () => {
      nextMounts.forEach(({ host, text }) => {
        if (host.isConnected) {
          host.replaceWith(document.createTextNode(text));
        }
      });
    };
  }, [analysis, contentRoot]);

  const highlightStyle = useMemo(
    () =>
      createPortal(
        <style>{`
          .arxiv-ai-highlight {
            all: unset;
            display: inline;
            color: #171512 !important;
            -webkit-text-fill-color: #171512 !important;
            font: inherit;
            line-height: inherit;
            border-radius: 0.28em;
            box-decoration-break: clone;
            -webkit-box-decoration-break: clone;
            box-shadow: inset 0 -0.13em 0 rgba(40, 32, 24, 0.1);
            cursor: help;
            padding: 0.04em 0.12em;
            margin: 0 -0.01em;
            transition: filter 120ms ease, box-shadow 120ms ease;
          }
          .arxiv-ai-highlight:hover,
          .arxiv-ai-highlight:focus-visible {
            filter: saturate(1.12) brightness(0.97);
            box-shadow:
              inset 0 -0.16em 0 rgba(40, 32, 24, 0.14),
              0 0 0 2px rgba(39, 35, 30, 0.18);
            outline: none;
          }
        `}</style>,
        document.head,
      ),
    [],
  );

  return (
    <>
      {highlightStyle}
      {status === "processing" && (
        <ProcessingOverlay retryAfterSeconds={retryAfterSeconds} />
      )}
      {status === "error" && (
        <ErrorOverlay
          code={error.code}
          error={error.message}
          onRetry={() => void analyze(true)}
        />
      )}
      {status === "ready" && analysis && (
        <>
          {mounts.map((mount) => (
            <HighlightTrigger mount={mount} key={mount.id} />
          ))}
          <KeywordPopover shadowRoot={shadowRoot} />
          <PaperBrief
            analysis={analysis}
            mounts={mounts}
            initiallyOpen={!wasCached}
          />
        </>
      )}
    </>
  );
}
