import React, { useState, useEffect } from "react";

interface CheckpointsPanelProps {
  onBack?: () => void;
}

const CheckpointsPanel: React.FC<CheckpointsPanelProps> = ({ onBack }) => {
  const [enableCheckpoints, setEnableCheckpoints] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial setting
  useEffect(() => {
    const loadSetting = async () => {
      if (window.storage) {
        try {
          const result = await window.storage.get("enableCheckpoints");
          setEnableCheckpoints(result?.value === "true");
        } catch (e) {
          console.error("Failed to load checkbox setting", e);
        }
      }
      setIsLoading(false);
    };
    loadSetting();
  }, []);

  const handleToggle = async (newValue: boolean) => {
    setEnableCheckpoints(newValue);
    if (window.storage) {
      try {
        await window.storage.set("enableCheckpoints", String(newValue));
      } catch (e) {
        console.error("Failed to save checkbox setting", e);
      }
    }
  };

  if (isLoading) {
    return (
      <div
        style={{ padding: "var(--spacing-lg)", color: "var(--secondary-text)" }}
      >
        Loading...
      </div>
    );
  }

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
        zIndex: 1000, // Higher than ChatPanel
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--secondary-text)",
          }}
          onClick={onBack}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--primary-text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--secondary-text)";
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
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
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
          Checkpoints
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
            backgroundColor: "var(--primary-bg)",
            borderRadius: "var(--border-radius-lg)",
            border: "1px solid var(--border-color)",
            overflow: "hidden",
          }}
        >
          {/* Enable Checkpoints Toggle */}
          <div
            style={{
              padding: "var(--spacing-md)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <div style={{ flex: 1, marginRight: "var(--spacing-md)" }}>
              <div
                style={{
                  fontSize: "var(--font-size-md)",
                  fontWeight: 600,
                  color: "var(--primary-text)",
                  marginBottom: "4px",
                }}
              >
                Enable Checkpoints
              </div>
              <div
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--secondary-text)",
                }}
              >
                Automatically create restore points when files are modified.
              </div>
            </div>

            {/* Switch UI */}
            <div
              onClick={() => handleToggle(!enableCheckpoints)}
              style={{
                width: "44px",
                height: "24px",
                backgroundColor: enableCheckpoints
                  ? "var(--accent-color)"
                  : "var(--border-color)",
                borderRadius: "12px",
                position: "relative",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "2px",
                  left: enableCheckpoints ? "22px" : "2px",
                  width: "20px",
                  height: "20px",
                  backgroundColor: "#fff",
                  borderRadius: "50%",
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              />
            </div>
          </div>

          <div
            style={{
              padding: "var(--spacing-md)",
              backgroundColor: "rgba(255, 165, 0, 0.1)",
              color: "var(--warning-text, #e6a700)",
              fontSize: "var(--font-size-sm)",
              lineHeight: "1.5",
            }}
          >
            <strong>Note:</strong> Checkpoints can consume significant disk
            space for large projects. Currently, this feature is experimental.
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckpointsPanel;
