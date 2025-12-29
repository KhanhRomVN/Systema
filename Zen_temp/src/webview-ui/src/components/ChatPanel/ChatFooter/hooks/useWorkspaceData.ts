import { useState, useEffect } from "react";
import { WorkspaceItem, Rule } from "../types";
import { getGitPrompt } from "../../../SettingsPanel/prompts";

export const useWorkspaceData = () => {
  const [availableFiles, setAvailableFiles] = useState<WorkspaceItem[]>([]);
  const [availableFolders, setAvailableFolders] = useState<WorkspaceItem[]>([]);
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [availableRules, setAvailableRules] = useState<Rule[]>([]);

  // Listen for workspace files/folders responses from extension
  useEffect(() => {
    const handleWorkspaceResponse = (event: MessageEvent) => {
      const data = event.data;

      if (data.command === "workspaceFilesResponse") {
        if (data.files && !data.error) {
          setAvailableFiles(data.files);
        } else if (data.error) {
          console.error(
            "[ChatFooter] Error getting workspace files:",
            data.error
          );
        }
      } else if (data.command === "workspaceFoldersResponse") {
        if (data.folders && !data.error) {
          setAvailableFolders(data.folders);
        } else if (data.error) {
          console.error(
            "[ChatFooter] Error getting workspace folders:",
            data.error
          );
        }
      } else if (data.command === "projectStructureBlacklistResponse") {
        if (data.blacklist) {
          setBlacklist(data.blacklist);
        }
      }
    };

    window.addEventListener("message", handleWorkspaceResponse);
    return () => {
      window.removeEventListener("message", handleWorkspaceResponse);
    };
  }, []);

  // Load rules from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("zen-rules");
    if (stored) {
      try {
        setAvailableRules(JSON.parse(stored));
      } catch (error) {
        console.error("[ChatFooter] Error loading rules:", error);
      }
    }
  }, []);

  const getGitCommitMessage = async (): Promise<string | null> => {
    // Request git changes from VS Code extension
    const vscodeApi = (window as any).vscodeApi;
    if (!vscodeApi) {
      console.error("[ChatFooter] vscodeApi not available");
      return null;
    }

    // Send request to get git changes
    vscodeApi.postMessage({
      command: "getGitChanges",
    });

    return new Promise((resolve) => {
      const handleGitChangesResponse = (event: MessageEvent) => {
        const data = event.data;

        if (data.command === "gitChangesResponse") {
          window.removeEventListener("message", handleGitChangesResponse);

          if (data.error) {
            console.error(
              "[ChatFooter] Error getting git changes:",
              data.error
            );
            resolve(`Error: ${data.error}`);
            return;
          }

          // Build commit message prompt
          const changedFiles = data.changes || [];

          if (changedFiles.length === 0) {
            resolve("No git changes found. Please make some changes first.");
            return;
          }

          // Get git prompt template from settings
          const language = localStorage.getItem("zen-language") || "en";
          const gitPromptTemplate = getGitPrompt(language);

          // Build the full prompt with file list only
          let gitPrompt = `${gitPromptTemplate}\n\n## Changed Files:\n`;

          changedFiles.forEach((file: any) => {
            gitPrompt += `- ${file.status}: ${file.path}\n`;
          });

          gitPrompt +=
            "\n\nPlease generate an appropriate commit message based on these changes.";

          resolve(gitPrompt);
        }
      };

      window.addEventListener("message", handleGitChangesResponse);

      // Timeout after 5 seconds
      setTimeout(() => {
        window.removeEventListener("message", handleGitChangesResponse);
        resolve(null);
      }, 5000);
    });
  };

  return {
    availableFiles,
    availableFolders,
    blacklist,
    availableRules,
    getGitCommitMessage,
  };
};
