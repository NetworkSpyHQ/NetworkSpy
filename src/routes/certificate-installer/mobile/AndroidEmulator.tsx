import { SiAndroid } from "react-icons/si";
import Guide, { GuideStep } from "../Guide";

export function AndroidEmulatorInstaller() {
  const emulatorSteps: GuideStep[] = [
    {
      title: "What This Does",
      description: (
        <div className="space-y-3">
          <p>
            To intercept HTTPS traffic from your Android emulator, NetworkSpy acts as a
            <b> proxy server</b> on your host machine. The emulator routes its traffic
            through the host, and NetworkSpy decrypts TLS using its root CA certificate.
          </p>
          <p>
            Unlike a physical device, the emulator can access the host via the special
            alias <code className="text-blue-400 text-[11px]">10.0.2.2</code>, which
            maps to the host's <code className="text-zinc-400">localhost</code>.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-3">
            <p className="text-[11px] text-amber-300 font-bold mb-1">Prerequisites</p>
            <p className="text-[11px] text-amber-300/80">
              The certificate must be installed on your host machine first. Use the
              <b> "One-Click Install CA"</b> button above, or complete the desktop
              guide for your OS from the sidebar.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Push the Certificate to the Emulator",
      description: (
        <div className="space-y-3">
          <p>
            Use <code className="text-blue-400">adb</code> to copy the certificate
            file to the emulator's download directory:
          </p>
          <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Terminal (all platforms)</span>
            </div>
            <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
              <code>adb push ~/.network-spy/ca/network-spy.crt /sdcard/Download/</code>
            </pre>
          </div>
          <p className="text-[11px] text-zinc-500">
            If you have multiple emulators running, specify the device with{" "}
            <code className="text-zinc-400">adb -s &lt;device-id&gt; push ...</code>.
            List connected devices with <code className="text-zinc-400">adb devices</code>.
          </p>
        </div>
      ),
    },
    {
      title: "Install the CA Certificate on the Emulator",
      description: (
        <div className="space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Via Emulator UI</p>
            <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
              <li>Open <b>Settings</b> → <b>Security</b> → <b>Encryption & credentials</b></li>
              <li>Tap <b>Install a certificate</b> → <b>CA certificate</b></li>
              <li>Tap <b>"Install anyway"</b> on the warning dialog</li>
              <li>Open the hamburger menu → <b>Downloads</b> → select <code className="text-blue-400 text-[11px]">network-spy.crt</code></li>
              <li>Verify: Settings → Security → <b>Trusted credentials</b> → <b>User</b> tab</li>
            </ol>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Via ADB (no UI interaction)</p>
            <p className="text-[12px] text-zinc-400">
              On emulators with Google APIs (recommended), you can install directly
              via adb after pushing the file:
            </p>
            <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden mt-2">
              <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
                <code>adb shell am start -a android.settings.SECURITY_SETTINGS</code>
              </pre>
            </div>
            <p className="text-[11px] text-zinc-500 mt-2">
              This opens the security settings directly. Then follow the UI steps above.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Configure Emulator Proxy",
      description: (
        <div className="space-y-3">
          <p>
            The Android emulator can be configured to use the host's proxy in two ways:
          </p>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Method 1: Emulator WiFi Settings (persistent)</p>
            <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
              <li>Open <b>Settings</b> → <b>Wi-Fi</b> on the emulator</li>
              <li>Long-press <b>"AndroidWifi"</b> → <b>Modify network</b></li>
              <li>Expand <b>Advanced options</b> → set <b>Proxy</b> to <b>"Manual"</b></li>
              <li>
                Set <b>Proxy hostname</b> to <code className="text-blue-400 text-[11px]">10.0.2.2</code>
              </li>
              <li>Set <b>Proxy port</b> to <code className="text-blue-400 text-[11px]">9090</code></li>
              <li>Tap <b>Save</b></li>
            </ol>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 mt-3">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Method 2: Emulator Launch Flags (for automation)</p>
            <p className="text-[12px] text-zinc-400">
              Start the emulator with the <code className="text-blue-400">-http-proxy</code> flag:
            </p>
            <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden mt-2">
              <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
                <code>emulator -avd Pixel_6_API_33 -http-proxy 127.0.0.1:9090</code>
              </pre>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500">
            The special IP <code className="text-zinc-400">10.0.2.2</code> is an
            alias for the host machine's loopback interface. NetworkSpy must be
            listening on <b>all interfaces</b> (not just localhost) — verify this in
            NetworkSpy's proxy settings.
          </p>
        </div>
      ),
    },
    {
      title: "App Traffic: network_security_config.xml (Android 7+)",
      description: (
        <div className="space-y-3">
          <p>
            To intercept traffic from your app during development, add a network
            security configuration that trusts user-installed CAs:
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
      title: "Verify It Works",
      description: (
        <div className="space-y-3">
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
            <li>
              In the emulator's Chrome browser, visit{" "}
              <code className="text-blue-400 text-[11px]">https://example.com</code>.
              The page should load without certificate errors.
            </li>
            <li>
              Check the certificate issuer in the padlock — it should be
              <b> "NetworkSpy CA"</b>.
            </li>
            <li>
              In NetworkSpy on your host, the request should appear in the traffic list
              with the source client shown as the emulator.
            </li>
          </ol>
        </div>
      ),
    },
  ];

  return (
    <Guide
      platform="Android Emulator"
      icon={<SiAndroid size={32} />}
      steps={emulatorSteps}
    />
  );
}
