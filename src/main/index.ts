import { app, BrowserWindow, ipcMain, protocol, net } from 'electron';
import { electronApp, optimizer } from '@electron-toolkit/utils';
import { windowManager } from './core/window';
import { setupEventHandlers } from './core/events';
import { ProxyManager } from './proxy/ProxyManager';
import { SingletonWSManager } from './server/SingletonWSManager';
import {
  createGenericWebWindow,
  closeAllGenericWebWindows,
  GenericWebWindowOptions,
} from './features/generic-web';
import { userAppStore, UserApp } from './store/apps';
import { scanInstalledApps } from './utils/app-scanner';
import { spawn, ChildProcess, exec, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dns from 'dns';

// Mobile utilities
import {
  checkADBAvailability,
  detectAllEmulators,
  getEmulatorDetails,
  isAppInstalled,
  getInstalledPackages,
  resolveEmulatorSerial,
} from './utils/mobile-detector';
import {
  installFridaServer,
  startFridaServer,
  stopFridaServer,
  isFridaRunning,
  injectSSLBypass,
  injectCustomScript,
  listRunningProcesses,
} from './utils/frida-manager';
import {
  configureEmulatorProxy,
  clearEmulatorProxy,
  setupCompleteProxy,
  installAPK,
  uninstallApp,
  launchApp,
  stopApp,
} from './utils/mobile-proxy-config';
import {
  getAllProfiles,
  getProfileById,
  createProfile,
  updateProfile,
  deleteProfile,
  GenymotionProfile,
} from './utils/genymotion-profiles';
import {
  isGenymotionInstalled,
  isWaydroidInstalled,
  listGenymotionVMs,
  stopGenymotionVM,
  stopWaydroid,
  launchGenymotionWithProfile,
  launchWaydroidWithConfig,
  getInstallInstructions,
} from './utils/emulator-launcher';

// Fix EAI_AGAIN DNS errors by preferring IPv4
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {}

// Ignore all certificate errors globally (fixes Proxy CA issues)
app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost', 'true');

// Global certificate error handler
app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
  // On certificate error we disable default behaviour (stop loading the page)
  // and we then say "it is all fine - true" to the callback
  event.preventDefault();
  callback(true);
});

const proxyManager = new ProxyManager();
const wsManager = SingletonWSManager.getInstance();
let activeChildProcess: ChildProcess | null = null;
let activeProxyUrl: string | null = null;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Initialize WS Server
  await wsManager.initialize();

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);

    // CRITICAL: Only set window for Systema Inspector (main window)
    // The main window is always the FIRST window created
    // Do NOT set for Claude Web or other target app windows!
    const allWindows = BrowserWindow.getAllWindows();
    const isMainWindow = allWindows.length === 1;

    if (isMainWindow) {
      proxyManager.setMainWindow(window);
      wsManager.setWindow(window);
    }
  });

  // Register 'media' protocol for serving local files
  protocol.handle('media', (request) => {
    const filePath = request.url.slice('media://'.length);
    // Decode URI component to handle spaces and special chars
    const decodedPath = decodeURIComponent(filePath);
    return net.fetch(`file://${decodedPath}`);
  });

  // Setup IPC event handlers
  setupEventHandlers();

  // Proxy IPC
  ipcMain.handle('proxy:create-session', async (_, appId: string) => {
    return await proxyManager.createSession(appId);
  });

  // Deprecated/Modified: 'proxy:start' might not be needed if we use create-session.
  // But for compatibility with existing tests or flows, we can keep it or alias it.
  ipcMain.handle('proxy:start', async () => {
    // This old signature is likely obsolete.
    // Let's assume frontend now calls 'proxy:create-session'
    return true;
  });

  ipcMain.handle('proxy:set-intercept', async (_, enabled: boolean, appId: string) => {
    // Front end needs to pass appId now if we want per-proxy intercept
    // For now, let's try to set for all or specific if provided
    if (appId) {
      return proxyManager.setIntercept(appId, enabled);
    }
    // Fallback: This might require iterating all sessions if no ID passed.
    // But simplest is to require ID.
    return false;
  });

  ipcMain.handle('proxy:forward-request', async (_, id: string) => {
    return proxyManager.forwardRequest(id);
  });

  ipcMain.handle('proxy:drop-request', async (_, id: string) => {
    return proxyManager.dropRequest(id);
  });

  ipcMain.handle('proxy:stop', async () => {
    proxyManager.stopAll();
    closeAllGenericWebWindows();
    if (activeChildProcess) {
      activeChildProcess.kill();
      activeChildProcess = null;
    }
    if (activeProxyUrl) {
      exec(`pkill -f -- "--proxy-server=${activeProxyUrl}"`);
      activeProxyUrl = null;
    }
    return true;
  });

  ipcMain.handle('app:terminate', async () => {
    closeAllGenericWebWindows();
    if (activeChildProcess) {
      activeChildProcess.kill();
      activeChildProcess = null;
    }
    if (activeProxyUrl) {
      exec(`pkill -f -- "--proxy-server=${activeProxyUrl}"`);
      activeProxyUrl = null;
    }
    return true;
  });

  // Helper to launch browser
  const launchBrowser = (url: string, profileName: string, proxyUrl: string) => {
    activeProxyUrl = proxyUrl;
    const userDataDir = path.join(app.getPath('userData'), 'profiles', profileName);
    fs.mkdirSync(userDataDir, { recursive: true });

    // Find browser (Linux)
    const browsers = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];
    let executable = '';
    for (const b of browsers) {
      try {
        execSync(`which ${b}`);
        executable = b;
        break;
      } catch {
        continue;
      }
    }

    if (!executable) {
      return false;
    }

    const child = spawn(
      executable,
      [
        '--proxy-server=' + proxyUrl,
        '--ignore-certificate-errors',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-http2',
        '--disable-quic',
        `--user-data-dir=${userDataDir}`,
        url,
      ],
      {
        detached: true,
        stdio: 'ignore',
      },
    );
    activeChildProcess = child;

    child.on('exit', () => {
      if (activeChildProcess === child) {
        activeChildProcess = null;
        activeProxyUrl = null;
      }
    });

    child.unref();
    return true;
  };

  // App Launcher IPC
  ipcMain.handle(
    'app:launch',
    async (
      _,
      appName: string,
      proxyUrl: string,
      customUrl?: string,
      forceMode?: 'browser' | 'electron',
    ) => {
      if (appName === 'vscode') {
        activeProxyUrl = proxyUrl;
        // Using 'code' command assuming it's in PATH
        const child = spawn(
          'code',
          [
            '--wait',
            '--new-window',
            '--proxy-server=' + proxyUrl,
            '--ignore-certificate-errors',
            '.',
          ],
          {
            detached: true,
            stdio: 'ignore',
            shell: true, // For Windows/Linux compatibility with command resolution
          },
        );
        activeChildProcess = child;

        child.on('exit', () => {
          if (activeChildProcess === child) {
            activeChildProcess = null;
            // Don't clear activeProxyUrl here immediately, as we might want to ensure cleanup on explicit stop
            // But effectively if it exits, it's gone.
            activeProxyUrl = null;
          }
        });

        child.unref();
        return true;
      }

      if (appName === 'antigravity') {
        activeProxyUrl = proxyUrl;
        // Create a clean environment by copying process.env and removing Electron-specific variables
        const env = { ...process.env };
        delete env.ELECTRON_RUN_AS_NODE;
        delete env.ELECTRON_NO_ATTACH_CONSOLE;
        delete env.ELECTRON_EXEC_PATH;
        delete env.ATOM_SHELL_INTERNAL_RUN_AS_NODE; // often used by Electron

        const args = [
          '--wait',
          '--new-window',
          '--verbose', // Add verbose flag for better debugging
          '--proxy-server=' + proxyUrl,
          '--ignore-certificate-errors',
          '.',
        ];

        // Using absolute path to ensure we find the executable
        const child = spawn('/usr/bin/antigravity', args, {
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'], // Capture stdio for debugging
          shell: false, // execute directly
          env, // Use the sanitized environment
        });
        activeChildProcess = child;

        if (child.stdout) {
          child.stdout.on('data', () => {});
        }

        if (child.stderr) {
          child.stderr.on('data', (data) => {
            console.error(`[Antigravity stderr]: ${data}`);
          });
        }

        child.on('error', (err) => {
          console.error('[Antigravity] Failed to start process:', err);
        });

        child.on('exit', () => {
          if (activeChildProcess === child) {
            activeChildProcess = null;
            activeProxyUrl = null;
          }
        });

        child.unref();
        return true;
      }

      // App Configurations Map for Electron Mode
      const electronApps: Record<string, { url: string; options?: GenericWebWindowOptions }> = {
        'claude-web': { url: 'https://claude.ai' },
        'deepseek-electron': {
          url: 'https://chat.deepseek.com',
          options: { clearSession: true, useCloudflareBypass: true },
        },
        'mistral-electron': { url: 'https://console.mistral.ai/build/playground' },
        'kimi-electron': { url: 'https://www.kimi.com/' },
        'chatgpt-electron': { url: 'https://chatgpt.com', options: { useCloudflareBypass: true } },
        'qwen-electron': { url: 'https://chat.qwen.ai/' },
        'grok-electron': { url: 'https://grok.com/' },
        'groq-electron': {
          url: customUrl || 'https://console.groq.com/playground',
        },
        'cohere-electron': { url: 'https://dashboard.cohere.com/playground/chat' },
        'perplexity-electron': { url: 'https://www.perplexity.ai/' },
        'phind-electron': { url: 'https://www.phind.com/' },
        'gemini-electron': { url: 'https://gemini.google.com/app?hl=vi' },
        'duckduckgo-electron': {
          url: 'https://duckduckgo.com/?q=DuckDuckGo+AI+Chat&ia=chat&duckai=1',
        },
        'context7-electron': { url: 'https://context7.com/chat' },
        'askcodi-electron': { url: 'https://www.askcodi.com/chat' },
        'deepseek-r1-together-electron': {
          url: 'https://api.together.ai/playground/deepseek-ai/DeepSeek-R1-0528-tput',
        },
        'zai-electron': {
          url: 'https://chat.z.ai/',
          options: { clearSession: true }, // Ensure fresh login for Zai
        },
        'huggingface-electron': { url: 'https://huggingface.co/chat/' },
        'poe-electron': { url: 'https://poe.com/' },
        'elicit-electron': { url: 'https://elicit.com/' },
        'lmarena-electron': { url: 'https://lmarena.ai/vi/c/new?mode=direct' },
      };

      if (electronApps[appName]) {
        // If forced to browser, check if we have a web mapping or just launch URL
        if (forceMode === 'browser') {
          const url = electronApps[appName].url;
          return launchBrowser(url, appName, proxyUrl);
        }

        activeProxyUrl = proxyUrl;
        const config = electronApps[appName];
        const win = await createGenericWebWindow(appName, config.url, proxyUrl, config.options);
        return !!win;
      }

      // Web Apps
      const webApps: Record<string, string> = {
        'deepseek-browser': 'https://chat.deepseek.com',
        'chatgpt-browser': 'https://chatgpt.com',
        'google-aistudio': 'https://aistudio.google.com/prompts/new_chat',
        'gemini-browser': 'https://gemini.google.com/app?hl=vi',
        'kimi-browser': 'https://www.kimi.com/',
        'duckduckgo-browser': 'https://duckduckgo.com/?q=DuckDuckGo+AI+Chat&ia=chat&duckai=1',
        'qwen-browser': 'https://chat.qwen.ai/',
        'groq-browser': 'https://console.groq.com/playground',
        'grok-browser': 'https://grok.com/',
        'cohere-browser': 'https://dashboard.cohere.com/playground/chat',
        'mistral-browser': 'https://console.mistral.ai/build/playground',
        'perplexity-browser': 'https://www.perplexity.ai/',
        'phind-browser': 'https://www.phind.com/',
        'context7-browser': 'https://context7.com/chat',
        'askcodi-browser': 'https://www.askcodi.com/chat',
        'deepseek-r1-together-browser':
          'https://api.together.ai/playground/deepseek-ai/DeepSeek-R1-0528-tput',
        'zai-browser': 'https://chat.z.ai/',
        'huggingface-browser': 'https://huggingface.co/chat/',
        'poe-browser': 'https://poe.com/',
        'elicit-browser': 'https://elicit.com/',
        'lmarena-browser': 'https://lmarena.ai/vi/c/new?mode=direct',
      };

      if (webApps[appName]) {
        // If forced to electron, try to launch as generic window
        if (forceMode === 'electron') {
          activeProxyUrl = proxyUrl;
          const win = await createGenericWebWindow(appName, webApps[appName], proxyUrl, {
            useCloudflareBypass: true, // reasonable default
          });
          return !!win;
        }
        return launchBrowser(webApps[appName], appName, proxyUrl);
      }

      // Check User Apps
      const userApp = userAppStore.getAppById(appName);
      if (userApp) {
        if (userApp.platform === 'web' && userApp.url) {
          // Use forceMode if provided, otherwise default to userApp.mode
          const modeToUse = forceMode || userApp.mode;

          if (modeToUse === 'browser') {
            return launchBrowser(userApp.url, userApp.id, proxyUrl);
          } else if (modeToUse === 'electron') {
            activeProxyUrl = proxyUrl;
            const win = await createGenericWebWindow(userApp.id, userApp.url, proxyUrl, {
              title: userApp.name,
              // Add logical defaults for user apps if needed, e.g. CF bypass
              useCloudflareBypass: true, // often needed for modern AI sites
            });
            return !!win;
          }
        } else if (
          userApp.platform === 'pc' &&
          userApp.mode === 'native' &&
          userApp.executablePath
        ) {
          // Launch Native App
          const child = spawn(userApp.executablePath, [], {
            detached: true,
            stdio: 'ignore',
          });
          child.unref();
          return true;
        } else if (userApp.platform === 'android') {
          // Launch Mobile App
          let serial = userApp.emulatorSerial;

          // If no package name is present, we treat this as "Launch Emulator" (Genymotion VM)
          if (!userApp.packageName) {
            if (serial) {
              const vmName = serial;
              // Check if VM is running
              const emulators = await detectAllEmulators();
              console.log(`[AppLaunch] Checking Android VM status for stored: "${vmName}"`);
              console.log(`[AppLaunch] Checking Android VM status for stored: "${vmName}"`);

              const isRunning = emulators.some((e) => {
                const storedName = vmName.toLowerCase();
                const runningName = e.name.toLowerCase();
                const runningSerial = e.serial.toLowerCase();
                const runningId = (e.id || '').toLowerCase();

                // 1. Exact match (serial, name, or ID)
                if (
                  runningName === storedName ||
                  runningSerial === storedName ||
                  runningId === storedName
                ) {
                  if (
                    runningName === storedName ||
                    runningSerial === storedName ||
                    runningId === storedName
                  ) {
                    return true;
                  }
                }

                // 2. Fuzzy match: check if one contains the other (e.g. "moto x" in "motorola moto x")
                // EXCEPTION: Do not fuzzy match if storedName is a UUID (length 36, contains dashes) to prevent false positives
                const isStoredUUID =
                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                    storedName,
                  );

                if (
                  !isStoredUUID &&
                  (storedName.includes(runningName) || runningName.includes(storedName))
                ) {
                  return true;
                }

                return false;
              });

              if (isRunning) {
                console.log(`[AppLaunch] VM "${vmName}" is confirmed running.`);
                // If running, we might want to ensure proxy is configured, but usually
                // that happens when we "Connect" or "Intercept".
                // For now, just return true to indicate it's ready for inspection.
                return true;
              } else {
                return false;
              }
            }
            return false;
          }

          // Mobile App Launch (requires packageName)
          // If no serial assigned, find any running emulator
          if (!serial) {
            const emulators = await detectAllEmulators();
            if (emulators.length > 0) {
              serial = emulators[0].serial;
            }
          }

          if (!serial) {
            console.error('No running emulator found');
            return false;
          }

          // Configure absolute proxy (http://127.0.0.1:8081 -> host/port)
          try {
            const url = new URL(proxyUrl);
            const host = url.hostname;
            const port = parseInt(url.port);

            // Auto-configure proxy when launching app
            await configureEmulatorProxy(serial, host, port);
          } catch (e) {
            console.error('Failed to configure proxy for mobile app', e);
          }

          // Launch the app
          return await launchApp(serial, userApp.packageName);
        }
      }

      return false;
    },
  );

  // WebSocket Port IPC
  ipcMain.handle('ws:get-port', () => {
    return wsManager.getPort();
  });

  ipcMain.handle('ws:send', (_, message: any) => {
    wsManager.sendToClients(message);
    return true;
  });

  // User Apps IPC
  ipcMain.handle('apps:get-all', () => {
    return userAppStore.getAllApps();
  });

  ipcMain.handle('apps:create', (_, appData: Omit<UserApp, 'id' | 'createdAt'>) => {
    return userAppStore.addApp(appData);
  });

  ipcMain.handle('apps:delete', (_, id: string) => {
    return userAppStore.deleteApp(id);
  });

  ipcMain.handle('apps:scan-pc', async () => {
    return await scanInstalledApps();
  });

  // ===== Mobile IPC Handlers =====

  // Mobile System Check
  ipcMain.handle('mobile:check-adb', async () => {
    return await checkADBAvailability();
  });

  ipcMain.handle('mobile:check-tools', async () => {
    const [genymotion, waydroid, adb] = await Promise.all([
      isGenymotionInstalled(),
      isWaydroidInstalled(),
      checkADBAvailability(),
    ]);

    return {
      genymotion,
      waydroid,
      adb: adb.available,
      adbVersion: adb.version,
      installInstructions: getInstallInstructions(),
    };
  });

  // Emulator Detection
  ipcMain.handle('mobile:detect-emulators', async () => {
    return await detectAllEmulators();
  });

  ipcMain.handle('mobile:get-emulator-details', async (_, serial: string) => {
    return await getEmulatorDetails(serial);
  });

  // Emulator Launch
  ipcMain.handle('mobile:list-genymotion-vms', async () => {
    return await listGenymotionVMs();
  });

  ipcMain.handle(
    'mobile:launch-genymotion',
    async (_, profileId: string, proxyHost?: string, proxyPort?: number) => {
      const profile = getProfileById(profileId);
      if (!profile) {
        return { success: false, error: 'Profile not found' };
      }

      return await launchGenymotionWithProfile(profile, { proxyHost, proxyPort }, (status) => {
        // Send progress updates to renderer
        const win = windowManager.getMainWindow();
        if (win) {
          win.webContents.send('mobile:launch-progress', status);
        }
      });
    },
  );

  ipcMain.handle('mobile:launch-waydroid', async (_, proxyHost?: string, proxyPort?: number) => {
    return await launchWaydroidWithConfig({ proxyHost, proxyPort }, (status) => {
      const win = windowManager.getMainWindow();
      if (win) {
        win.webContents.send('mobile:launch-progress', status);
      }
    });
  });

  // Frida IPC
  // Frida IPC
  ipcMain.handle('mobile:check-frida', async (_, serial: string) => {
    const resolvedSerial = await resolveEmulatorSerial(serial);
    if (!resolvedSerial) return false;
    return await isFridaRunning(resolvedSerial);
  });

  ipcMain.handle('mobile:install-frida', async (_, serial: string) => {
    const resolvedSerial = await resolveEmulatorSerial(serial);
    if (!resolvedSerial) {
      console.error(`Could not resolve emulator serial from: ${serial}`);
      return false;
    }

    const details = await getEmulatorDetails(resolvedSerial);
    // Note: getEmulatorDetails returns arch from getprop ro.product.cpu.abi
    // FRIDA_DOWNLOAD_URLS keys: arm, arm64, x86, x86_64.
    // We should map standard ABI strings to Frida keys.
    let fridaArch = 'x86'; // default fallback

    if (details) {
      if (details.architecture.includes('arm64')) fridaArch = 'arm64';
      else if (details.architecture.includes('arm')) fridaArch = 'arm';
      else if (details.architecture.includes('x86_64')) fridaArch = 'x86_64';
      else if (details.architecture.includes('x86')) fridaArch = 'x86';
    }

    const win = windowManager.getMainWindow();
    return await installFridaServer(resolvedSerial, fridaArch, (status) => {
      if (win) win.webContents.send('mobile:frida-progress', status);
    });
  });

  ipcMain.handle('mobile:start-frida', async (_, serial: string) => {
    const resolvedSerial = await resolveEmulatorSerial(serial);
    if (!resolvedSerial) return false;
    return await startFridaServer(resolvedSerial);
  });

  ipcMain.handle('mobile:inject-ssl-bypass', async (_, serial: string, packageName: string) => {
    const resolvedSerial = await resolveEmulatorSerial(serial);
    if (!resolvedSerial) return false;

    const win = windowManager.getMainWindow();
    return await injectSSLBypass(resolvedSerial, packageName, (msg) => {
      if (win) win.webContents.send('mobile:frida-log', msg);
    });
  });

  ipcMain.handle('mobile:stop-frida', async (_, serial: string) => {
    const resolvedSerial = await resolveEmulatorSerial(serial);
    if (!resolvedSerial) return false;
    return await stopFridaServer(resolvedSerial);
  });

  ipcMain.handle(
    'mobile:inject-custom-script',
    async (_, serial: string, packageName: string, script: string) => {
      const resolvedSerial = await resolveEmulatorSerial(serial);
      if (!resolvedSerial) return false;

      return await injectCustomScript(resolvedSerial, packageName, script, (log) => {
        const win = windowManager.getMainWindow();
        if (win) {
          win.webContents.send('mobile:frida-log', log);
        }
      });
    },
  );

  ipcMain.handle('mobile:list-processes', async (_, serial: string) => {
    const resolvedSerial = await resolveEmulatorSerial(serial);
    if (!resolvedSerial) return [];
    return await listRunningProcesses(resolvedSerial);
  });

  ipcMain.handle(
    'mobile:stop-emulator',
    async (_, vmName: string, type: 'genymotion' | 'waydroid') => {
      if (type === 'genymotion') {
        return await stopGenymotionVM(vmName);
      } else {
        return await stopWaydroid();
      }
    },
  );

  // Proxy Configuration
  ipcMain.handle(
    'mobile:configure-proxy',
    async (_, serial: string, proxyHost: string, proxyPort: number) => {
      return await configureEmulatorProxy(serial, proxyHost, proxyPort);
    },
  );

  ipcMain.handle('mobile:clear-proxy', async (_, serial: string) => {
    return await clearEmulatorProxy(serial);
  });

  ipcMain.handle(
    'mobile:setup-complete-proxy',
    async (_, serial: string, proxyHost: string, proxyPort: number) => {
      return await setupCompleteProxy(serial, proxyHost, proxyPort, (status) => {
        const win = windowManager.getMainWindow();
        if (win) {
          win.webContents.send('mobile:proxy-progress', status);
        }
      });
    },
  );

  // App Management
  ipcMain.handle('mobile:install-apk', async (_, serial: string, apkPath: string) => {
    return await installAPK(serial, apkPath, (status) => {
      const win = windowManager.getMainWindow();
      if (win) {
        win.webContents.send('mobile:install-progress', status);
      }
    });
  });

  ipcMain.handle('mobile:uninstall-app', async (_, serial: string, packageName: string) => {
    return await uninstallApp(serial, packageName);
  });

  ipcMain.handle('mobile:launch-app', async (_, serial: string, packageName: string) => {
    return await launchApp(serial, packageName);
  });

  ipcMain.handle('mobile:stop-app', async (_, serial: string, packageName: string) => {
    return await stopApp(serial, packageName);
  });

  ipcMain.handle('mobile:check-app-installed', async (_, serial: string, packageName: string) => {
    return await isAppInstalled(serial, packageName);
  });

  ipcMain.handle('mobile:list-packages', async (_, serial: string) => {
    return await getInstalledPackages(serial);
  });

  // Profile Management
  ipcMain.handle('mobile:get-profiles', async () => {
    return getAllProfiles();
  });

  ipcMain.handle('mobile:get-profile', async (_, profileId: string) => {
    return getProfileById(profileId);
  });

  ipcMain.handle(
    'mobile:create-profile',
    async (_, profileData: Omit<GenymotionProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
      return createProfile(profileData);
    },
  );

  ipcMain.handle(
    'mobile:update-profile',
    async (_, profileId: string, updates: Partial<GenymotionProfile>) => {
      return updateProfile(profileId, updates);
    },
  );

  ipcMain.handle('mobile:delete-profile', async (_, profileId: string) => {
    return deleteProfile(profileId);
  });

  // Create main window
  windowManager.createMainWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createMainWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
// explicit with Cmd + Q.
const cleanup = () => {
  proxyManager.stopAll();
  closeAllGenericWebWindows();
  if (activeChildProcess) {
    activeChildProcess.kill();
    activeChildProcess = null;
  }
  if (activeProxyUrl) {
    // Attempt to kill VS Code launched with this specific proxy
    try {
      execSync(`pkill -f -- "--proxy-server=${activeProxyUrl}"`);
    } catch (e: any) {
      // pkill returns exit code 1 if no matched processes are found, which is fine
      if (e.status !== 1) {
        console.error('Failed to pkill VS Code during cleanup:', e);
      }
    }
    activeProxyUrl = null;
  }
};

app.on('before-quit', () => {
  cleanup();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
