import React, { useState, useEffect } from "react";

interface ClaudeCliPanelProps {
  onBack: () => void;
}

const STORAGE_KEY = "zen-claude-cli-backend-url";
const DEFAULT_BACKEND_URL = "http://localhost:3000/v1";

const ClaudeCliPanel: React.FC<ClaudeCliPanelProps> = ({ onBack }) => {
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [isSaved, setIsSaved] = useState(false);

  // Load saved URL on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem(STORAGE_KEY);
    if (savedUrl) {
      setBackendUrl(savedUrl);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, backendUrl);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleReset = () => {
    setBackendUrl(DEFAULT_BACKEND_URL);
    localStorage.setItem(STORAGE_KEY, DEFAULT_BACKEND_URL);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "var(--secondary-bg)",
        zIndex: 1001,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "var(--spacing-lg)",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-md)",
          backgroundColor: "var(--secondary-bg)",
        }}
      >
        <div
          style={{
            cursor: "pointer",
            padding: "var(--spacing-xs)",
            borderRadius: "var(--border-radius)",
            transition: "background-color 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={onBack}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </div>
        <h2
          style={{
            fontSize: "var(--font-size-xl)",
            fontWeight: 600,
            color: "var(--primary-text)",
            margin: 0,
          }}
        >
          Claude CLI Code
        </h2>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--spacing-lg)",
        }}
      >
        <div
          style={{
            marginBottom: "var(--spacing-lg)",
            padding: "var(--spacing-md)",
            backgroundColor: "var(--primary-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--border-radius-lg)",
          }}
        >
          <h3
            style={{
              fontSize: "var(--font-size-lg)",
              color: "var(--primary-text)",
              marginBottom: "var(--spacing-md)",
              margin: 0,
            }}
          >
            Backend Server Configuration
          </h3>
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--secondary-text)",
              marginBottom: "var(--spacing-md)",
              lineHeight: 1.5,
            }}
          >
            Configure the backend URL for Claude CLI service. Make sure the
            ZenCLI server is running before using Claude CLI features.
          </p>

          <label
            style={{
              display: "block",
              fontSize: "var(--font-size-sm)",
              color: "var(--primary-text)",
              fontWeight: 500,
              marginBottom: "var(--spacing-xs)",
            }}
          >
            Backend URL
          </label>
          <input
            type="text"
            placeholder="http://localhost:3000/v1"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            style={{
              width: "100%",
              padding: "var(--spacing-sm)",
              marginBottom: "var(--spacing-md)",
              backgroundColor: "var(--input-bg)",
              color: "var(--primary-text)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--border-radius)",
              fontSize: "var(--font-size-md)",
              outline: "none",
              fontFamily: "monospace",
            }}
          />

          <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: "var(--spacing-sm)",
                backgroundColor: isSaved ? "#10b981" : "var(--button-primary)",
                color: "#ffffff",
                border: "none",
                borderRadius: "var(--border-radius)",
                fontSize: "var(--font-size-sm)",
                cursor: "pointer",
                fontWeight: 500,
                transition: "background-color 0.2s",
              }}
            >
              {isSaved ? "✓ Saved" : "Save"}
            </button>
            <button
              onClick={handleReset}
              style={{
                flex: 1,
                padding: "var(--spacing-sm)",
                backgroundColor: "var(--button-secondary)",
                color: "var(--primary-text)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--border-radius)",
                fontSize: "var(--font-size-sm)",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Reset to Default
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div
          style={{
            padding: "var(--spacing-md)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: "var(--border-radius-lg)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-sm)",
              marginBottom: "var(--spacing-sm)",
            }}
          >
            <span style={{ fontSize: "20px" }}>ℹ️</span>
            <h4
              style={{
                fontSize: "var(--font-size-md)",
                color: "#3b82f6",
                fontWeight: 600,
                margin: 0,
              }}
            >
              How to Use
            </h4>
          </div>
          <ul
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--primary-text)",
              lineHeight: 1.6,
              margin: 0,
              paddingLeft: "var(--spacing-lg)",
            }}
          >
            <li>Ensure ZenCLI server is running on the configured URL</li>
            <li>Navigate to Tab Panel and select Claude(CLI) model</li>
            <li>Available accounts will be fetched and displayed</li>
            <li>Select an account to start chatting</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ClaudeCliPanel;
