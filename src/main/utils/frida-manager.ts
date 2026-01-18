import { exec, execSync, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { app } from 'electron';

const execAsync = promisify(exec);

// Frida server download URLs by architecture
const FRIDA_VERSION = '17.5.2'; // Latest stable version
const FRIDA_DOWNLOAD_URLS: Record<string, string> = {
  arm: `https://github.com/frida/frida/releases/download/${FRIDA_VERSION}/frida-server-${FRIDA_VERSION}-android-arm.xz`,
  arm64: `https://github.com/frida/frida/releases/download/${FRIDA_VERSION}/frida-server-${FRIDA_VERSION}-android-arm64.xz`,
  x86: `https://github.com/frida/frida/releases/download/${FRIDA_VERSION}/frida-server-${FRIDA_VERSION}-android-x86.xz`,
  x86_64: `https://github.com/frida/frida/releases/download/${FRIDA_VERSION}/frida-server-${FRIDA_VERSION}-android-x86_64.xz`,
};

/**
 * Universal SSL Pinning Bypass script for Android
 */
export const SSL_PINNING_BYPASS_SCRIPT = `
// Universal SSL Pinning Bypass for Android
// Supports: OkHttp, TrustManager, SSLContext, Conscrypt, Cronet, and more

Java.perform(function() {
    console.log("[*] Starting SSL Pinning Bypass...");

    // 1. TrustManager bypass
    try {
        var TrustManager = Java.use('javax.net.ssl.X509TrustManager');
        var SSLContext = Java.use('javax.net.ssl.SSLContext');
        
        var TrustManagerImpl = Java.registerClass({
            name: 'com.systema.TrustManagerImpl',
            implements: [TrustManager],
            methods: {
                checkClientTrusted: function(chain, authType) {},
                checkServerTrusted: function(chain, authType) {},
                getAcceptedIssuers: function() {
                    return [];
                }
            }
        });

        var TrustManagers = [TrustManagerImpl.$new()];
        var SSLContext_init = SSLContext.init.overload(
            '[Ljavax.net.ssl.KeyManager;',
            '[Ljavax.net.ssl.TrustManager;',
            'java.security.SecureRandom'
        );
        
        SSLContext_init.implementation = function(keyManager, trustManager, secureRandom) {
            console.log("[+] SSLContext.init() bypassed");
            SSLContext_init.call(this, keyManager, TrustManagers, secureRandom);
        };
        
        console.log("[+] TrustManager bypassed");
    } catch(e) {
        console.log("[-] TrustManager bypass failed: " + e.message);
    }

    // 2. OkHttp 3.x CertificatePinner bypass
    try {
        var CertificatePinner = Java.use('okhttp3.CertificatePinner');
        CertificatePinner.check.overload('java.lang.String', 'java.util.List').implementation = function(hostname, peerCertificates) {
            console.log("[+] OkHttp3 CertificatePinner.check() bypassed for: " + hostname);
            return;
        };
        console.log("[+] OkHttp3 CertificatePinner bypassed");
    } catch(e) {
        console.log("[-] OkHttp3 bypass failed: " + e.message);
    }

    // 3. OkHttp 2.x CertificatePinner bypass
    try {
        var CertificatePinner2 = Java.use('com.squareup.okhttp.CertificatePinner');
        CertificatePinner2.check.overload('java.lang.String', 'java.security.cert.Certificate').implementation = function(hostname, certificate) {
            console.log("[+] OkHttp2 CertificatePinner.check() bypassed for: " + hostname);
            return;
        };
        console.log("[+] OkHttp2 CertificatePinner bypassed");
    } catch(e) {
        console.log("[-] OkHttp2 bypass not applicable: " + e.message);
    }

    // 4. Conscrypt (Android's SSL provider) bypass
    try {
        var ConscryptFileDescriptorSocket = Java.use('com.android.org.conscrypt.ConscryptFileDescriptorSocket');
        ConscryptFileDescriptorSocket.verifyCertificateChain.implementation = function() {
            console.log("[+] Conscrypt certificate verification bypassed");
        };
        console.log("[+] Conscrypt bypassed");
    } catch(e) {
        console.log("[-] Conscrypt bypass failed: " + e.message);
    }

    // 5. SSLPeerUnverifiedException bypass
    try {
        var SSLPeerUnverifiedException = Java.use('javax.net.ssl.SSLPeerUnverifiedException');
        SSLPeerUnverifiedException.$init.implementation = function(message) {
            console.log("[+] SSLPeerUnverifiedException suppressed");
            return null;
        };
    } catch(e) {
        console.log("[-] SSLPeerUnverifiedException bypass failed: " + e.message);
    }

    // 6. Trustkit (iOS-style pinning for Android)
    try {
        var Trustkit = Java.use('com.datatheorem.android.trustkit.pinning.PinningTrustManager');
        Trustkit.checkServerTrusted.implementation = function() {
            console.log("[+] Trustkit bypassed");
        };
    } catch(e) {
        console.log("[-] Trustkit not found: " + e.message);
    }

    // 7. Appcelerator Titanium
    try {
        var PinningTrustManager = Java.use('appcelerator.https.PinningTrustManager');
        PinningTrustManager.checkServerTrusted.implementation = function() {
            console.log("[+] Appcelerator Titanium bypassed");
        };
    } catch(e) {
        console.log("[-] Appcelerator not found: " + e.message);
    }

    // 8. Cronet (Chrome network stack)
    try {
        var CronetEngine = Java.use('org.chromium.net.impl.CronetEngineBase');
        CronetEngine.enablePublicKeyPinningBypassForLocalTrustAnchors.implementation = function(enable) {
            console.log("[+] Cronet public key pinning bypass enabled");
            return true;
        };
    } catch(e) {
        console.log("[-] Cronet bypass not applicable: " + e.message);
    }

    console.log("[*] SSL Pinning Bypass complete!");
});
`;

/**
 * Get Frida server storage path
 */
function getFridaServerPath(architecture: string): string {
  const fridaDir = path.join(app.getPath('userData'), 'frida-servers');
  fs.mkdirSync(fridaDir, { recursive: true });
  return path.join(fridaDir, `frida-server-${architecture}`);
}

/**
 * Download and extract Frida server for specific architecture
 */
export async function downloadFridaServer(
  architecture: string,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const url = FRIDA_DOWNLOAD_URLS[architecture];
  if (!url) {
    throw new Error(`Unsupported architecture: ${architecture}`);
  }

  const serverPath = getFridaServerPath(architecture);

  // Check if already downloaded
  if (fs.existsSync(serverPath)) {
    console.log(`Frida server already exists at: ${serverPath}`);
    return serverPath;
  }

  console.log(`Downloading Frida server for ${architecture}...`);

  const xzPath = serverPath + '.xz';

  // Download the compressed file
  const downloadFile = (downloadUrl: string, destination: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const file = fs.createWriteStream(destination);
      https
        .get(downloadUrl, (response) => {
          // Handle Redirects
          if (
            response.statusCode === 301 ||
            response.statusCode === 302 ||
            response.statusCode === 303 ||
            response.statusCode === 307
          ) {
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              file.close();
              downloadFile(redirectUrl, destination).then(resolve).catch(reject);
              return;
            }
          }

          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
            return;
          }

          const totalSize = parseInt(response.headers['content-length'] || '0', 10);
          let downloadedSize = 0;

          response.on('data', (chunk) => {
            downloadedSize += chunk.length;
            if (onProgress && totalSize > 0) {
              onProgress(Math.round((downloadedSize / totalSize) * 100));
            }
          });

          response.pipe(file);

          file.on('finish', () => {
            file.close();
            resolve();
          });
        })
        .on('error', (err) => {
          try {
            file.close();
          } catch {}
          try {
            fs.unlinkSync(destination);
          } catch {}
          reject(err);
        });
    });
  };

  await downloadFile(url, xzPath);

  // Decompress with xz
  try {
    await execAsync(`xz -d "${xzPath}"`);
    // Make executable
    fs.chmodSync(serverPath, 0o755);
    console.log(`Frida server downloaded and extracted to: ${serverPath}`);
    return serverPath;
  } catch (error) {
    throw new Error(`Failed to decompress Frida server: ${error}`);
  }
}

/**
 * Check if Frida server is running on emulator
 * Uses multiple detection methods for compatibility with Android 8.0+
 */
export async function isFridaRunning(serial: string): Promise<boolean> {
  try {
    // Method 1: Check for frida-server process using pidof (most reliable on modern Android)
    try {
      const { stdout: pidout } = await execAsync(`adb -s "${serial}" shell "pidof frida-server"`);
      if (pidout.trim()) {
        return true;
      }
    } catch {
      // Continue to next method
    }

    // Method 2: Check if port 27042 (default Frida port) is listening
    try {
      const { stdout: netstat } = await execAsync(
        `adb -s "${serial}" shell "netstat -tulpn 2>/dev/null | grep 27042"`,
      );
      if (netstat.includes('27042')) {
        return true;
      }
    } catch {
      // Continue to next method
    }

    // Method 3: Fallback to ps -A (works on newer Android versions)
    try {
      const { stdout } = await execAsync(`adb -s "${serial}" shell "ps -A | grep frida-server"`);
      return stdout.includes('frida-server');
    } catch {
      // Continue to final fallback
    }

    // Method 4: Final fallback to original ps | grep (for older Android)
    try {
      const { stdout } = await execAsync(`adb -s "${serial}" shell "ps | grep frida-server"`);
      return stdout.includes('frida-server');
    } catch {
      // All methods failed
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Check if Frida server is installed on emulator (but potentially not running)
 */
export async function isFridaServerInstalled(serial: string): Promise<boolean> {
  try {
    // Check if the file exists at /data/local/tmp/frida-server
    // ls returns exit code 0 if found, non-zero if not
    await execAsync(`adb -s "${serial}" shell "ls /data/local/tmp/frida-server"`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Install Frida server to emulator
 */
export async function installFridaServer(
  serial: string,
  architecture: string,
  onProgress?: (status: string) => void,
): Promise<boolean> {
  try {
    onProgress?.('Checking Frida server...');

    // Download Frida server if not present
    const serverPath = await downloadFridaServer(architecture, (percent) => {
      onProgress?.(`Downloading Frida server: ${percent}%`);
    });

    onProgress?.('Pushing Frida server to device...');

    // Push to device
    await execAsync(`adb -s "${serial}" push "${serverPath}" /data/local/tmp/frida-server`);

    onProgress?.('Setting permissions...');

    // Make executable
    await execAsync(`adb -s "${serial}" shell "chmod 755 /data/local/tmp/frida-server"`);

    onProgress?.('Frida server installed successfully');
    return true;
  } catch (error) {
    console.error('Failed to install Frida server:', error);
    onProgress?.(`Error: ${error}`);
    return false;
  }
}

/**
 * Start Frida server on emulator
 */
export async function startFridaServer(serial: string): Promise<boolean> {
  try {
    // Check if already running
    if (await isFridaRunning(serial)) {
      console.log('Frida server already running');
      return true;
    }

    // Start in background (Try with root first)
    try {
      console.log('Attempting to start Frida server as root...');
      await execAsync(
        `adb -s "${serial}" shell "su -c '/data/local/tmp/frida-server > /dev/null 2>&1 &'"`,
      );
    } catch (rootError) {
      console.log(
        'Root start failed, falling back to non-root execution (may have limited permissions)...',
      );
      await execAsync(`adb -s "${serial}" shell "/data/local/tmp/frida-server > /dev/null 2>&1 &"`);
    }

    // Wait a bit for it to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Verify it's running
    const isRunning = await isFridaRunning(serial);
    if (isRunning) {
      console.log('Frida server started successfully');
    } else {
      console.error('Frida server failed to start');
    }

    return isRunning;
  } catch (error) {
    console.error('Failed to start Frida server:', error);
    return false;
  }
}

/**
 * Stop Frida server on emulator
 */
export async function stopFridaServer(serial: string): Promise<boolean> {
  try {
    await execAsync(`adb -s "${serial}" shell "pkill frida-server"`);
    console.log('Frida server stopped');
    return true;
  } catch (error) {
    console.error('Failed to stop Frida server:', error);
    return false;
  }
}

/**
 * Inject SSL pinning bypass into app
 */
export async function injectSSLBypass(
  serial: string,
  packageName: string,
  onLog?: (message: string) => void,
): Promise<boolean> {
  try {
    // Check if Frida tools are available
    try {
      execSync('which frida', { stdio: 'ignore' });
    } catch {
      onLog?.('ERROR: Frida CLI not installed. Install with: pip install frida-tools');
      return false;
    }

    // Ensure Frida server is running
    if (!(await isFridaRunning(serial))) {
      onLog?.('Starting Frida server...');
      const started = await startFridaServer(serial);
      if (!started) {
        onLog?.('ERROR: Failed to start Frida server');
        return false;
      }
    }

    onLog?.(`Injecting SSL bypass into ${packageName}...`);

    // Save script to temp file
    const scriptPath = path.join(app.getPath('temp'), 'ssl-bypass.js');
    fs.writeFileSync(scriptPath, SSL_PINNING_BYPASS_SCRIPT);

    // Use spawn instead of exec to stream output and avoid blocking
    // -U: USB device, -f: spawn, -l: load script
    // const fridaCmd = `frida -U -f ${packageName} -l "${scriptPath}"`;

    onLog?.('Injecting script (spawn mode)...');

    return new Promise<boolean>((resolve, reject) => {
      const fridaProcess = spawn('frida', ['-U', '-f', packageName, '-l', scriptPath]);

      const timeout = setTimeout(() => {
        onLog?.('⚠️ Process spawn timeout (10s), but continuing...');
        resolve(true);
      }, 10000);

      fridaProcess.stdout.on('data', (data) => {
        const output = data.toString();
        onLog?.(output);

        // Check for success markers
        if (output.includes('Spawned') || output.includes('Resuming main thread')) {
          clearTimeout(timeout);
          resolve(true);
        }
      });

      fridaProcess.stderr.on('data', (data) => {
        const output = data.toString();
        // Ignore header/helper messages if they appear in stderr
        if (!output.includes('Frida') && !output.includes('Help')) {
          onLog?.(`STDERR: ${output}`);
        }
      });

      fridaProcess.on('error', (err) => {
        clearTimeout(timeout);
        const msg = err.message || '';
        onLog?.(`ERROR: ${msg}`);
        console.error('Frida process error:', err);
        // Don't reject outright if we want to be resilient, but for error event it's usually bad.
        // reject(err);
        // Better to resolve false or let UI handle?
        // Existing code threw error.
        reject(err);
      });

      fridaProcess.on('close', (code) => {
        if (code !== 0 && code !== null) {
          // Only log if it wasn't a manual kill or success?
          // With -f, it should stay running. If it closes, it might be an error.
          console.log(`Frida process exited with code ${code}`);
          // If we haven't resolved yet (e.g. immediate failure)
          // If already resolved, this does nothing which is fine.
        }
      });
    });
  } catch (error: any) {
    const msg = error.message || '';
    if (msg.includes("unable to find process with name 'system_server'")) {
      const rootError =
        '❌ FAILURE: Device is NOT rooted. Frida requires ROOT access to spawn apps.\nPlease use a rooted device or emulator (Genymotion/LDPlayer).';
      onLog?.(rootError);
      throw new Error(rootError);
    }

    onLog?.(`ERROR: ${error.message}`);
    console.error('Failed to inject SSL bypass:', error);
    throw error; // Re-throw so UI can catch it
  }
}

/**
 * Inject custom Frida script into app
 */
export async function injectCustomScript(
  serial: string,
  packageName: string,
  scriptContent: string,
  onLog?: (message: string) => void,
): Promise<boolean> {
  try {
    // Ensure Frida server is running
    if (!(await isFridaRunning(serial))) {
      onLog?.('Starting Frida server...');
      const started = await startFridaServer(serial);
      if (!started) {
        onLog?.('ERROR: Failed to start Frida server');
        return false;
      }
    }

    onLog?.(`Injecting custom script into ${packageName}...`);

    return new Promise<boolean>((resolve, reject) => {
      // Save script to temp file
      const scriptPath = path.join(app.getPath('temp'), `custom-${Date.now()}.js`);
      fs.writeFileSync(scriptPath, scriptContent);

      const fridaProcess = spawn('frida', ['-U', '-f', packageName, '-l', scriptPath]);

      const timeout = setTimeout(() => {
        onLog?.('⚠️ Process spawn timeout (10s), but continuing...');
        resolve(true);
      }, 10000);

      fridaProcess.stdout.on('data', (data) => {
        const output = data.toString();
        onLog?.(output);
        if (output.includes('Spawned') || output.includes('Resuming main thread')) {
          clearTimeout(timeout);
          resolve(true);
        }
      });

      fridaProcess.stderr.on('data', (data) => {
        const output = data.toString();
        if (!output.includes('Frida') && !output.includes('Help')) {
          onLog?.(`STDERR: ${output}`);
        }
      });

      fridaProcess.on('error', (err) => {
        clearTimeout(timeout);
        const msg = err.message || '';
        onLog?.(`ERROR: ${msg}`);
        console.error('Frida process error:', err);
        // resolve(false); // Prefer resolve false for custom script? Or reject?
        // Let's resolve false to avoid crashing the whole flow if script is bad
        resolve(false);
      });

      fridaProcess.on('close', (code) => {
        if (code !== 0 && code !== null) {
          console.log(`Frida process exited with code ${code}`);
        }
      });
    });
  } catch (error: any) {
    onLog?.(`ERROR: ${error.message}`);
    console.error('Failed to inject custom script:', error);
    return false;
  }
}

/**
 * List running processes on device (for Frida targeting)
 */
export async function listRunningProcesses(serial: string): Promise<
  Array<{
    pid: number;
    name: string;
  }>
> {
  try {
    const { stdout } = await execAsync(`adb -s "${serial}" shell "ps"`);
    const lines = stdout.trim().split('\n');
    const processes: Array<{ pid: number; name: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length >= 9) {
        const pid = parseInt(parts[1], 10);
        const name = parts[parts.length - 1];
        if (pid && name) {
          processes.push({ pid, name });
        }
      }
    }

    return processes;
  } catch (error) {
    console.error('Failed to list processes:', error);
    return [];
  }
}
