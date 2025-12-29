import React from "react";
import { Checkpoint } from "../../types";

interface CheckpointDividerProps {
  checkpoint: Checkpoint;
  onRevert: (checkpointId: string) => void;
  onViewDetails?: () => void;
}

const CheckpointDivider: React.FC<CheckpointDividerProps> = ({
  checkpoint,
  onRevert,
  onViewDetails,
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-sm)",
        margin: "var(--spacing-md) 0",
        padding: "var(--spacing-xs)",
        backgroundColor: "rgba(16, 185, 129, 0.1)", // Light green bg
        borderLeft: "2px solid #10b981",
        borderRadius: "0 var(--border-radius) var(--border-radius) 0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-xs)",
          flex: 1,
        }}
      >
        <span style={{ fontSize: "16px" }}>💾</span>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: 600,
              color: "var(--primary-text)",
            }}
          >
            Checkpoint Created
          </span>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--secondary-text)",
            }}
          >
            {new Date(checkpoint.timestamp).toLocaleTimeString()} •{" "}
            {checkpoint.toolType.replace(/_/g, " ")} •{" "}
            {checkpoint.filePath.split("/").pop()}
          </span>
        </div>
      </div>
      <button
        onClick={onViewDetails}
        style={{
          padding: "4px 8px",
          backgroundColor: "transparent",
          border: "1px solid var(--vscode-descriptionForeground)",
          borderRadius: "var(--border-radius)",
          color: "var(--vscode-descriptionForeground)",
          fontSize: "var(--font-size-xs)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          marginRight: "8px",
          opacity: 0.8,
        }}
        title="View Details"
      >
        <span className="codicon codicon-eye" />
      </button>
      <button
        onClick={() => onRevert(checkpoint.id)}
        style={{
          padding: "4px 8px",
          backgroundColor: "transparent",
          border: "1px solid #10b981",
          borderRadius: "var(--border-radius)",
          color: "#10b981",
          fontSize: "var(--font-size-xs)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
        title="Revert to this checkpoint"
      >
        <span>↩️</span> Revert
      </button>
    </div>
  );
};

export default CheckpointDivider;
