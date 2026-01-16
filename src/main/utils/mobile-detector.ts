import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export type EmulatorType = 'genymotion' | 'waydroid';

export interface MobileEmulator {
  type: EmulatorType;
  serial: string;
  name: string;
  id?: string; // Original VM Identifier (e.g. UUID from process or VBox ID)
  ip: string;
  adbPort: number;
  androidVersion: string;
  architecture: string;
  status: 'running' | 'offline' | 'booting';
}

/**
 * Check if ADB is available on the system
 */
export async function checkADBAvailability(): Promise<{
  available: boolean;
  path?: string;
  version?: string;
  message?: string;
}> {
  try {
    const { stdout } = await execAsync('which adb');
    const adbPath = stdout.trim();

    if (!adbPath) {
      return {
        available: false,
        message: 'ADB not found in PATH. Please install Android SDK Platform Tools.',
      };
    }

    // Get ADB version
    try {
      const { stdout: versionOutput } = await execAsync('adb version');
      const versionMatch = versionOutput.match(/Android Debug Bridge version ([\d.]+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';

      return {
        available: true,
        path: adbPath,
        version,
      };
    } catch (e) {
      return {
        available: true,
        path: adbPath,
        version: 'unknown',
      };
    }
  } catch (error) {
    return {
      available: false,
      message:
        'ADB not found. Please install Android SDK Platform Tools:\n' +
        '  Ubuntu/Debian: sudo apt install adb\n' +
        '  Arch Linux: sudo pacman -S android-tools\n' +
        '  Or download from: https://developer.android.com/tools/releases/platform-tools',
    };
  }
}

/**
 * Detect running Genymotion emulators
 */
/**
 * Detect running Genymotion emulators (VirtualBox & QEMU)
 */
export async function detectGenymotionEmulators(): Promise<MobileEmulator[]> {
  const emulators: MobileEmulator[] = [];

  try {
    // Strategy 1: VirtualBox (Legacy/Standard)
    let vboxVMs: Map<string, string> = new Map(); // Name -> IP
    // console.log('[MobileDetector] Starting Genymotion detection...');
    try {
      // Only try if vboxmanage is in path
      execSync('which vboxmanage', { stdio: 'ignore' });
      // console.log('[MobileDetector] vboxmanage found, checking runningvms...');
      const { stdout } = await execAsync('vboxmanage list runningvms');
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const match = line.match(/^"(.+?)"\s+\{(.+?)\}$/);
        if (match) {
          const name = match[1];
          // Try to get IP
          try {
            const { stdout: ipOut } = await execAsync(
              `vboxmanage guestproperty get "${name}" "/VirtualBox/GuestInfo/Net/0/V4/IP"`,
            );
            const ipMatch = ipOut.match(/Value: ([\d.]+)/);
            if (ipMatch) {
              vboxVMs.set(name, ipMatch[1]);
            }
          } catch {}
        }
      }
    } catch {
      console.log('[MobileDetector] vboxmanage not found or failed.');
    }

    // Strategy 2: Process Scanning (QEMU/KVM)
    // Find all 'player' processes which indicate a running Genymotion VM
    let runningVMNames: Set<string> = new Set(vboxVMs.keys());
    try {
      // console.log('[MobileDetector] Scanning processes for "player"...');
      const { stdout: psOut } = await execAsync('ps -ef');
      const lines = psOut.split('\n');
      for (const line of lines) {
        // Genymotion player command usually looks like: .../player --vm-name "Device Name" ...
        if (
          line.includes('player') &&
          (line.includes('--vm-name') || line.includes('genymotion'))
        ) {
          const match = line.match(/--vm-name\s+"([^"]+)"/);
          if (match) {
            runningVMNames.add(match[1]);
          } else {
            // Check for non-quoted or other formats if necessary
            const match2 = line.match(/--vm-name\s+([^\s]+)/);
            if (match2) {
              runningVMNames.add(match2[1]);
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to scan processes:', e);
    }

    // Now scan ADB devices to find matches
    const { stdout: adbOut } = await execAsync('adb devices');
    const adbLines = adbOut.trim().split('\n').slice(1); // skip "List of devices attached"

    for (const line of adbLines) {
      const parts = line.split('\t');
      if (parts.length < 2) continue;
      const serial = parts[0].trim();
      const status = parts[1].trim();

      // console.log(`[MobileDetector] Checking device: ${serial} (${status})`);

      if (status !== 'device') continue;

      try {
        // Check if it is Genymotion
        const manufacturer = (
          await execAsync(`adb -s ${serial} shell getprop ro.product.manufacturer`)
        ).stdout.trim();

        // Allow both Genymotion and Genymobile (newer versions/images)
        if (manufacturer !== 'Genymotion' && manufacturer !== 'Genymobile') {
          // console.log(`[MobileDetector] Skipping non-Genymotion device: ${serial}`);
          continue;
        }

        const model = (
          await execAsync(`adb -s ${serial} shell getprop ro.product.model`)
        ).stdout.trim();
        const androidVersion = (
          await execAsync(`adb -s ${serial} shell getprop ro.build.version.release`)
        ).stdout.trim();
        const architecture = (
          await execAsync(`adb -s ${serial} shell getprop ro.product.cpu.abi`)
        ).stdout.trim();
        const bootComplete = (
          await execAsync(`adb -s ${serial} shell getprop sys.boot_completed`)
        ).stdout.trim();

        // Try to find exact VM Name match
        // If we found it via VBox, we have the IP-to-Name mapping
        let name = model; // Default to model

        // VBox matching
        // serial is typically IP:5555
        const ip = serial.split(':')[0];
        for (const [vmName, vmIp] of vboxVMs.entries()) {
          if (vmIp === ip) {
            name = vmName;
            break;
          }
        }

        // If not found via VBox, checking if any of the running VM names (from ps) allow us to guess
        // If only 1 VM is running, we can assume this ADB device is that VM
        // This is a heuristic for QEMU where explicit mapping is hard without `genymotion-shell`
        let vmId: string | undefined;

        if (runningVMNames.size === 1 && name === model) {
          // Only overwrite if the running VM name looks human readable, NOT a UUID
          // Users see human names in the list. QEMU often uses UUID as --vm-name.
          const candidate = Array.from(runningVMNames)[0];
          vmId = candidate; // Store the raw ID (UUID)

          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            candidate,
          );

          if (!isUUID) {
            name = candidate;
          } else {
            // Keep model name if process name is UUID
          }
        } else if (runningVMNames.has(model)) {
          // Explicit match
          name = model;
          vmId = model;
        }

        emulators.push({
          type: 'genymotion',
          serial,
          name: name, // This logic tries to sync "Motorola Moto X" with this device
          id: vmId,
          ip: ip,
          adbPort: 5555,
          androidVersion,
          architecture,
          status: bootComplete === '1' ? 'running' : 'booting',
        });
      } catch (e) {
        console.warn(`Failed to probe Genymotion device ${serial}:`, e);
      }
    }

    // If we found running VMs via process check but they are NOT in ADB yet (booting or adb issues)
    // We should still list them so the UI knows they are "Running" roughly
    for (const vmName of runningVMNames) {
      const alreadyListed = emulators.some((e) => e.name === vmName);
      if (!alreadyListed) {
        emulators.push({
          type: 'genymotion',
          serial: '', // Unknown yet
          name: vmName,
          ip: '',
          adbPort: 0,
          androidVersion: '?',
          architecture: '?',
          status: 'booting', // Assume booting if process exists but no ADB
        });
      }
    }
  } catch (error) {
    console.error('Failed to detect Genymotion emulators:', error);
  }

  return emulators;
}

/**
 * Detect running Waydroid instances
 */
export async function detectWaydroidEmulators(): Promise<MobileEmulator[]> {
  const emulators: MobileEmulator[] = [];

  try {
    // Check if Waydroid is installed
    try {
      execSync('which waydroid', { stdio: 'ignore' });
    } catch {
      console.log('Waydroid not found - skipping Waydroid detection');
      return [];
    }

    // Check Waydroid status
    const { stdout } = await execAsync('waydroid status');

    // Check if session is running
    if (!stdout.includes('Session:') || stdout.includes('STOPPED')) {
      return [];
    }

    // Waydroid typically uses a specific IP in the container network
    // Default is usually 192.168.250.112
    const ip = '192.168.250.112';
    const adbPort = 5555;
    const serial = `${ip}:${adbPort}`;

    try {
      // Connect via ADB
      await execAsync(`adb connect ${serial}`);

      // Get Android version
      const { stdout: androidVersion } = await execAsync(
        `adb -s ${serial} shell getprop ro.build.version.release`,
      );

      // Get architecture
      const { stdout: architecture } = await execAsync(
        `adb -s ${serial} shell getprop ro.product.cpu.abi`,
      );

      // Check boot status
      const { stdout: bootComplete } = await execAsync(
        `adb -s ${serial} shell getprop sys.boot_completed`,
      );
      const isBooted = bootComplete.trim() === '1';

      emulators.push({
        type: 'waydroid',
        serial,
        name: 'Waydroid',
        ip,
        adbPort,
        androidVersion: androidVersion.trim(),
        architecture: architecture.trim(),
        status: isBooted ? 'running' : 'booting',
      });
    } catch (e) {
      // If ADB fails, add with limited info
      emulators.push({
        type: 'waydroid',
        serial,
        name: 'Waydroid',
        ip,
        adbPort,
        androidVersion: 'unknown',
        architecture: 'unknown',
        status: 'offline',
      });
    }
  } catch (error) {
    console.error('Failed to detect Waydroid:', error);
  }

  return emulators;
}

/**
 * Detect all running Android emulators
 */
export async function detectAllEmulators(): Promise<MobileEmulator[]> {
  // Check ADB availability first
  const adbCheck = await checkADBAvailability();
  if (!adbCheck.available) {
    console.warn('ADB not available:', adbCheck.message);
    return [];
  }

  // Detect both types of emulators
  const [genymotionEmulators, waydroidEmulators] = await Promise.all([
    detectGenymotionEmulators(),
    detectWaydroidEmulators(),
  ]);

  return [...genymotionEmulators, ...waydroidEmulators];
}

/**
 * Get detailed info about a specific emulator
 */
export async function getEmulatorDetails(serial: string): Promise<{
  model: string;
  manufacturer: string;
  brand: string;
  device: string;
  sdkVersion: string;
  screenSize: string;
  dpi: string;
  architecture: string;
} | null> {
  try {
    const [model, manufacturer, brand, device, sdkVersion, screenSize, dpi, architecture] =
      await Promise.all([
        execAsync(`adb -s ${serial} shell getprop ro.product.model`),
        execAsync(`adb -s ${serial} shell getprop ro.product.manufacturer`),
        execAsync(`adb -s ${serial} shell getprop ro.product.brand`),
        execAsync(`adb -s ${serial} shell getprop ro.product.device`),
        execAsync(`adb -s ${serial} shell getprop ro.build.version.sdk`),
        execAsync(`adb -s ${serial} shell wm size`),
        execAsync(`adb -s ${serial} shell wm density`),
        execAsync(`adb -s ${serial} shell getprop ro.product.cpu.abi`),
      ]);

    const screenMatch = screenSize.stdout.match(/Physical size: (\d+x\d+)/);
    const dpiMatch = dpi.stdout.match(/Physical density: (\d+)/);

    return {
      model: model.stdout.trim(),
      manufacturer: manufacturer.stdout.trim(),
      brand: brand.stdout.trim(),
      device: device.stdout.trim(),
      sdkVersion: sdkVersion.stdout.trim(),
      screenSize: screenMatch ? screenMatch[1] : 'unknown',
      dpi: dpiMatch ? dpiMatch[1] : 'unknown',
      architecture: architecture.stdout.trim(),
    };
  } catch (error) {
    console.error('Failed to get emulator details:', error);
    return null;
  }
}

/**
 * Check if an app is installed on the emulator
 */
export async function isAppInstalled(serial: string, packageName: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`adb -s ${serial} shell pm list packages ${packageName}`);
    return stdout.includes(packageName);
  } catch {
    return false;
  }
}

/**
 * Get list of installed packages on emulator
 */
export async function getInstalledPackages(serial: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`adb -s ${serial} shell pm list packages -3`); // -3 for third-party only
    const packages = stdout
      .trim()
      .split('\n')
      .map((line) => line.replace('package:', '').trim())
      .filter((pkg) => pkg.length > 0);
    return packages;
  } catch {
    return [];
  }
}

/**
 * Resolve an input string (Name, ID, Serial) to the actual running ADB serial
 */
export async function resolveEmulatorSerial(input: string): Promise<string | null> {
  const emulators = await detectAllEmulators();
  const target = input.toLowerCase();

  for (const emu of emulators) {
    // skip offline/booting for operations that require ADB
    if (emu.status !== 'running') continue;

    const name = emu.name.toLowerCase();
    const id = (emu.id || '').toLowerCase();
    const serial = emu.serial.toLowerCase();

    // 1. Exact match
    if (name === target || id === target || serial === target) {
      return emu.serial;
    }

    // 2. Fuzzy match (Name) - avoiding UUIDs
    const isTargetUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      target,
    );
    if (!isTargetUUID && (target.includes(name) || name.includes(target))) {
      return emu.serial;
    }
  }

  // If no match found but input looks like an IP:Port serial, return it as is
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(input)) {
    return input;
  }

  return null;
}
