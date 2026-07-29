import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Sparkles,
  Zap,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { getSettings, saveSettings } from "../lib/settings";
import { DEFAULT_SETTINGS, type ExtensionSettings } from "../types";

export function PopupApp() {
  const [settings, setSettings] =
    useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void getSettings().then((storedSettings) => {
      setSettings(storedSettings);
      setLoading(false);
    });
  }, []);

  const updateSetting = (key: keyof ExtensionSettings, value: string) => {
    setSaved(false);
    setError("");
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!settings.apiKey.trim()) {
      setError("Enter a Groq API key to analyze papers.");
      return;
    }

    await saveSettings({
      apiKey: settings.apiKey.trim(),
      defaultModel:
        settings.defaultModel.trim() || DEFAULT_SETTINGS.defaultModel,
      analysisModel:
        settings.analysisModel.trim() || DEFAULT_SETTINGS.analysisModel,
    });
    setSaved(true);
  };

  return (
    <main className="popup-shell">
      <header className="popup-header">
        <div className="brand-mark">
          <Sparkles size={18} strokeWidth={1.9} />
        </div>
        <div>
          <h1>Arxiv AI Reader</h1>
          <p>Context, exactly where you need it.</p>
        </div>
        <span className="status-dot" title="Ready on arxiv.org/html pages" />
      </header>

      <form onSubmit={handleSubmit}>
        <section className="settings-section">
          <div className="section-heading">
            <KeyRound size={15} />
            <div>
              <h2>Groq API key</h2>
              <p>Used only for your paper analysis requests.</p>
            </div>
          </div>

          <label className="api-key-field">
            <span className="sr-only">Groq API key</span>
            <input
              type={showKey ? "text" : "password"}
              value={settings.apiKey}
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
              placeholder="gsk_..."
              onChange={(event) => updateSetting("apiKey", event.target.value)}
            />
            <button
              type="button"
              aria-label={showKey ? "Hide API key" : "Show API key"}
              onClick={() => setShowKey((value) => !value)}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </label>
          <p className="privacy-note">
            Stored locally in Chrome extension storage. It is never injected into
            the arXiv page.
          </p>
        </section>

        <section className="settings-section model-section">
          <div className="section-heading">
            <Zap size={15} />
            <div>
              <h2>Models</h2>
              <p>Fast analysis now, deeper tasks later.</p>
            </div>
          </div>

          <label className="model-field">
            <span>
              <strong>Default</strong>
              <small>General extension tasks</small>
            </span>
            <input
              value={settings.defaultModel}
              disabled={loading}
              spellCheck={false}
              onChange={(event) =>
                updateSetting("defaultModel", event.target.value)
              }
            />
          </label>

          <label className="model-field">
            <span>
              <strong>Page analysis</strong>
              <small>Keyword map + paper brief</small>
            </span>
            <input
              value={settings.analysisModel}
              disabled={loading}
              spellCheck={false}
              onChange={(event) =>
                updateSetting("analysisModel", event.target.value)
              }
            />
          </label>
        </section>

        {error && <p className="form-error">{error}</p>}

        <button
          className={`save-button ${saved ? "is-saved" : ""}`}
          type="submit"
          disabled={loading}
        >
          {saved ? (
            <>
              <Check size={16} /> Saved
            </>
          ) : (
            "Save settings"
          )}
        </button>
      </form>

      <footer>
        Open any <strong>arxiv.org/html/…</strong> paper to begin.
      </footer>
    </main>
  );
}
