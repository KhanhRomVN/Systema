import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const execAsync = promisify(exec);

/**
 * Configure HTTP/HTTPS proxy on Android emulator
 */
export async function configureEmulatorProxy(
  serial: string,
  proxyHost: string,
  proxyPort: number,
): Promise<boolean> {
  try {
    const proxyString = `${proxyHost}:${proxyPort}`;

    console.log(`Configuring proxy on ${serial}: ${proxyString}`);

    // Set global HTTP proxy
    await execAsync(`adb -s ${serial} shell settings put global http_proxy ${proxyString}`);

    // Also set for WiFi (some apps check this)
    await execAsync(
      `adb -s ${serial} shell settings put global global_http_proxy_host ${proxyHost}`,
    );
    await execAsync(
      `adb -s ${serial} shell settings put global global_http_proxy_port ${proxyPort}`,
    );

    console.log('Proxy configured successfully');
    return true;
  } catch (error) {
    console.error('Failed to configure proxy:', error);
    return false;
  }
}

/**
 * Clear proxy settings on Android emulator
 */
export async function clearEmulatorProxy(serial: string): Promise<boolean> {
  try {
    console.log(`Clearing proxy on ${serial}`);

    // Clear global HTTP proxy
    await execAsync(`adb -s ${serial} shell settings put global http_proxy :0`);

    // Clear WiFi proxy settings
    await execAsync(`adb -s ${serial} shell settings delete global global_http_proxy_host`);
    await execAsync(`adb -s ${serial} shell settings delete global global_http_proxy_port`);

    console.log('Proxy cleared successfully');
    return true;
  } catch (error) {
    console.error('Failed to clear proxy:', error);
    return false;
  }
}

/**
 * Install CA certificate on Android emulator (requires root/remount)
 */
export async function installCACertificate(
  serial: string,
  certificatePath: string,
  onProgress?: (status: string) => void,
): Promise<boolean> {
  try {
    if (!fs.existsSync(certificatePath)) {
      throw new Error(`Certificate file not found: ${certificatePath}`);
    }

    onProgress?.('Checking root access...');

    // Check if device is rooted (required for system cert installation)
    try {
      await execAsync(`adb -s ${serial} shell "su -c 'echo test'"`);
    } catch {
      onProgress?.('WARNING: Device not rooted. Certificate installation may fail.');
      // Continue anyway for user cert installation
    }

    onProgress?.('Preparing certificate...');

    // Get certificate hash for proper naming
    const certHash = execSync(
      `openssl x509 -inform PEM -subject_hash_old -in "${certificatePath}" -noout`,
    )
      .toString()
      .trim();

    const certName = `${certHash}.0`;
    const tmpPath = `/data/local/tmp/${certName}`;
    const systemCertPath = `/system/etc/security/cacerts/${certName}`;

    onProgress?.('Pushing certificate to device...');

    // Push certificate to tmp
    await execAsync(`adb -s ${serial} push "${certificatePath}" ${tmpPath}`);

    onProgress?.('Installing certificate...');

    // Try to remount system as read-write and install
    try {
      // Remount system
      await execAsync(`adb -s ${serial} shell "su -c 'mount -o rw,remount /system'"`);

      // Copy to system certs
      await execAsync(`adb -s ${serial} shell "su -c 'cp ${tmpPath} ${systemCertPath}'"`);

      // Set proper permissions
      await execAsync(`adb -s ${serial} shell "su -c 'chmod 644 ${systemCertPath}'"`);

      // Remount as read-only
      await execAsync(`adb -s ${serial} shell "su -c 'mount -o ro,remount /system'"`);

      onProgress?.('Certificate installed as system certificate');
    } catch (rootError) {
      onProgress?.('Falling back to user certificate installation...');

      // Fallback: Install as user certificate (doesn't require root, but less effective)
      const userCertPath = `/data/misc/user/0/cacerts-added/${certName}`;

      await execAsync(`adb -s ${serial} shell "mkdir -p /data/misc/user/0/cacerts-added"`);
      await execAsync(`adb -s ${serial} shell "cp ${tmpPath} ${userCertPath}"`);
      await execAsync(`adb -s ${serial} shell "chmod 644 ${userCertPath}"`);

      onProgress?.('Certificate installed as user certificate (limited effectiveness)');
    }

    // Cleanup
    await execAsync(`adb -s ${serial} shell "rm ${tmpPath}"`);

    onProgress?.('Certificate installation complete');
    return true;
  } catch (error) {
    console.error('Failed to install certificate:', error);
    onProgress?.(`Error: ${error}`);
    return false;
  }
}

/**
 * Generate and install proxy CA certificate
 */
export async function setupProxyCertificate(
  serial: string,
  proxyCAPath: string,
  onProgress?: (status: string) => void,
): Promise<boolean> {
  try {
    // Check if CA certificate exists
    if (!fs.existsSync(proxyCAPath)) {
      onProgress?.(
        'Proxy CA certificate not found. Please ensure proxy is configured to generate CA cert.',
      );
      return false;
    }

    // Convert to PEM if needed (http-mitm-proxy uses PEM)
    const pemPath = proxyCAPath.endsWith('.pem') ? proxyCAPath : proxyCAPath + '.pem';

    return await installCACertificate(serial, pemPath, onProgress);
  } catch (error) {
    console.error('Failed to setup proxy certificate:', error);
    onProgress?.(`Error: ${error}`);
    return false;
  }
}

/**
 * Get proxy CA certificate path from http-mitm-proxy
 */
export function getProxyCACertPath(): string {
  // http-mitm-proxy stores certs in .http-mitm-proxy directory
  const proxyDir = path.join(process.cwd(), '.http-mitm-proxy');
  const certPath = path.join(proxyDir, 'certs', 'ca.pem');

  if (!fs.existsSync(certPath)) {
    throw new Error('Proxy CA certificate not found. Please start proxy first.');
  }

  return certPath;
}

/**
 * Complete proxy setup: configure proxy + install certificate
 */
export async function setupCompleteProxy(
  serial: string,
  proxyHost: string,
  proxyPort: number,
  onProgress?: (status: string) => void,
): Promise<boolean> {
  try {
    onProgress?.('Step 1/2: Configuring proxy settings...');
    const proxyConfigured = await configureEmulatorProxy(serial, proxyHost, proxyPort);

    if (!proxyConfigured) {
      onProgress?.('Failed to configure proxy');
      return false;
    }

    onProgress?.('Step 2/2: Installing CA certificate...');

    try {
      const caCertPath = getProxyCACertPath();
      const certInstalled = await setupProxyCertificate(serial, caCertPath, onProgress);

      if (!certInstalled) {
        onProgress?.('Warning: Certificate installation failed. HTTPS decryption may not work.');
        // Don't fail completely - proxy is still configured
      }
    } catch (certError) {
      onProgress?.(`Warning: ${certError}. Proxy configured but HTTPS decryption may not work.`);
    }

    onProgress?.('Proxy setup complete!');
    return true;
  } catch (error) {
    console.error('Failed to setup complete proxy:', error);
    onProgress?.(`Error: ${error}`);
    return false;
  }
}

/**
 * Restart network services on Android (to apply proxy changes)
 */
export async function restartNetworkServices(serial: string): Promise<boolean> {
  try {
    // Toggle airplane mode to restart network
    await execAsync(`adb -s ${serial} shell "cmd connectivity airplane-mode enable"`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await execAsync(`adb -s ${serial} shell "cmd connectivity airplane-mode disable"`);

    console.log('Network services restarted');
    return true;
  } catch (error) {
    console.error('Failed to restart network services:', error);
    return false;
  }
}

/**
 * Disable battery optimization for an app (helps keep Frida running)
 */
export async function disableBatteryOptimization(
  serial: string,
  packageName: string,
): Promise<boolean> {
  try {
    await execAsync(`adb -s ${serial} shell "dumpsys deviceidle whitelist +${packageName}"`);
    console.log(`Battery optimization disabled for ${packageName}`);
    return true;
  } catch (error) {
    console.error('Failed to disable battery optimization:', error);
    return false;
  }
}

/**
 * Install APK on emulator
 */
export async function installAPK(
  serial: string,
  apkPath: string,
  onProgress?: (status: string) => void,
): Promise<boolean> {
  try {
    if (!fs.existsSync(apkPath)) {
      throw new Error(`APK file not found: ${apkPath}`);
    }

    onProgress?.('Installing APK...');
    const { stdout, stderr } = await execAsync(`adb -s ${serial} install -r "${apkPath}"`);

    if (stderr && stderr.includes('Failure')) {
      onProgress?.(`Installation failed: ${stderr}`);
      return false;
    }

    onProgress?.('APK installed successfully');
    return true;
  } catch (error: any) {
    console.error('Failed to install APK:', error);
    onProgress?.(`Error: ${error.message}`);
    return false;
  }
}

/**
 * Uninstall app from emulator
 */
export async function uninstallApp(serial: string, packageName: string): Promise<boolean> {
  try {
    await execAsync(`adb -s ${serial} uninstall ${packageName}`);
    console.log(`Uninstalled ${packageName}`);
    return true;
  } catch (error) {
    console.error('Failed to uninstall app:', error);
    return false;
  }
}

/**
 * Launch app on emulator
 */
export async function launchApp(serial: string, packageName: string): Promise<boolean> {
  try {
    // Get main activity
    const { stdout } = await execAsync(
      `adb -s ${serial} shell "cmd package resolve-activity --brief ${packageName} | tail -n 1"`,
    );
    const activity = stdout.trim();

    if (!activity || activity.includes('No activity found')) {
      // Fallback: try to launch with monkey
      await execAsync(`adb -s ${serial} shell "monkey -p ${packageName} 1"`);
    } else {
      // Launch specific activity
      await execAsync(`adb -s ${serial} shell "am start -n ${activity}"`);
    }

    console.log(`Launched ${packageName}`);
    return true;
  } catch (error) {
    console.error('Failed to launch app:', error);
    return false;
  }
}

/**
 * Stop app on emulator
 */
export async function stopApp(serial: string, packageName: string): Promise<boolean> {
  try {
    await execAsync(`adb -s ${serial} shell "am force-stop ${packageName}"`);
    console.log(`Stopped ${packageName}`);
    return true;
  } catch (error) {
    console.error('Failed to stop app:', error);
    return false;
  }
}
