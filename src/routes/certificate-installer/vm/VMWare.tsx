import { SiVmware } from "react-icons/si";
import Guide, { GuideStep } from "../Guide";

export function VMWareInstaller() {
  const vmwSteps: GuideStep[] = [
    {
      title: "What This Does",
      description: (
        <div className="space-y-3">
          <p>
            To intercept HTTPS traffic from a VMware virtual machine, NetworkSpy runs
            on your host and acts as a proxy. The VM routes traffic through the host,
            and NetworkSpy decrypts TLS using its root CA.
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
          <p>Get the cert file into the guest OS:</p>
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
            <li>
              <b>Shared Folders</b>: In VMware, go to VM Settings → Options →
              Shared Folders. Enable and map to <code className="text-blue-400 text-[11px]">~/.network-spy/ca/</code>.
            </li>
            <li>
              <b>Drag & Drop</b>: Enable in VM Settings → Options → Guest Isolation,
              then drag <code className="text-blue-400 text-[11px]">network-spy.crt</code> into the VM.
            </li>
            <li>
              <b>SCP</b>: If SSH is enabled in the guest:
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
          <p>Install the cert according to the guest OS:</p>
          <ul className="list-disc list-inside space-y-2 text-[12px] text-zinc-400 ml-2">
            <li>
              <b>Windows guest</b> → Double-click the <code className="text-blue-400">.crt</code> file,
              "Install Certificate" → Current User → Trusted Root Certification Authorities.
            </li>
            <li>
              <b>Linux guest</b> → <code className="text-blue-400">sudo cp network-spy.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates</code>.
            </li>
            <li>
              <b>macOS guest</b> → Double-click, Keychain Access, set "Always Trust".
            </li>
          </ul>
          <p className="text-[11px] text-zinc-500 mt-2">
            See the sidebar for your guest OS for detailed, browser-specific instructions.
          </p>
        </div>
      ),
    },
    {
      title: "Configure Proxy in the VM",
      description: (
        <div className="space-y-3">
          <p>Route VM traffic through NetworkSpy on the host:</p>
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400">
            <li>
              Find your host's IP from the VM's perspective. With <b>NAT</b> networking,
              it's typically <code className="text-blue-400">192.168.x.1</code> (the VMnet gateway).
              With <b>Bridged</b>, use the host's LAN IP.
            </li>
            <li>
              Configure the guest OS proxy settings to{" "}
              <code className="text-blue-400">&lt;host-ip&gt;:9090</code> for HTTP and HTTPS.
            </li>
            <li>
              For CLI tools:
              <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden mt-1">
                <pre className="p-3 text-[11px] font-mono text-green-400/80 overflow-x-auto">
                  <code>export HTTP_PROXY=http://&lt;host-ip&gt;:9090\{"\n"}export HTTPS_PROXY=http://&lt;host-ip&gt;:9090</code>
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
          <p className="text-[12px] text-zinc-400">
            In the VM browser, visit <code className="text-blue-400">https://example.com</code>.
            No cert warning = working. The request should appear in NetworkSpy.
          </p>
        </div>
      ),
    },
  ];

  return (
    <Guide
      platform="VMware"
      icon={<SiVmware size={32} />}
      steps={vmwSteps}
    />
  );
}
