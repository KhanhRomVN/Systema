import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

export interface CheckpointMetadata {
  id: string;
  timestamp: number;
  type: "full" | "incremental";
  parentId?: string;
  messageId?: string;
  totalSize: number; // Bytes (Project Total)
  storageSize?: number; // Bytes (Incremental Storage)
  files: { [relativePath: string]: { size: number; hash: string } };
  stats?: {
    added: number;
    modified: number;
    deleted: number;
  };
  changes?: {
    [path: string]: {
      status: "added" | "modified" | "deleted";
      additions: number;
      deletions: number;
    };
  };
}

// ... (existing code)

// ... (existing code, removed misplaced block)

export interface FileNode {
  name: string;
  path: string; // Relative path
  type: "file" | "folder";
  size: number;
  children?: FileNode[];
}

export class CheckpointService {
  private workspaceRoot: string;
  private storageRoot: string;

  constructor(workspaceRoot: string, storagePath?: string) {
    this.workspaceRoot = workspaceRoot;
    if (storagePath) {
      // Use extension storage if provided
      this.storageRoot = path.join(storagePath, "checkpoints");
    } else {
      // Fallback to workspace .zen folder
      this.storageRoot = path.join(workspaceRoot, ".zen", "checkpoints");
    }
  }

  private getCheckpointDir(): string {
    return this.storageRoot;
  }

  private async ensureCheckpointDir(): Promise<string> {
    const dir = this.getCheckpointDir();
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    return dir;
  }

  private async loadGitIgnore(): Promise<string[]> {
    const gitIgnorePath = path.join(this.workspaceRoot, ".gitignore");
    try {
      const content = await fs.promises.readFile(gitIgnorePath, "utf8");
      return content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"));
    } catch {
      return [];
    }
  }

  public async calculateProjectSize(): Promise<{
    totalSize: number;
    tree: FileNode;
  }> {
    const defaultIgnore = [
      ".git",
      "node_modules",
      ".zen",
      "dist",
      "out",
      "build",
      ".DS_Store",
    ];

    // Load .gitignore patterns
    const gitIgnorePatterns = await this.loadGitIgnore();

    // Helper to check ignore
    const shouldIgnore = (
      name: string,
      relativePath: string,
      isDir: boolean
    ): boolean => {
      if (defaultIgnore.includes(name)) return true;

      for (const pattern of gitIgnorePatterns) {
        // 1. Exact Name match (e.g. "secret.env")
        if (pattern === name) return true;

        // 2. Extension match (e.g. "*.log")
        if (pattern.startsWith("*") && name.endsWith(pattern.slice(1)))
          return true;

        // 3. Directory match (e.g. "logs/")
        if (isDir && pattern.endsWith("/") && pattern.slice(0, -1) === name)
          return true;

        // 4. Path match? (e.g. "src/temp")
        // If we are deep, relativePath helps.
        if (relativePath === pattern || relativePath === pattern + "/")
          return true;
      }
      return false;
    };

    const walk = async (
      currentPath: string,
      relativePath: string
    ): Promise<FileNode> => {
      const stats = await fs.promises.stat(currentPath);
      const name = path.basename(currentPath);

      if (stats.isFile()) {
        return {
          name,
          path: relativePath,
          type: "file",
          size: stats.size,
        };
      } else {
        const entries = await fs.promises.readdir(currentPath);
        let size = 0;
        const children: FileNode[] = [];

        for (const entry of entries) {
          const entryRelative = path.join(relativePath, entry);

          if (
            shouldIgnore(entry, entryRelative, true) ||
            shouldIgnore(entry, entryRelative, false)
          )
            continue;

          const entryPath = path.join(currentPath, entry);

          try {
            const child = await walk(entryPath, entryRelative);
            size += child.size;
            children.push(child);
          } catch (e) {
            // Ignore errors accessing files
          }
        }

        // Sort by size desc
        children.sort((a, b) => b.size - a.size);

        return {
          name,
          path: relativePath,
          type: "folder",
          size,
          children,
        };
      }
    };

    const tree = await walk(this.workspaceRoot, "");
    return { totalSize: tree.size, tree };
  }

  public async createCheckpoint(
    type: "full" | "incremental",
    messageId?: string,
    parentId?: string
  ): Promise<CheckpointMetadata | null> {
    const timestamp = Date.now();
    const id = crypto.randomUUID();
    const folderName = `${timestamp}_${type}_${id}`;
    const checkpointPath = path.join(
      await this.ensureCheckpointDir(),
      folderName
    );

    const { tree, totalSize } = await this.calculateProjectSize();

    const filesMap: { [relativePath: string]: { size: number; hash: string } } =
      {};

    // Helper to flatten tree and get hashes
    const processFile = async (node: FileNode) => {
      if (node.type === "file") {
        const absPath = path.join(this.workspaceRoot, node.path);
        const buffer = await fs.promises.readFile(absPath);
        const hash = crypto.createHash("md5").update(buffer).digest("hex");
        filesMap[node.path] = { size: node.size, hash };
        return { path: node.path, buffer };
      }
      if (node.children) {
        const results: { path: string; buffer: Buffer }[] = [];
        for (const child of node.children) {
          const childResults = await processFile(child);
          if (Array.isArray(childResults)) {
            results.push(...childResults);
          } else if (childResults) {
            results.push(childResults);
          }
        }
        return results;
      }
      return [];
    };

    const allFiles = (await processFile(tree)) as {
      path: string;
      buffer: Buffer;
    }[];

    let parentMetadata: CheckpointMetadata | null = null;
    let parentFolderName: string | null = null;

    if (!parentId && type === "incremental") {
      const allCheckpoints = await fs.promises.readdir(this.getCheckpointDir());

      // 🛑 Critical Fix: Filter out the current folderName being created!
      const candidates = allCheckpoints.filter((d) => d !== folderName);

      // Sort by timestamp (descending)
      const sorted = candidates.sort((a, b) => {
        const timeA = parseInt(a.split("_")[0]) || 0;
        const timeB = parseInt(b.split("_")[0]) || 0;
        return timeB - timeA;
      });

      if (sorted.length > 0) {
        // Iterate through candidates to find one with a manifest
        for (const candidate of sorted) {
          try {
            const candidatePath = path.join(this.getCheckpointDir(), candidate);
            await fs.promises.access(path.join(candidatePath, "manifest.json"));
            parentId = candidate; // Found a valid parent
            break; // Stop searching
          } catch (e) {}
        }
      }
    }

    if (parentId) {
      // Check parentId regardless of type to calculate stats
      // Find parent folder
      const allCheckpoints = await fs.promises.readdir(this.getCheckpointDir());
      const parentDir = allCheckpoints.find((d) => d.includes(parentId!)); // Use ! since we checked

      // If we found the folder (either from passed ID or fallback)
      if (parentDir) {
        parentFolderName = parentDir;
        try {
          const data = await fs.promises.readFile(
            path.join(this.getCheckpointDir(), parentDir, "manifest.json"),
            "utf8"
          );
          parentMetadata = JSON.parse(data);
        } catch (e) {
          console.error("Failed to load parent metadata", e);
        }
      } else {
        console.warn(
          `[CheckpointService] Parent checkpoint ${parentId} not found on disk.`
        );
      }
    }

    const filesToSave: { path: string; buffer: Buffer }[] = [];
    const finalFilesMapInManifest: {
      [relativePath: string]: { size: number; hash: string };
    } = {};
    // Helper: Simple Line Diff (LCS based)
    const computeDiff = (
      oldText: string,
      newText: string
    ): { additions: number; deletions: number } => {
      const oldLines = oldText.split("\n");
      const newLines = newText.split("\n");
      // Basic optimization: Prefix/Suffix match
      let start = 0;
      while (
        start < oldLines.length &&
        start < newLines.length &&
        oldLines[start] === newLines[start]
      ) {
        start++;
      }
      let endOld = oldLines.length - 1;
      let endNew = newLines.length - 1;
      while (
        endOld >= start &&
        endNew >= start &&
        oldLines[endOld] === newLines[endNew]
      ) {
        endOld--;
        endNew--;
      }

      const changedOld = endOld - start + 1;
      const changedNew = endNew - start + 1;

      // For now, treat replaced block as all del + all add (simplest robust metric without full Meyer's)
      // This satisfies the "lines added" + "lines deleted" roughly.
      return {
        additions: Math.max(0, changedNew),
        deletions: Math.max(0, changedOld),
      };
    };

    const changesMap: {
      [path: string]: {
        status: "added" | "modified" | "deleted";
        additions: number;
        deletions: number;
      };
    } = {};

    let added = 0;
    let modified = 0;
    let deleted = 0;

    // 1. Comparison for Stats and Incremental Saving
    for (const f of allFiles) {
      const currentHash = filesMap[f.path].hash;
      finalFilesMapInManifest[f.path] = filesMap[f.path]; // Always record

      if (parentMetadata) {
        const oldEntry = parentMetadata.files[f.path];
        if (!oldEntry) {
          // New file
          added++;
          filesToSave.push(f);
          const lineCount = f.buffer.toString("utf8").split("\n").length;
          changesMap[f.path] = {
            status: "added",
            additions: lineCount,
            deletions: 0,
          };
        } else if (oldEntry.hash !== currentHash) {
          // Modified file
          modified++;
          filesToSave.push(f);

          // Compute diff
          let diff = { additions: 0, deletions: 0 };
          try {
            // We need old content.
            // OPTIMIZATION: If we don't have old content easily (it's in a blob),
            // we might skip or read it. Reading might be slow.
            // But we are in "incremental" mostly.
            // We need to find the old blob path.
            if (parentFolderName) {
              const oldBlobPath = path.join(
                this.getCheckpointDir(),
                parentFolderName,
                f.path
              );
              const oldBuffer = await fs.promises.readFile(oldBlobPath);
              diff = computeDiff(
                oldBuffer.toString("utf8"),
                f.buffer.toString("utf8")
              );
            }
          } catch (e) {
            console.warn(
              `[CheckpointService] Failed to compute diff for ${f.path}`,
              e
            );
          }

          changesMap[f.path] = { status: "modified", ...diff };
        } else {
          // Unchanged
          if (type === "full") {
            filesToSave.push(f);
          }
        }
      } else {
        // No parent
        filesToSave.push(f);
        added++; // Technically all are added relative to null
        const lineCount = f.buffer.toString("utf8").split("\n").length;
        changesMap[f.path] = {
          status: "added",
          additions: lineCount,
          deletions: 0,
        };
      }
    }

    // Check for deleted files
    if (parentMetadata) {
      for (const oldPath of Object.keys(parentMetadata.files)) {
        if (!filesMap[oldPath]) {
          deleted++;
          // Need to find old file to count deletions?
          // For deletion, deletions = old lines, additions = 0
          let deletions = 0;
          try {
            if (parentFolderName) {
              const oldBlobPath = path.join(
                this.getCheckpointDir(),
                parentFolderName,
                oldPath
              );
              const oldContent = await fs.promises.readFile(
                oldBlobPath,
                "utf8"
              );
              deletions = oldContent.split("\n").length;
            }
          } catch {}

          changesMap[oldPath] = { status: "deleted", additions: 0, deletions };
        }
      }
    }

    // This handles both Auto and Manual checkpoint redundancy.
    if (parentMetadata && added === 0 && modified === 0 && deleted === 0) {
      return null;
    }

    // Write files
    // Ensure folder exists now that we are committed to saving
    await fs.promises.mkdir(checkpointPath, { recursive: true });

    let storageSize = 0;

    for (const f of filesToSave) {
      storageSize += f.buffer.length;
      const dest = path.join(checkpointPath, f.path);
      await fs.promises.mkdir(path.dirname(dest), { recursive: true });
      await fs.promises.writeFile(dest, f.buffer);
    }

    const metadata: CheckpointMetadata = {
      id,
      timestamp,
      type: type === "incremental" && !parentMetadata ? "full" : type,
      parentId,
      messageId,
      totalSize,
      storageSize, // 🆕 Add incremental storage size
      files: finalFilesMapInManifest,
      stats: parentMetadata ? { added, modified, deleted } : undefined,
      changes: parentMetadata ? changesMap : undefined,
    };

    await fs.promises.writeFile(
      path.join(checkpointPath, "manifest.json"),
      JSON.stringify(metadata, null, 2)
    );

    return metadata;
  }

  public async restoreCheckpoint(
    checkpointId: string,
    restoreMode: "changed_only" | "full_reset" = "changed_only"
  ): Promise<string | undefined> {
    const allCheckpoints = await fs.promises.readdir(this.getCheckpointDir());
    const checkpointDir = allCheckpoints.find((d) => d.includes(checkpointId));
    if (!checkpointDir) throw new Error(`Checkpoint ${checkpointId} not found`);

    const cpPath = path.join(this.getCheckpointDir(), checkpointDir);
    const manifestPath = path.join(cpPath, "manifest.json");
    const metadata: CheckpointMetadata = JSON.parse(
      await fs.promises.readFile(manifestPath, "utf8")
    );

    // If Full Reset: Delete files in workspace that are NOT in the checkpoint
    if (restoreMode === "full_reset") {
      const { tree } = await this.calculateProjectSize();
      // Helper to flatten current workspace files
      const flatten = (node: FileNode): string[] => {
        if (node.type === "file") return [node.path];
        if (node.children) return node.children.flatMap(flatten);
        return [];
      };
      const currentFiles = flatten(tree);
      const checkpointFiles = new Set(Object.keys(metadata.files));

      for (const file of currentFiles) {
        if (!checkpointFiles.has(file)) {
          // Delete file
          const absPath = path.join(this.workspaceRoot, file);
          try {
            await fs.promises.unlink(absPath);
            // Try to delete parent dir if empty? (Optional, maybe too aggressive)
          } catch (e) {
            console.warn(`Failed to delete ${file} during full reset`, e);
          }
        }
      }
    }

    // Restore files that ARE in the manifest
    for (const [relPath, info] of Object.entries(metadata.files)) {
      // Find content
      let contentBuffer: Buffer | null = null;
      let currentCpId: string | undefined = checkpointId;

      while (currentCpId) {
        const currDirName = allCheckpoints.find((d) =>
          d.includes(currentCpId!)
        );
        if (!currDirName) break;

        const currPath = path.join(this.getCheckpointDir(), currDirName);
        const possibleFilePath = path.join(currPath, relPath);

        if (fs.existsSync(possibleFilePath)) {
          contentBuffer = await fs.promises.readFile(possibleFilePath);
          break;
        }

        // If not found in this checkpoint, load its manifest to find parent
        try {
          const m = JSON.parse(
            await fs.promises.readFile(
              path.join(currPath, "manifest.json"),
              "utf8"
            )
          );
          currentCpId = m.parentId;
        } catch {
          break;
        }
      }

      if (contentBuffer) {
        const dest = path.join(this.workspaceRoot, relPath);
        await fs.promises.mkdir(path.dirname(dest), { recursive: true });
        await fs.promises.writeFile(dest, contentBuffer);
      } else {
        console.warn(
          `Could not find content for ${relPath} in checkpoint chain starting at ${checkpointId}`
        );
      }
    }
    return metadata.messageId;
  }
}
