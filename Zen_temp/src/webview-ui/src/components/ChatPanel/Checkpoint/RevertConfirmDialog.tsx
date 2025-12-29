import React, { useState } from "react";
import styled from "styled-components";
import {
  VSCodeButton,
  VSCodeCheckbox,
  VSCodeRadio,
  VSCodeRadioGroup,
} from "@vscode/webview-ui-toolkit/react";

interface RevertConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: RevertOptions) => void;
  checkpointId: string;
}

export interface RevertOptions {
  restoreChat: boolean;
  restoreFilesMode: "changed_only" | "full_reset"; // Corresponds to "Changed in checkpoint" vs "Begin-checkpoint"
}

const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  opacity: ${(props) => (props.$isOpen ? 1 : 0)};
  visibility: ${(props) => (props.$isOpen ? "visible" : "hidden")};
  transition: opacity 0.2s;
  backdrop-filter: blur(2px);
`;

const Dialog = styled.div`
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-widget-border);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  width: 90%;
  max-width: 400px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 12px 16px;
  background: var(--vscode-editorGroupHeader-tabsBackground);
  border-bottom: 1px solid var(--vscode-widget-border);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Content = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--vscode-descriptionForeground);
`;

const Footer = styled.div`
  padding: 12px 16px;
  border-top: 1px solid var(--vscode-widget-border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  background: var(--vscode-editorGroupHeader-tabsBackground);
`;

export const RevertConfirmDialog: React.FC<RevertConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  checkpointId,
}) => {
  const [restoreChat, setRestoreChat] = useState(true);
  const [fileMode, setFileMode] = useState<"changed_only" | "full_reset">(
    "full_reset"
  );

  if (!isOpen) return null;

  return (
    <Overlay $isOpen={isOpen} onClick={onClose}>
      <Dialog onClick={(e) => e.stopPropagation()}>
        <Header>
          <span
            className="codicon codicon-warning"
            style={{ color: "var(--vscode-editorWarning-foreground)" }}
          />
          Revert Checkpoint
        </Header>
        <Content>
          <div style={{ fontSize: "13px", lineHeight: "1.5" }}>
            Are you sure you want to revert to this checkpoint? Current changes
            will be lost.
          </div>

          <Section>
            <Label>Revert Scope</Label>
            <div style={{ display: "flex", gap: "20px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  padding: "6px",
                  border: !restoreChat
                    ? "1px solid var(--vscode-focusBorder)"
                    : "1px solid transparent",
                  borderRadius: "4px",
                  background: !restoreChat
                    ? "var(--vscode-list-activeSelectionBackground)"
                    : "transparent",
                }}
                onClick={() => setRestoreChat(false)}
              >
                <span className="codicon codicon-code" />
                <span>Code Only</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  padding: "6px",
                  border: restoreChat
                    ? "1px solid var(--vscode-focusBorder)"
                    : "1px solid transparent",
                  borderRadius: "4px",
                  background: restoreChat
                    ? "var(--vscode-list-activeSelectionBackground)"
                    : "transparent",
                }}
                onClick={() => setRestoreChat(true)}
              >
                <span className="codicon codicon-comment-discussion" />
                <span>Code & Chat</span>
              </div>
            </div>
          </Section>

          <Section>
            <Label>File Restoration Mode</Label>
            {/* Custom Radio impl since VSCodeRadio can be tricky with events in some contexts, utilizing div for layout */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="fileMode"
                  checked={fileMode === "changed_only"}
                  onChange={() => setFileMode("changed_only")}
                  style={{ cursor: "pointer" }}
                />
                <span>Revert Changed Files (Overlay)</span>
              </label>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--vscode-descriptionForeground)",
                  marginLeft: "24px",
                }}
              >
                Only overwrites files present in the checkpoint. Keeps new
                files.
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  marginTop: "4px",
                }}
              >
                <input
                  type="radio"
                  name="fileMode"
                  checked={fileMode === "full_reset"}
                  onChange={() => setFileMode("full_reset")}
                  style={{ cursor: "pointer" }}
                />
                <span>Full Restore (Begin-Checkpoint)</span>
              </label>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--vscode-descriptionForeground)",
                  marginLeft: "24px",
                }}
              >
                Resets workspace to exact state of checkpoint.
              </div>
            </div>
          </Section>
        </Content>
        <Footer>
          <VSCodeButton appearance="secondary" onClick={onClose}>
            Cancel
          </VSCodeButton>
          <VSCodeButton
            appearance="primary"
            onClick={() =>
              onConfirm({ restoreChat, restoreFilesMode: fileMode })
            }
          >
            Revert
          </VSCodeButton>
        </Footer>
      </Dialog>
    </Overlay>
  );
};
