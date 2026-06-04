import { useState, useEffect } from "react";
import { useAppConfigStore, useAppConfig } from "../hooks/useAppConfig";
import type { ThemeName, PetSize } from "../hooks/useAppConfig";
import { invoke } from "@tauri-apps/api/core";

const THEMES: { id: ThemeName; label: string }[] = [
  { id: "midnight", label: "Midnight" },
  { id: "peach", label: "Peach" },
  { id: "cloud", label: "Cloud" },
  { id: "moss", label: "Moss" },
];

const SIZES: { id: PetSize; label: string }[] = [
  { id: "small", label: "Small" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
];

interface StoreState {
  isSoundsEnabled: boolean;
  setSoundsEnabled: (enabled: boolean) => void;
}

export function SettingsPanel() {
  const { theme, size, setTheme, setSize } = useAppConfig();
  const isSoundsEnabled = useAppConfigStore((s: StoreState) => s.isSoundsEnabled);
  const setSoundsEnabled = useAppConfigStore((s: StoreState) => s.setSoundsEnabled);

  // Webhook authentication state
  const [webhookToken, setWebhookToken] = useState<string>("");
  const [lastGenerated, setLastGenerated] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Load webhook token on mount
  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await invoke<string>("get_webhook_token");
        setWebhookToken(token);
        setLastGenerated(new Date().toLocaleString());
      } catch (e) {
        console.error("[SettingsPanel] Failed to load webhook token:", e);
      }
    };
    loadToken();
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(webhookToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("[SettingsPanel] Failed to copy token:", e);
    }
  };

  const regenerateToken = async () => {
    try {
      const newToken = await invoke<string>("regenerate_webhook_token");
      setWebhookToken(newToken);
      setLastGenerated(new Date().toLocaleString());
    } catch (e) {
      console.error("[SettingsPanel] Failed to regenerate token:", e);
    }
  };

  return (
    <div className="settings-panel">
      <h3>Settings</h3>

      <div className="settings-group">
        <label className="settings-label">Theme</label>
        <div className="settings-theme-buttons">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`settings-theme-btn ${t.id === theme ? "active" : ""}`}
              onClick={() => setTheme(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-group">
        <label className="settings-label">Pet Size</label>
        <div className="settings-size-buttons">
          {SIZES.map((s) => (
            <button
              key={s.id}
              className={`settings-size-btn ${s.id === size ? "active" : ""}`}
              onClick={() => setSize(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-group">
        <label className="settings-toggle-label">
          <input
            type="checkbox"
            checked={isSoundsEnabled}
            onChange={(e) => setSoundsEnabled(e.target.checked)}
          />
          <span className="settings-toggle-text">Sounds</span>
        </label>
      </div>

      {/* Webhook Authentication Section */}
      <div className="settings-group">
        <h4 className="settings-section-title">Webhook Authentication</h4>
        
        <div className="webhook-token-row">
          <input
            type="text"
            className="webhook-token-input"
            value={webhookToken}
            readOnly
            placeholder="Loading token..."
          />
          <button
            className="webhook-copy-btn"
            onClick={copyToClipboard}
            title="Copy token to clipboard"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <button
          className="webhook-regenerate-btn"
          onClick={regenerateToken}
        >
          Regenerate Token
        </button>

        {lastGenerated && (
          <div className="webhook-timestamp">
            Last generated: {lastGenerated}
          </div>
        )}
      </div>
    </div>
  );
}