import { SiVirtualbox } from "react-icons/si";
import Guide, { GuideStep } from "../Guide";

export function VirtualBoxInstaller() {
  const vbSteps: GuideStep[] = [
    {
      title: "What This Does",
      description: (
        <div className="space-y-3">
          <p>
            To intercept HTTPS traffic from a VirtualBox virtual machine, NetworkSpy
            runs on your host machine and acts as a proxy. The VM routes its traffic
            through the host, and NetworkSpy decrypts TLS using its root CA.
          </p>
          <p>
            The VM needs the CA certificate installed in its trust store and its
            network configured to use the host as a proxy.
          </p>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 mt-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-bold">Certificate Location (host)</p>
            <code className="text-[11px] text-blue-400 break-all">
              ~/.network-spy/ca/network-spy.crt
            </code>
          </div>
        </div>
      ),
    },
    {
      title: "Transfer Certificate Into the VM",
      description: (
        <div className="space-y-3">
          <p>Choose one method to get the cert file into the guest OS:</p>
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
            <li>
              <b>Shared Folders</b>: Enable a shared folder in VM settings →
              Devices → Shared Folders. Map to <code className="text-blue-400 text-[11px]">~/.network-spy/ca/</code>.
            </li>
            <li>
              <b>Drag & Drop</b>: Enable drag-and-drop in VM settings, then drag
              <code className="text-blue-400 text-[11px]">network-spy.crt</code> into the VM window.
            </li>
            <li>
              <b>SCP</b>: If the VM has SSH enabled, from the host:
              <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden mt-1">
                <pre className="p-3 text-[11px] font-mono text-green-400/80 overflow-x-auto">
                  <code>scp ~/.network-spy/ca/network-spy.crt user@vm-ip:~/</code>
                </pre>
              </div>
            </li>
          </ol>
        </div>
      ),
    },
    {
      title: "Install Certificate in the VM",
      description: (
        <div className="space-y-3">
          <p>
            Once the cert file is inside the VM, install it according to the
            guest operating system:
          </p>
          <ul className="list-disc list-inside space-y-2 text-[12px] text-zinc-400 ml-2">
            <li>
              <b>Windows guest</b> → Double-click the <code className="text-blue-400">.crt</code> file,
              choose "Install Certificate" → Current User → Trusted Root Certification Authorities.
              See the <b>Windows</b> guide in the sidebar for full details.
            </li>
            <li>
              <b>Linux guest</b> → Copy to{" "}
              <code className="text-blue-400">/usr/local/share/ca-certificates/</code> and
              run <code className="text-blue-400">sudo update-ca-certificates</code>.
              See the <b>Linux</b> guide for browser-specific steps.
            </li>
            <li>
              <b>macOS guest</b> → Double-click the cert, open in Keychain Access,
              set to "Always Trust". See the <b>macOS</b> guide for full details.
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: "Configure Proxy in the VM",
      description: (
        <div className="space-y-3">
          <p>
            Route the VM's traffic through NetworkSpy on the host:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
            <li>Find your host's IP as seen from the VM. With <b>NAT</b> networking, the host is
            at <code className="text-blue-400">10.0.2.2</code>. With <b>Bridged</b>,
            use the host's LAN IP.</li>
            <li>Configure the guest OS system proxy settings to point at{" "}
              <code className="text-blue-400">&lt;host-ip&gt;:9090</code> for both HTTP and HTTPS.</li>
            <li>Alternatively, set environment variables for CLI tools:
              <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden mt-1">
                <pre className="p-3 text-[11px] font-mono text-green-400/80 overflow-x-auto">
                  <code>export HTTP_PROXY=http://10.0.2.2:9090\{"\n"}export HTTPS_PROXY=http://10.0.2.2:9090</code>
                </pre>
              </div>
            </li>
          </ol>
        </div>
      ),
    },
    {
      title: "Verify It Works",
      description: (
        <div className="space-y-3">
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
            <li>
              In the VM, open a browser and visit{" "}
              <code className="text-blue-400 text-[11px]">https://example.com</code>.
              The page should load without certificate errors.
            </li>
            <li>
              In NetworkSpy on the host, the request should appear in the traffic list.
            </li>
          </ol>
        </div>
      ),
    },
  ];

  return (
    <Guide
      platform="VirtualBox"
      icon={<SiVirtualbox size={32} />}
      steps={vbSteps}
    />
  );
}
