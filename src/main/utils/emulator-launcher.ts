import { exec, execSync, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { GenymotionProfile } from './genymotion-profiles';
import { setupCompleteProxy } from './mobile-proxy-config';
import { installFridaServer, startFridaServer } from './frida-manager';

const execAsync = promisify(exec);

export interface LaunchOptions {
  profile?: GenymotionProfile;
  proxyHost?: string;
  proxyPort?: number;
  skipProxy?: boolean;
  skipFrida?: boolean;
}

/**
 * Check if Genymotion is installed
 */
export async function isGenymotionInstalled(): Promise<boolean> {
  try {
    // Check for player binary
    execSync('which player', { stdio: 'ignore' });
    return true;
  } catch {
    // Also check VirtualBox as fallback
    try {
      execSync('which vboxmanage', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Check if Waydroid is installed
 */
export async function isWaydroidInstalled(): Promise<boolean> {
  try {
    execSync('which waydroid', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * List available Genymotion VMs
 */
export async function listGenymotionVMs(): Promise<string[]> {
  const vms = new Set<string>();

  // 1. Try VirtualBox
  try {
    const { stdout } = await execAsync('vboxmanage list vms');
    const lines = stdout.trim().split('\n');

    for (const line of lines) {
      const match = line.match(/^"(.+?)"\s+\{(.+?)\}$/);
      if (match) {
        vms.add(match[1]);
      }
    }
  } catch (error) {
    // Ignore, VBox might not be installed or used
  }

  // 2. Try Genymotion Deployed folder (QEMU/KVM)
  try {
    const home = process.env.HOME || process.env.USERPROFILE;
    if (home) {
      const genymotionPath = path.join(home, '.Genymobile', 'Genymotion', 'deployed');
      if (fs.existsSync(genymotionPath)) {
        const dirs = fs.readdirSync(genymotionPath, { withFileTypes: true });
        for (const dir of dirs) {
          if (dir.isDirectory()) {
            vms.add(dir.name);
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to list Genymotion deployed VMs:', error);
  }

  return Array.from(vms);
}

/**
 * Check if VM is running
 */
export async function isVMRunning(vmName: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync('vboxmanage list runningvms');
    return stdout.includes(`"${vmName}"`);
  } catch {
    return false;
  }
}

/**
 * Start Genymotion VM
 */
export async function startGenymotionVM(
  vmName: string,
  headless: boolean = false,
): Promise<boolean> {
  try {
    // Check if already running
    if (await isVMRunning(vmName)) {
      return true;
    }

    let playerPath = '';

    // 1. Try to find 'player' executable
    try {
      // Check PATH
      execSync('which player', { stdio: 'ignore' });
      playerPath = 'player';
    } catch {
      // Check common locations
      const home = process.env.HOME || process.env.USERPROFILE;
      if (home) {
        const commonPaths = [
          path.join(home, 'genymotion', 'genymotion', 'player'), // User's case
          '/opt/genymobile/genymotion/player',
          '/usr/local/bin/player',
        ];

        for (const p of commonPaths) {
          if (fs.existsSync(p)) {
            playerPath = p;
            break;
          }
        }
      }
    }

    if (playerPath) {
      try {
        const args = ['--vm-name', vmName];
        if (headless) {
          args.push('--no-window');
        }

        const child = spawn(playerPath, args, {
          detached: true,
          stdio: 'ignore',
        });

        child.unref();

        return true;
      } catch (spawnError) {
        console.error('Failed to spawn player:', spawnError);
        // Fallthrough to VBox fallback
      }
    }

    // 2. Fallback to VirtualBox (only works if utilizing VBox backend)
    const vboxType = headless ? 'headless' : 'gui';
    await execAsync(`vboxmanage startvm "${vmName}" --type ${vboxType}`);
    return true;
  } catch (error) {
    console.error(`Failed to start Genymotion VM '${vmName}':`, error);
    return false;
  }
}

/**
 * Stop Genymotion VM
 */
export async function stopGenymotionVM(vmName: string): Promise<boolean> {
  try {
    await execAsync(`vboxmanage controlvm "${vmName}" poweroff`);
    return true;
  } catch (error) {
    console.error('Failed to stop VM:', error);
    return false;
  }
}

/**
 * Start Waydroid
 */
export async function startWaydroid(): Promise<boolean> {
  try {
    // Start session
    await execAsync('waydroid session start &');

    // Wait a bit for session to initialize
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Show UI
    await execAsync('waydroid show-full-ui &');

    return true;
  } catch (error) {
    console.error('Failed to start Waydroid:', error);
    return false;
  }
}

/**
 * Stop Waydroid
 */
export async function stopWaydroid(): Promise<boolean> {
  try {
    await execAsync('waydroid session stop');
    return true;
  } catch (error) {
    console.error('Failed to stop Waydroid:', error);
    return false;
  }
}

/**
 * Launch Genymotion emulator with profile
 */
export async function launchGenymotionWithProfile(
  profile: GenymotionProfile,
  options: LaunchOptions = {},
  onProgress?: (status: string) => void,
): Promise<{ success: boolean; serial?: string }> {
  try {
    onProgress?.(`Launching Genymotion VM: ${profile.vmName}`);

    // Check if VM exists
    const vms = await listGenymotionVMs();
    if (!vms.includes(profile.vmName)) {
      onProgress?.(
        `Error: VM "${profile.vmName}" not found. Please create this VM in Genymotion first.`,
      );
      return { success: false };
    }

    // Start VM
    const started = await startGenymotionVM(profile.vmName);
    if (!started) {
      onProgress?.('Error: Failed to start VM');
      return { success: false };
    }

    // Wait for ADB connection
    onProgress?.('Waiting for emulator to boot...');
    await new Promise((resolve) => setTimeout(resolve, 15000)); // Wait 15 seconds

    // Determine serial (Genymotion typically uses specific IP)
    const serial = '192.168.56.101:5555'; // Default Genymotion IP

    try {
      await execAsync(`adb connect ${serial}`);
    } catch {
      onProgress?.('Warning: Failed to connect via ADB');
    }

    // Configure proxy if enabled
    if (profile.autoProxy && !options.skipProxy && options.proxyHost && options.proxyPort) {
      onProgress?.('Configuring proxy...');
      await setupCompleteProxy(serial, options.proxyHost, options.proxyPort, onProgress);
    }

    // Install and start Frida if enabled
    if (profile.autoFrida && !options.skipFrida) {
      onProgress?.('Setting up Frida...');
      await installFridaServer(serial, profile.architecture, onProgress);
      await startFridaServer(serial);
    }

    onProgress?.('Emulator ready!');
    return { success: true, serial };
  } catch (error: any) {
    console.error('Failed to launch Genymotion with profile:', error);
    onProgress?.(`Error: ${error.message}`);
    return { success: false };
  }
}

/**
 * Launch Waydroid with configuration
 */
export async function launchWaydroidWithConfig(
  options: LaunchOptions = {},
  onProgress?: (status: string) => void,
): Promise<{ success: boolean; serial?: string }> {
  try {
    onProgress?.('Starting Waydroid...');

    const started = await startWaydroid();
    if (!started) {
      onProgress?.('Error: Failed to start Waydroid');
      return { success: false };
    }

    // Wait for initialization
    onProgress?.('Waiting for Waydroid to initialize...');
    await new Promise((resolve) => setTimeout(resolve, 10000));

    const serial = '192.168.250.112:5555'; // Default Waydroid IP

    try {
      await execAsync(`adb connect ${serial}`);
    } catch {
      onProgress?.('Warning: Failed to connect via ADB');
    }

    // Configure proxy if requested
    if (!options.skipProxy && options.proxyHost && options.proxyPort) {
      onProgress?.('Configuring proxy...');
      await setupCompleteProxy(serial, options.proxyHost, options.proxyPort, onProgress);
    }

    // Install Frida if requested
    if (!options.skipFrida) {
      onProgress?.('Setting up Frida...');
      // Waydroid typically uses x86_64
      await installFridaServer(serial, 'x86_64', onProgress);
      await startFridaServer(serial);
    }

    onProgress?.('Waydroid ready!');
    return { success: true, serial };
  } catch (error: any) {
    console.error('Failed to launch Waydroid:', error);
    onProgress?.(`Error: ${error.message}`);
    return { success: false };
  }
}

/**
 * Get installation instructions for missing tools
 */
export function getInstallInstructions(): {
  genymotion: string;
  waydroid: string;
  adb: string;
} {
  return {
    genymotion: `
Genymotion Installation:
1. Download from: https://www.genymotion.com/download/
2. Install VirtualBox if not already installed
3. Create a virtual device with required Android version
4. Note: Commercial use requires a license

For desktop version (free):
  $ wget https://dl.genymotion.com/releases/genymotion-<version>/genymotion-<version>-linux_x64.bin
  $ chmod +x genymotion-<version>-linux_x64.bin
  $ ./genymotion-<version>-linux_x64.bin
    `.trim(),

    waydroid: `
Waydroid Installation:
Ubuntu/Debian:
  $ sudo apt install curl ca-certificates -y
  $ curl https://repo.waydro.id | sudo bash
  $ sudo apt install waydroid -y

Arch Linux:
  $ yay -S waydroid

Initialize Waydroid:
  $ sudo waydroid init
    `.trim(),

    adb: `
ADB (Android Debug Bridge) Installation:
Ubuntu/Debian:
  $ sudo apt install adb

Arch Linux:
  $ sudo pacman -S android-tools

Or download Android SDK Platform Tools:
  https://developer.android.com/tools/releases/platform-tools
    `.trim(),
  };
}
