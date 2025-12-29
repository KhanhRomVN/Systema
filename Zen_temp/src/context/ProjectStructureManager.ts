import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { GlobalStorageManager } from "../storage-manager";
import { ContextManager } from "./ContextManager";

export class ProjectStructureManager {
  private _blacklist: Set<string> = new Set();
  private readonly _storageKey = "zen-blacklist";

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _contextManager: ContextManager,
    private readonly _storageManager: GlobalStorageManager
  ) {}

  public async initialize(): Promise<void> {
    await this.loadBlacklist();
    await this.cleanupBlacklist();
    this.updateContextManager();
  }

  private async loadBlacklist(): Promise<void> {
    const data = await this._storageManager.get(this._storageKey);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          this._blacklist = new Set(parsed);
        }
      } catch (error) {
        console.error("Failed to parse blacklist:", error);
      }
    }
  }

  private async saveBlacklist(): Promise<void> {
    const data = JSON.stringify(Array.from(this._blacklist));
    await this._storageManager.set(this._storageKey, data);
    this.updateContextManager();
  }

  private updateContextManager(): void {
    this._contextManager.setBlacklist(Array.from(this._blacklist));
  }

  private async cleanupBlacklist(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    const toDelete: string[] = [];
    for (const folderPath of this._blacklist) {
      const absolutePath = path.join(workspaceFolder.uri.fsPath, folderPath);
      if (!fs.existsSync(absolutePath)) {
        toDelete.push(folderPath);
      }
    }

    if (toDelete.length > 0) {
      toDelete.forEach((p) => this._blacklist.delete(p));
      await this.saveBlacklist();
    }
  }

  public isBlacklisted(path: string): boolean {
    return this._blacklist.has(path);
  }

  public async getBlacklist(): Promise<string[]> {
    return Array.from(this._blacklist);
  }

  public async getRawFileTree() {
    return this._contextManager.getRawFileTree();
  }

  public async toggleBlacklist(path: string, selected: boolean): Promise<void> {
    if (selected) {
      this._blacklist.add(path);
    } else {
      this._blacklist.delete(path);
    }
    await this.saveBlacklist();
  }

  public async refresh(): Promise<void> {
    // Just re-save to trigger context update?
    // Context update is done in saveBlacklist.
    // Maybe reload from storage?
    await this.loadBlacklist();
  }
}
