import { SiAndroid } from "react-icons/si";
import Guide, { GuideStep } from "../Guide";

export function AndroidDeviceInstaller() {
  const androidSteps: GuideStep[] = [
    {
      title: "What This Does",
      description: (
        <div className="space-y-3">
          <p>
            To intercept HTTPS traffic from your Android device, NetworkSpy acts as a
            <b> proxy server</b> on your desktop. Your Android device connects through it,
            and NetworkSpy decrypts the TLS traffic using its root CA certificate.
          </p>
          <p>
            This guide walks through two things your Android device needs:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400 ml-2">
            <li>
              <b>Install the CA certificate</b> — so Android trusts the decrypted traffic
            </li>
            <li>
              <b>Configure the WiFi proxy</b> — so traffic flows through NetworkSpy
            </li>
          </ol>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-3">
            <p className="text-[11px] text-amber-300 font-bold mb-1">Prerequisites</p>
            <p className="text-[11px] text-amber-300/80">
              The certificate must be installed on your desktop first. Use the
              <b> "One-Click Install CA"</b> button above, or complete the desktop
              guide for your OS from the sidebar.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Transfer the Certificate to Android",
      description: (
        <div className="space-y-4">
          <p>Get the certificate file onto your Android device. Choose one method:</p>

          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Option A: ADB Push (for developers)</p>
            <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden">
              <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
                <code>adb push ~/.network-spy/ca/network-spy.crt /sdcard/Download/</code>
              </pre>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Option B: Local HTTP Server</p>
            <p className="text-[12px] text-zinc-400">
              Start a simple HTTP server in the cert directory, then open the URL
              on your Android device (both must be on the same WiFi):
            </p>
            <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden mt-2">
              <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
                <code>cd ~/.network-spy/ca && python3 -m http.server 8000</code>
              </pre>
            </div>
            <p className="text-[11px] text-zinc-500 mt-2">
              On your Android device, open the browser and navigate to{" "}
              <code className="text-blue-400">http://&lt;desktop-ip&gt;:8000/network-spy.crt</code>.
              The file will download automatically.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Option C: USB File Transfer</p>
            <p className="text-[12px] text-zinc-400">
              Connect your Android device via USB. On your desktop, copy{" "}
              <code className="text-blue-400 text-[11px]">~/.network-spy/ca/network-spy.crt</code>{" "}
              to the device's <b>Downloads</b> folder.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Install the CA Certificate on Android",
      description: (
        <div className="space-y-4">
          <p>The exact steps depend on your Android version:</p>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Android 11 and newer</p>
            <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
              <li>Open <b>Settings</b> → <b>Security</b> (or <b>Security & privacy</b>)</li>
              <li>Tap <b>Encryption & credentials</b> → <b>Install a certificate</b></li>
              <li>Select <b>CA certificate</b></li>
              <li>You may see a warning — tap <b>"Install anyway"</b></li>
              <li>Navigate to <b>Downloads</b> and select <code className="text-blue-400 text-[11px]">network-spy.crt</code></li>
              <li>Verify: Settings → Security → <b>Trusted credentials</b> → <b>User</b> tab — you should see <b>"NetworkSpy CA"</b></li>
            </ol>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 mt-3">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Android 10 and older</p>
            <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
              <li>Open <b>Settings</b> → <b>Security</b> → <b>Advanced</b></li>
              <li>Tap <b>Encryption & credentials</b> → <b>Install from storage</b></li>
              <li>Navigate to <b>Downloads</b> and select <code className="text-blue-400 text-[11px]">network-spy.crt</code></li>
              <li>Enter your device PIN if prompted</li>
              <li>Verify: Settings → Security → <b>Trusted credentials</b> → <b>User</b> tab</li>
            </ol>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
            <p className="text-[11px] text-amber-300 font-bold mb-1">Important: User vs. System CA</p>
            <p className="text-[11px] text-amber-300/80">
              On Android 7+, apps <b>do not trust user-installed CAs by default</b> —
              only system CAs. Unless the app explicitly opts in (see the next step),
              you will only intercept browser traffic. To intercept app traffic, the
              app must declare <code className="text-amber-400/80">network_security_config.xml</code>.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "App Traffic: network_security_config.xml (Android 7+)",
      description: (
        <div className="space-y-3">
          <p>
            To intercept traffic from <b>your own app</b> during development, add a
            network security configuration that trusts user-installed CAs:
          </p>
        </div>
      ),
      codeBlocks: [
        {
          fileName: "res/xml/network_security_config.xml",
          code:
`<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <debug-overrides>
        <trust-anchors>
            <!-- Trust user-installed CAs for debug builds -->
            <certificates src="user" />
            <certificates src="system" />
        </trust-anchors>
    </debug-overrides>
</network-security-config>`,
        },
        {
          fileName: "AndroidManifest.xml",
          code:
`<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
</application>`,
        },
      ],
    },
    {
      title: "Configure WiFi Proxy on Android",
      description: (
        <div className="space-y-3">
          <p>Route your Android device's traffic through NetworkSpy:</p>
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
            <li>Open <b>Settings</b> → <b>Wi-Fi</b></li>
            <li>Long-press (or tap the gear icon) on your connected WiFi network</li>
            <li>Tap <b>Modify network</b> (or <b>Manage network settings</b>)</li>
            <li>Expand <b>Advanced options</b></li>
            <li>Set <b>Proxy</b> to <b>"Manual"</b></li>
            <li>
              Enter your <b>desktop's local IP address</b> as the proxy hostname
              (find it in NetworkSpy's status bar, or run{" "}
              <code className="text-blue-400 text-[11px]">ifconfig</code> /{" "}
              <code className="text-blue-400 text-[11px]">ipconfig</code>)
            </li>
            <li>Set <b>Proxy port</b> to <b>9090</b> (default NetworkSpy port)</li>
            <li>Tap <b>Save</b></li>
          </ol>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-3">
            <p className="text-[11px] text-amber-300/80">
              Disable any active VPNs on your Android device — they bypass the
              WiFi proxy settings. Also ensure both devices are on the <b>same network</b>.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Verify It Works",
      description: (
        <div className="space-y-3">
          <p>Confirm everything is set up correctly:</p>
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
            <li>
              On your Android device, open Chrome and visit{" "}
              <code className="text-blue-400 text-[11px]">https://example.com</code>.
              The page should load without any certificate warning.
            </li>
            <li>
              Check the padlock in the address bar — the certificate issuer
              should be <b>"NetworkSpy CA"</b>.
            </li>
            <li>
              In NetworkSpy on your desktop, you should see the HTTPS request appear
              in the traffic list.
            </li>
            <li>
              If the page shows a certificate error, the CA was not installed correctly.
              Go back to Step 3 and verify it appears under <b>Trusted credentials → User</b>.
            </li>
          </ol>
        </div>
      ),
    },
  ];

  return (
    <Guide
      platform="Android Device"
      icon={<SiAndroid size={32} />}
      steps={androidSteps}
    />
  );
}
