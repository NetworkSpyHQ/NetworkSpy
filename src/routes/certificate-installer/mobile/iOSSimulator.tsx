import { SiApple } from "react-icons/si";
import Guide, { GuideStep } from "../Guide";

export function IOSSimulatorInstaller() {
  const simSteps: GuideStep[] = [
    {
      title: "What This Does",
      description: (
        <div className="space-y-3">
          <p>
            The iOS Simulator shares the Mac's network stack, so it automatically
            uses any proxy configured on your Mac. However, the simulator has its
            <b> own certificate trust store</b> — you must install the CA certificate
            separately inside the simulator.
          </p>
          <p>
            Once installed, HTTPS traffic from the simulator (Safari, your app, etc.)
            will be intercepted by NetworkSpy running on the same Mac.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-3">
            <p className="text-[11px] text-amber-300 font-bold mb-1">Prerequisites</p>
            <p className="text-[11px] text-amber-300/80">
              The certificate must be installed on your Mac first. Use the
              <b> "One-Click Install CA"</b> button above, or complete the macOS
              guide from the sidebar. NetworkSpy should be running with the proxy
              active.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Install the Certificate in the Simulator",
      description: (
        <div className="space-y-3">
          <p>
            Drag and drop the certificate file onto the simulator window.
            The simulator will automatically detect it and open the Settings app.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
            <li>
              In Finder, press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px]">⌘⇧G</kbd> →
              go to <code className="text-blue-400 text-[11px]">~/.network-spy/ca/</code>
            </li>
            <li>
              Drag <code className="text-blue-400 text-[11px]">network-spy.crt</code>{" "}
              onto the <b>simulator window</b>
            </li>
            <li>
              The simulator will open <b>Settings → General → VPN & Device Management</b>
            </li>
            <li>Tap the <b>"NetworkSpy CA"</b> profile → tap <b>"Install"</b></li>
            <li>Enter the simulator passcode if prompted (default is usually no passcode)</li>
            <li>Tap <b>"Install"</b> again → <b>"Done"</b></li>
          </ol>
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4 mt-3">
            <p className="text-[11px] text-blue-300">
              Alternatively, you can serve the file via a local HTTP server and open
              it in Safari inside the simulator:
            </p>
            <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden mt-2">
              <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
                <code>cd ~/.network-spy/ca && python3 -m http.server 8000</code>
              </pre>
            </div>
            <p className="text-[11px] text-zinc-500 mt-2">
              Then in the simulator's Safari, visit{" "}
              <code className="text-blue-400">http://localhost:8000/network-spy.crt</code>
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Enable Full Trust for the Certificate",
      description: (
        <div className="space-y-3">
          <p>
            After installing the profile, you must explicitly enable trust
            (same requirement as a physical iOS device):
          </p>
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
            <li>In the simulator, go to <b>Settings → General → About</b></li>
            <li>Scroll down → <b>Certificate Trust Settings</b></li>
            <li>Toggle <b>"NetworkSpy CA"</b> to ON</li>
            <li>Tap <b>"Continue"</b></li>
          </ol>
        </div>
      ),
    },
    {
      title: "Configure Simulator Proxy (if needed)",
      description: (
        <div className="space-y-3">
          <p>
            The iOS Simulator uses the Mac's system proxy settings by default.
            If NetworkSpy has configured the system proxy, the simulator will
            route traffic through it automatically.
          </p>
          <p>
            To verify or change this, check your Mac's proxy settings:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
            <li>
              Open <b>System Settings → Network → Wi-Fi → Details → Proxies</b>
            </li>
            <li>
              Verify that <b>Web Proxy (HTTP)</b> and <b>Secure Web Proxy (HTTPS)</b>
              are set to <code className="text-blue-400 text-[11px]">127.0.0.1:9090</code>
            </li>
          </ol>
          <p className="text-[11px] text-zinc-500">
            NetworkSpy typically manages these settings automatically when you start
            the proxy. If you need to set them manually, the proxy is always at{" "}
            <code className="text-zinc-400">localhost:9090</code>.
          </p>
        </div>
      ),
    },
    {
      title: "Verify It Works",
      description: (
        <div className="space-y-3">
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
            <li>
              In the simulator, open <b>Safari</b> and visit{" "}
              <code className="text-blue-400 text-[11px]">https://example.com</code>.
              The page should load without certificate errors.
            </li>
            <li>
              In NetworkSpy, you should see the HTTPS request appear in the traffic list.
            </li>
            <li>
              To verify for your own app, make an HTTPS request (e.g. to your API)
              and check that NetworkSpy captures it.
            </li>
          </ol>
        </div>
      ),
    },
  ];

  return (
    <Guide
      platform="iOS Simulator"
      icon={<SiApple size={32} />}
      steps={simSteps}
    />
  );
}
