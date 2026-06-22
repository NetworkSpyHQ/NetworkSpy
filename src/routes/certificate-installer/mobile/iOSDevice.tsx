import { SiApple } from "react-icons/si";
import Guide, { GuideStep } from "../Guide";

export function IOSDeviceInstaller() {
  const iOSSteps: GuideStep[] = [
    {
      title: "What This Does",
      description: (
        <div className="space-y-3">
          <p>
            To intercept HTTPS traffic from your iPhone or iPad, NetworkSpy acts as a
            <b> proxy server</b> on your Mac. Your iOS device connects through it,
            and NetworkSpy decrypts the TLS traffic using its root CA certificate.
          </p>
          <p>
            This guide walks through two things your iOS device needs:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400 ml-2">
            <li>
              <b>Install and trust the CA certificate</b> — iOS requires two explicit
              steps: installing the profile, then enabling trust in Certificate Trust Settings.
            </li>
            <li>
              <b>Configure the WiFi proxy</b> — route traffic through NetworkSpy on your Mac.
            </li>
          </ol>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-3">
            <p className="text-[11px] text-amber-300 font-bold mb-1">Prerequisites</p>
            <p className="text-[11px] text-amber-300/80">
              The certificate must be installed on your Mac first. Use the
              <b> "One-Click Install CA"</b> button above, or complete the macOS
              guide from the sidebar.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Transfer the Certificate to iOS",
      description: (
        <div className="space-y-4">
          <p>Get the certificate file onto your iOS device. Choose one method:</p>

          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Option A: AirDrop (easiest)</p>
            <ol className="list-decimal list-inside space-y-1 text-[12px] text-zinc-400">
              <li>In Finder, press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px]">⌘⇧G</kbd> → go to <code className="text-blue-400 text-[11px]">~/.network-spy/ca/</code></li>
              <li>Right-click <code className="text-blue-400 text-[11px]">network-spy.crt</code> → <b>Share</b> → <b>AirDrop</b></li>
              <li>Select your iOS device. Accept the transfer on your iPhone/iPad.</li>
              <li>iOS will detect the profile and prompt you to install it (proceed to Step 3).</li>
            </ol>
          </div>

          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Option B: Local HTTP Server</p>
            <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden">
              <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
                <code>cd ~/.network-spy/ca && python3 -m http.server 8000</code>
              </pre>
            </div>
            <p className="text-[11px] text-zinc-500 mt-2">
              On your iOS device, open Safari and navigate to{" "}
              <code className="text-blue-400">http://&lt;mac-ip&gt;:8000/network-spy.crt</code>.
              Safari will prompt you to allow the download, then offer to install the profile.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Option C: Email</p>
            <p className="text-[12px] text-zinc-400">
              Email the <code className="text-blue-400 text-[11px]">network-spy.crt</code>{" "}
              file to yourself. Open the email on your iOS device and tap the attachment.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Install the Certificate Profile",
      description: (
        <div className="space-y-3">
          <p>
            After transferring the <code className="text-blue-400">.crt</code> file,
            iOS will detect it as a configuration profile:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
            <li>
              You should see a <b>"Profile Downloaded"</b> notification —
              tap it, or go to <b>Settings → General → VPN & Device Management</b>
            </li>
            <li>Tap the <b>"NetworkSpy CA"</b> profile</li>
            <li>Tap <b>"Install"</b> in the top-right corner</li>
            <li>Enter your device passcode if prompted</li>
            <li>Tap <b>"Install"</b> again on the warning screen</li>
            <li>Tap <b>"Done"</b></li>
          </ol>
          <p className="text-[11px] text-zinc-500">
            The warning about "unsigned profile" is normal — this is a locally-generated
            CA, not one signed by Apple.
          </p>
        </div>
      ),
    },
    {
      title: "Enable Full Trust for the Certificate",
      description: (
        <div className="space-y-3">
          <p>
            <b>This is the step most people miss.</b> Installing the profile is not
            enough — you must explicitly enable trust:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
            <li>Open <b>Settings</b> → <b>General</b> → <b>About</b></li>
            <li>Scroll down and tap <b>Certificate Trust Settings</b></li>
            <li>
              Under <b>"Enable Full Trust for Root Certificates"</b>, toggle
              <b> "NetworkSpy CA"</b> to ON
            </li>
            <li>Tap <b>"Continue"</b> on the confirmation dialog</li>
          </ol>
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4 mt-3">
            <p className="text-[12px] text-blue-300">
              On iOS 12.2+, this toggle appears <b>only after</b> the profile is installed.
              If you don't see "Certificate Trust Settings", go through Step 3 again.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Configure WiFi Proxy on iOS",
      description: (
        <div className="space-y-3">
          <p>Route your iOS device's traffic through NetworkSpy on your Mac:</p>
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
            <li>Open <b>Settings</b> → <b>Wi-Fi</b></li>
            <li>Tap the <b>(i)</b> icon next to your connected WiFi network</li>
            <li>Scroll down to <b>HTTP Proxy</b> → tap <b>Configure Proxy</b></li>
            <li>Select <b>"Manual"</b></li>
            <li>
              Enter your <b>Mac's local IP address</b> as the <b>Server</b>
              (find it in NetworkSpy's status bar, or run{" "}
              <code className="text-blue-400 text-[11px]">ifconfig en0 | grep inet</code>{" "}
              on your Mac)
            </li>
            <li>Set <b>Port</b> to <b>9090</b> (default NetworkSpy port)</li>
            <li>Leave <b>Authentication</b> turned off</li>
            <li>Tap <b>Save</b></li>
          </ol>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-3">
            <p className="text-[11px] text-amber-300/80">
              Disable any active VPNs on your iOS device — they bypass WiFi proxy settings.
              Both devices must be on the <b>same WiFi network</b>.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Verify It Works",
      description: (
        <div className="space-y-3">
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
            <li>
              On your iOS device, open Safari and visit{" "}
              <code className="text-blue-400 text-[11px]">https://example.com</code>.
              The page should load without any certificate warning.
            </li>
            <li>
              Tap the padlock icon in the address bar — the certificate should be
              issued by <b>"NetworkSpy CA"</b>.
            </li>
            <li>
              In NetworkSpy on your Mac, the HTTPS request should appear in the
              traffic list.
            </li>
            <li>
              If you see "Cannot Verify Server Identity" errors, check that
              <b> Certificate Trust Settings</b> (Step 4) is toggled ON.
            </li>
          </ol>
        </div>
      ),
    },
  ];

  return (
    <Guide
      platform="iOS Device"
      icon={<SiApple size={32} />}
      steps={iOSSteps}
    />
  );
}
