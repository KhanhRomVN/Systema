import * as fs from 'fs';
import * as path from 'path';

export interface DiscoveredApp {
  name: string;
  exec: string;
  icon?: string;
  description?: string;
  path: string; // Path to the .desktop file
}

const APPLICATIONS_PATHS = [
  '/usr/share/applications',
  path.join(process.env.HOME || '', '.local/share/applications'),
];

const ICON_THEME_PATHS = [
  '/usr/share/icons/hicolor/48x48/apps',
  '/usr/share/icons/hicolor/128x128/apps',
  '/usr/share/icons/hicolor/256x256/apps',
  '/usr/share/icons/hicolor/scalable/apps',
  '/usr/share/pixmaps',
  path.join(process.env.HOME || '', '.local/share/icons/hicolor/48x48/apps'),
];

function findIconPath(iconName?: string): string | undefined {
  if (!iconName) return undefined;

  // If absolute path
  if (path.isAbsolute(iconName)) {
    return fs.existsSync(iconName) ? iconName : undefined;
  }

  // Look in theme paths
  const extensions = ['.png', '.svg', '.xpm', ''];
  for (const dir of ICON_THEME_PATHS) {
    if (!fs.existsSync(dir)) continue;
    for (const ext of extensions) {
      const iconPath = path.join(dir, `${iconName}${ext}`);
      // Case sensitive check usually, but let's try direct access
      if (fs.existsSync(iconPath)) {
        return iconPath;
      }
    }
  }

  return undefined;
}

export const scanInstalledApps = async (): Promise<DiscoveredApp[]> => {
  const apps: DiscoveredApp[] = [];
  const seenExecs = new Set<string>();

  for (const dir of APPLICATIONS_PATHS) {
    if (!fs.existsSync(dir)) continue;

    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith('.desktop')) continue;

        const filePath = path.join(dir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const entry = parseDesktopFile(content);

          // Basic validation
          if (entry && entry.Name && entry.Exec && !entry.NoDisplay) {
            // Clean up Exec command (remove %f, %u etc)
            const cleanExec = entry.Exec.replace(/%[fFuUdDnNijkvm]/g, '').trim();

            // Avoid duplicates based on Exec command (simplified)
            // Just usage first word as key might be too aggressive,
            // but full string might verify arguments.
            // Let's use name + exec signature to dedupe.
            const uniqueKey = `${entry.Name}:${cleanExec}`;

            if (!seenExecs.has(uniqueKey)) {
              seenExecs.add(uniqueKey);
              apps.push({
                name: entry.Name,
                exec: cleanExec,
                icon: findIconPath(entry.Icon),
                description: entry.Comment,
                path: filePath,
              });
            }
          }
        } catch (e) {
          // Ignore read errors for individual files
        }
      }
    } catch (e) {
      console.error(`Failed to scan directory ${dir}:`, e);
    }
  }
  // Sort by name
  return apps.sort((a, b) => a.name.localeCompare(b.name));
};

interface DesktopEntry {
  Name?: string;
  Exec?: string;
  Icon?: string;
  Comment?: string;
  NoDisplay?: boolean;
}

function parseDesktopFile(content: string): DesktopEntry | null {
  const lines = content.split('\n');
  const entry: DesktopEntry = {};
  let inDesktopEntry = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '[Desktop Entry]') {
      inDesktopEntry = true;
      continue;
    }

    // Only care about main section (handling others is complex)
    if (trimmed.startsWith('[') && trimmed !== '[Desktop Entry]') {
      inDesktopEntry = false;
    }

    if (!inDesktopEntry) continue;

    if (trimmed.startsWith('Name=')) {
      entry.Name = trimmed.substring(5);
    } else if (trimmed.startsWith('Exec=')) {
      entry.Exec = trimmed.substring(5);
    } else if (trimmed.startsWith('Icon=')) {
      entry.Icon = trimmed.substring(5);
    } else if (trimmed.startsWith('Comment=')) {
      entry.Comment = trimmed.substring(8);
    } else if (trimmed.startsWith('NoDisplay=')) {
      entry.NoDisplay = trimmed.substring(10).toLowerCase() === 'true';
    }
  }

  // Sometimes localized names exist, but we just take the first unlocalized one usually.
  // Real parsers are more complex, but this suffices for "Name="
  return entry;
}
