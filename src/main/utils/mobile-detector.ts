import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export type EmulatorType = 'genymotion' | 'waydroid' | 'physical';

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
 * Detect running Android devices (Emulators & Physical)
 * Refactored to be more inclusive of physical devices while maintaining Genymotion specific logic
 */
export async function detectAndroidDevices(): Promise<MobileEmulator[]> {
  const emulators: MobileEmulator[] = [];

  try {
    // Strategy 1: VirtualBox (Legacy/Standard Genymotion)
    let vboxVMs: Map<string, string> = new Map(); // Name -> IP
    try {
      // Only try if vboxmanage is in path
      execSync('which vboxmanage', { stdio: 'ignore' });
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
      // console.log('[MobileDetector] vboxmanage not found or failed.');
    }

    // Strategy 2: Process Scanning (QEMU/KVM for Genymotion)
    let runningVMNames: Set<string> = new Set(vboxVMs.keys());
    try {
      const { stdout: psOut } = await execAsync('ps -ef');
      const lines = psOut.split('\n');
      for (const line of lines) {
        if (
          line.includes('player') &&
          (line.includes('--vm-name') || line.includes('genymotion'))
        ) {
          const match = line.match(/--vm-name\s+"([^"]+)"/);
          if (match) {
            runningVMNames.add(match[1]);
          } else {
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

      if (status !== 'device') continue;

      try {
        const manufacturer = (
          await execAsync(`adb -s ${serial} shell getprop ro.product.manufacturer`)
        ).stdout.trim();

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

        const isGenymotion = manufacturer === 'Genymotion' || manufacturer === 'Genymobile';

        let type: EmulatorType = isGenymotion ? 'genymotion' : 'physical';
        let name = model;
        let ip = '';
        let vmId: string | undefined;

        // Try to identify IP for network devices
        if (serial.includes(':')) {
          ip = serial.split(':')[0];
        }

        // Only try to map to Genymotion VM names if it IS a Genymotion device
        if (isGenymotion) {
          // VBox matching
          for (const [vmName, vmIp] of vboxVMs.entries()) {
            if (vmIp === ip) {
              name = vmName;
              break;
            }
          }

          // heuristic matching if not found via VBox
          if (name === model) {
            if (runningVMNames.size === 1) {
              const candidate = Array.from(runningVMNames)[0];
              vmId = candidate;
              const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                candidate,
              );
              if (!isUUID) {
                name = candidate;
              }
            } else if (runningVMNames.has(model)) {
              name = model;
              vmId = model;
            }
          }
        } else {
          // For physical devices, try to get a better name if possible, or just use Model
          // Maybe "Samsung Galaxy S21" etc.
          name = `${manufacturer} ${model}`;
        }

        emulators.push({
          type,
          serial,
          name: name,
          id: vmId,
          ip: ip,
          adbPort: 5555, // Default, might be different for USB but irrelevant
          androidVersion,
          architecture,
          status: bootComplete === '1' ? 'running' : 'booting',
        });
      } catch (e) {
        console.warn(`Failed to probe device ${serial}:`, e);
      }
    }

    // Add Genymotion VMs that are running but not yet in ADB (booting)
    for (const vmName of runningVMNames) {
      const alreadyListed = emulators.some((e) => e.name === vmName || e.id === vmName);
      if (!alreadyListed) {
        emulators.push({
          type: 'genymotion',
          serial: '', // Unknown yet
          name: vmName,
          ip: '',
          adbPort: 0,
          androidVersion: '?',
          architecture: '?',
          status: 'booting',
        });
      }
    }
  } catch (error) {
    console.error('Failed to detect Android devices:', error);
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
  const [androidDevices, waydroidEmulators] = await Promise.all([
    detectAndroidDevices(),
    detectWaydroidEmulators(),
  ]);

  return [...androidDevices, ...waydroidEmulators];
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
