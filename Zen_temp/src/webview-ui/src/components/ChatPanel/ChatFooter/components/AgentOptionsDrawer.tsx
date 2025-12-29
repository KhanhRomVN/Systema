import React from "react";

export interface AgentOptions {
  read_file: {
    scope: "project" | "all";
    autoRead: "off" | "always" | "auto";
  };
  write_to_file: {
    scope: "project" | "all";
    autoRead: "off" | "always" | "auto";
  };
  replace_in_file: {
    scope: "project" | "all";
    autoRead: "off" | "always" | "auto";
  };
  list_files: {
    scope: "project" | "all";
    autoRead: "off" | "always" | "auto";
  };
  search_files: {
    scope: "project" | "all";
    autoRead: "off" | "always" | "auto";
  };
  run_command: {
    autoRead: "off" | "always" | "auto";
  };
}

interface AgentOptionsDrawerProps {
  isOpen: boolean;
  options: AgentOptions;
  onClose: () => void;
  onUpdateReadFileScope: (scope: "project" | "all") => void;
  onUpdateReadFileAutoRead: (autoRead: "off" | "always" | "auto") => void;
  onUpdateWriteToFileScope: (scope: "project" | "all") => void;
  onUpdateWriteToFileAutoRead: (autoRead: "off" | "always" | "auto") => void;
  onUpdateReplaceInFileScope: (scope: "project" | "all") => void;
  onUpdateReplaceInFileAutoRead: (autoRead: "off" | "always" | "auto") => void;
  onUpdateListFilesScope: (scope: "project" | "all") => void;
  onUpdateListFilesAutoRead: (autoRead: "off" | "always" | "auto") => void;
  onUpdateSearchFilesScope: (scope: "project" | "all") => void;
  onUpdateSearchFilesAutoRead: (autoRead: "off" | "always" | "auto") => void;
  onUpdateRunCommandAutoRead: (autoRead: "off" | "always" | "auto") => void;
}

const AgentOptionsDrawer: React.FC<AgentOptionsDrawerProps> = ({
  isOpen,
  options,
  onClose,
  onUpdateReadFileScope,
  onUpdateReadFileAutoRead,
  onUpdateWriteToFileScope,
  onUpdateWriteToFileAutoRead,
  onUpdateReplaceInFileScope,
  onUpdateReplaceInFileAutoRead,
  onUpdateListFilesScope,
  onUpdateListFilesAutoRead,
  onUpdateSearchFilesScope,
  onUpdateSearchFilesAutoRead,
  onUpdateRunCommandAutoRead,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        data-options-drawer="true"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "var(--primary-bg)",
          borderTop: "1px solid var(--border-color)",
          borderTopLeftRadius: "12px",
          borderTopRightRadius: "12px",
          padding: "16px",
          zIndex: 1001,
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.15)",
          transform: "translateY(0)",
          animation: "slideUp 0.3s ease-out",
          maxHeight: "70vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
            paddingBottom: "10px",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--primary-text)",
            }}
          >
            Agent Options
          </div>
          <div
            style={{
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              transition: "background-color 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--hover-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        </div>

        {/* Tools Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "12px",
          }}
        >
          {/* 1. Read File */}
          <ToolCard
            title="Read File"
            icon="📖"
            color="#6366f1"
            colorEnd="#8b5cf6"
            scope={options.read_file.scope}
            autoRead={options.read_file.autoRead}
            onScopeChange={onUpdateReadFileScope}
            onAutoReadChange={onUpdateReadFileAutoRead}
          />

          {/* 2. Write to File */}
          <ToolCard
            title="Write to File"
            icon="✍️"
            color="#10b981"
            colorEnd="#059669"
            scope={options.write_to_file.scope}
            autoRead={options.write_to_file.autoRead}
            onScopeChange={onUpdateWriteToFileScope}
            onAutoReadChange={onUpdateWriteToFileAutoRead}
          />

          {/* 3. Replace in File */}
          <ToolCard
            title="Replace in File"
            icon="🔄"
            color="#f59e0b"
            colorEnd="#d97706"
            scope={options.replace_in_file.scope}
            autoRead={options.replace_in_file.autoRead}
            onScopeChange={onUpdateReplaceInFileScope}
            onAutoReadChange={onUpdateReplaceInFileAutoRead}
          />

          {/* 4. List Files */}
          <ToolCard
            title="List Files"
            icon="📁"
            color="#3b82f6"
            colorEnd="#2563eb"
            scope={options.list_files.scope}
            autoRead={options.list_files.autoRead}
            onScopeChange={onUpdateListFilesScope}
            onAutoReadChange={onUpdateListFilesAutoRead}
          />

          {/* 5. Search Files */}
          <ToolCard
            title="Search Files"
            icon="🔍"
            color="#ec4899"
            colorEnd="#db2777"
            scope={options.search_files.scope}
            autoRead={options.search_files.autoRead}
            onScopeChange={onUpdateSearchFilesScope}
            onAutoReadChange={onUpdateSearchFilesAutoRead}
          />

          {/* 6. Run Command */}
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(239, 68, 68, 0.04) 0%, rgba(220, 38, 38, 0.04) 100%)",
              borderRadius: "8px",
              border: "1px solid rgba(239, 68, 68, 0.15)",
              padding: "12px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
              e.currentTarget.style.boxShadow =
                "0 2px 8px rgba(239, 68, 68, 0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.15)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  background:
                    "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                }}
              >
                ⚡
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--primary-text)",
                }}
              >
                Run Command
              </div>
            </div>

            {/* Auto Read Section */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "var(--secondary-text)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Auto Read
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["off", "always", "auto"] as const).map((mode) => (
                    <button
                      key={mode}
                      disabled={mode === "auto"}
                      style={{
                        padding: "4px 10px",
                        border: "none",
                        background: "transparent",
                        color:
                          mode === "auto"
                            ? "var(--secondary-text)"
                            : options.run_command.autoRead === mode
                            ? "#ef4444"
                            : "var(--secondary-text)",
                        cursor: mode === "auto" ? "not-allowed" : "pointer",
                        fontSize: "12px",
                        fontWeight: 500,
                        opacity: mode === "auto" ? 0.5 : 1,
                        transition: "all 0.15s",
                        borderBottom:
                          options.run_command.autoRead === mode
                            ? "2px solid #ef4444"
                            : "2px solid transparent",
                        width: "fit-content",
                      }}
                      onClick={() =>
                        mode !== "auto" && onUpdateRunCommandAutoRead(mode)
                      }
                      title={mode === "auto" ? "Coming soon" : ""}
                    >
                      {mode === "off"
                        ? "Off"
                        : mode === "always"
                        ? "Always"
                        : "Auto"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "14px",
            paddingTop: "10px",
            borderTop: "1px solid var(--border-color)",
            textAlign: "center",
            fontSize: "11px",
            color: "var(--secondary-text)",
            opacity: 0.7,
          }}
        >
          Configure AI agent permissions and capabilities
        </div>
      </div>

      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 1000,
        }}
        onClick={onClose}
      />

      <style>
        {`@keyframes slideUp {
 from {
 transform: translateY(100%);
 }
 to {
 transform: translateY(0);
 }
 }`}
      </style>
    </>
  );
};

// Reusable Tool Card Component
interface ToolCardProps {
  title: string;
  icon: string;
  color: string;
  colorEnd: string;
  scope: "project" | "all";
  autoRead: "off" | "always" | "auto";
  onScopeChange: (scope: "project" | "all") => void;
  onAutoReadChange: (autoRead: "off" | "always" | "auto") => void;
}

const ToolCard: React.FC<ToolCardProps> = ({
  title,
  icon,
  color,
  colorEnd,
  scope,
  autoRead,
  onScopeChange,
  onAutoReadChange,
}) => {
  const rgbaColor = hexToRgba(color, 0.04);
  const rgbaColorEnd = hexToRgba(colorEnd, 0.04);
  const borderColor = hexToRgba(color, 0.15);

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${rgbaColor} 0%, ${rgbaColorEnd} 100%)`,
        borderRadius: "8px",
        border: `1px solid ${borderColor}`,
        padding: "12px",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = hexToRgba(color, 0.3);
        e.currentTarget.style.boxShadow = `0 2px 8px ${hexToRgba(color, 0.08)}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = borderColor;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            background: `linear-gradient(135deg, ${color} 0%, ${colorEnd} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
          }}
        >
          {icon}
        </div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--primary-text)",
          }}
        >
          {title}
        </div>
      </div>

      {/* Scope Section */}
      <div style={{ marginBottom: "8px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: "var(--secondary-text)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Scope
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {(["project", "all"] as const).map((s) => (
              <button
                key={s}
                style={{
                  padding: "4px 10px",
                  border: "none",
                  background: "transparent",
                  color: scope === s ? color : "var(--secondary-text)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 500,
                  transition: "all 0.15s",
                  borderBottom:
                    scope === s
                      ? `2px solid ${color}`
                      : "2px solid transparent",
                  width: "fit-content",
                }}
                onClick={() => onScopeChange(s)}
              >
                {s === "project" ? "Project" : "All"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Auto Read Section */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: "var(--secondary-text)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Auto Read
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {(["off", "always", "auto"] as const).map((mode) => (
              <button
                key={mode}
                disabled={mode === "auto"}
                style={{
                  padding: "4px 10px",
                  border: "none",
                  background: "transparent",
                  color:
                    mode === "auto"
                      ? "var(--secondary-text)"
                      : autoRead === mode
                      ? color
                      : "var(--secondary-text)",
                  cursor: mode === "auto" ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  fontWeight: 500,
                  opacity: mode === "auto" ? 0.5 : 1,
                  transition: "all 0.15s",
                  borderBottom:
                    autoRead === mode
                      ? `2px solid ${color}`
                      : "2px solid transparent",
                  width: "fit-content",
                }}
                onClick={() => mode !== "auto" && onAutoReadChange(mode)}
                title={mode === "auto" ? "Coming soon" : ""}
              >
                {mode === "off" ? "Off" : mode === "always" ? "Always" : "Auto"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to convert hex to rgba
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default AgentOptionsDrawer;
