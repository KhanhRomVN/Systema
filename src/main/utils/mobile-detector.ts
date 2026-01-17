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
          await execAsync(`adb -s "${serial}" shell getprop ro.product.manufacturer`)
        ).stdout.trim();

        const model = (
          await execAsync(`adb -s "${serial}" shell getprop ro.product.model`)
        ).stdout.trim();
        const androidVersion = (
          await execAsync(`adb -s "${serial}" shell getprop ro.build.version.release`)
        ).stdout.trim();
        const architecture = (
          await execAsync(`adb -s "${serial}" shell getprop ro.product.cpu.abi`)
        ).stdout.trim();
        const bootComplete = (
          await execAsync(`adb -s "${serial}" shell getprop sys.boot_completed`)
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

  // Add ALL Genymotion VMs (including stopped ones)
  console.log('[MobileDetector] Fetching complete list of Genymotion VMs...');
  try {
    const { listGenymotionVMs } = await import('./emulator-launcher');
    const allVMs = await listGenymotionVMs();
    console.log('[MobileDetector] All Genymotion VMs:', allVMs);

    for (const vmName of allVMs) {
      // Check if this VM is already in our emulators list
      const alreadyListed = emulators.some(
        (e) =>
          e.name === vmName ||
          e.id === vmName ||
          e.name.toLowerCase().includes(vmName.toLowerCase()),
      );

      if (!alreadyListed) {
        console.log(`[MobileDetector] Adding stopped VM: ${vmName}`);
        emulators.push({
          type: 'genymotion',
          serial: '', // Empty for stopped VMs
          name: vmName,
          ip: '',
          adbPort: 0,
          androidVersion: '?',
          architecture: '?',
          status: 'offline',
        });
      }
    }
  } catch (error) {
    console.error('[MobileDetector] Failed to fetch VM list:', error);
  }

  // Deduplicate devices:
  // 1. If same device appears via both USB and wireless, keep only USB
  // 2. For Genymotion, handle name variations (e.g., "Moto X" vs "Motorola Moto X")
  console.log('[MobileDetector] Starting deduplication, total emulators:', emulators.length);
  emulators.forEach((emu, idx) => {
    console.log(`[MobileDetector] Emulator ${idx}:`, {
      name: emu.name,
      serial: emu.serial,
      status: emu.status,
      type: emu.type,
    });
  });

  const deduplicatedEmulators: MobileEmulator[] = [];
  const processedSerials = new Set<string>();
  const booting: MobileEmulator[] = [];

  // First pass: handle devices with serials (running devices)
  for (const emu of emulators) {
    if (!emu.serial || emu.status === 'booting') {
      console.log('[MobileDetector] Booting/no-serial device:', emu.name);
      booting.push(emu);
      continue;
    }

    // Check if we already processed this device (via different connection)
    if (processedSerials.has(emu.serial)) {
      console.log('[MobileDetector] Already processed:', emu.serial);
      continue;
    }

    // Check for wireless duplicate of this USB device
    const wirelessSerial = emu.serial.includes(':') ? null : `${emu.serial}:5555`;
    const usbSerial = emu.serial.includes(':') ? emu.serial.split(':')[0] : emu.serial;

    // Find all variants of this device
    const allVariants = emulators.filter((e) => {
      if (!e.serial || e.status === 'booting') return false;
      return e.serial === emu.serial || e.serial === wirelessSerial || e.serial === usbSerial;
    });

    console.log(
      `[MobileDetector] Found ${allVariants.length} variants for ${emu.name}:`,
      allVariants.map((v) => v.serial),
    );

    // Prefer USB over wireless
    const usbDevice = allVariants.find((d) => !d.serial.includes(':'));
    const chosen = usbDevice || allVariants[0];

    console.log('[MobileDetector] Chosen device:', chosen.name, chosen.serial);
    deduplicatedEmulators.push(chosen);
    allVariants.forEach((v) => processedSerials.add(v.serial));
  }

  console.log('[MobileDetector] After first pass, running devices:', deduplicatedEmulators.length);

  // Second pass: handle booting VMs - check if they match any running device by name (fuzzy match)
  for (const bootingVm of booting) {
    const vmName = bootingVm.name.toLowerCase();
    console.log('[MobileDetector] Checking booting VM:', bootingVm.name);

    // Check if any running device matches this VM
    const matchingRunning = deduplicatedEmulators.find((running) => {
      const runningName = running.name.toLowerCase();

      // Exact match
      if (runningName === vmName) {
        console.log(`[MobileDetector] Exact match: "${vmName}" === "${runningName}"`);
        return true;
      }

      // Fuzzy match: check if one name contains the other
      // e.g., "Moto X" matches "Motorola Moto X"
      if (vmName.includes(runningName) || runningName.includes(vmName)) {
        console.log(`[MobileDetector] Fuzzy match: "${vmName}" <=> "${runningName}"`);
        return true;
      }

      return false;
    });

    if (matchingRunning) {
      console.log(
        `[MobileDetector] Skipping booting VM "${bootingVm.name}" - matches running "${matchingRunning.name}"`,
      );

      // If names differ, update running device details to match the official VM
      if (matchingRunning.name !== bootingVm.name) {
        console.log(
          `[MobileDetector] Renaming running device "${matchingRunning.name}" to official VM name "${bootingVm.name}"`,
        );
        matchingRunning.name = bootingVm.name;
        // Ensure type is genymotion (it might be 'physical' if detected via USB-like connection)
        matchingRunning.type = 'genymotion';
      }
    } else {
      console.log(`[MobileDetector] Adding booting VM "${bootingVm.name}" - no match found`);
      deduplicatedEmulators.push(bootingVm);
    }
  }

  console.log('[MobileDetector] Final deduplicated count:', deduplicatedEmulators.length);
  deduplicatedEmulators.forEach((emu, idx) => {
    console.log(`[MobileDetector] Final ${idx}:`, emu.name, emu.serial, emu.status);
  });

  return deduplicatedEmulators;
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
        `adb -s "${serial}" shell getprop ro.build.version.release`,
      );

      // Get architecture
      const { stdout: architecture } = await execAsync(
        `adb -s "${serial}" shell getprop ro.product.cpu.abi`,
      );

      // Check boot status
      const { stdout: bootComplete } = await execAsync(
        `adb -s "${serial}" shell getprop sys.boot_completed`,
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
        execAsync(`adb -s "${serial}" shell getprop ro.product.model`),
        execAsync(`adb -s "${serial}" shell getprop ro.product.manufacturer`),
        execAsync(`adb -s "${serial}" shell getprop ro.product.brand`),
        execAsync(`adb -s "${serial}" shell getprop ro.product.device`),
        execAsync(`adb -s "${serial}" shell getprop ro.build.version.sdk`),
        execAsync(`adb -s "${serial}" shell wm size`),
        execAsync(`adb -s "${serial}" shell wm density`),
        execAsync(`adb -s "${serial}" shell getprop ro.product.cpu.abi`),
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
    const { stdout } = await execAsync(`adb -s "${serial}" shell pm list packages ${packageName}`);
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
    const { stdout } = await execAsync(`adb -s "${serial}" shell pm list packages -3`); // -3 for third-party only
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
