import { FiMonitor } from "react-icons/fi";
import Guide, { GuideStep } from "../Guide";

export function KVMInstaller() {
  const kvmSteps: GuideStep[] = [
    {
      title: "What This Does",
      description: (
        <div className="space-y-3">
          <p>
            To intercept HTTPS traffic from a KVM/QEMU virtual machine, NetworkSpy runs
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
              <b>virtiofs / 9p shared folder</b>: If you have a shared folder set up,
              copy the cert through it. Add{" "}
              <code className="text-blue-400 text-[11px]">-virtfs local,path=/home/user/.network-spy/ca,mount_tag=certs,security_model=none</code>{" "}
              to your QEMU command.
            </li>
            <li>
              <b>SCP</b>: Most direct method — SSH into the VM:
              <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden mt-1">
                <pre className="p-3 text-[11px] font-mono text-green-400/80 overflow-x-auto">
                  <code>scp ~/.network-spy/ca/network-spy.crt user@vm-ip:~/</code>
                </pre>
              </div>
            </li>
            <li>
              <b>HTTP server</b>: Start a local server on the host and download from
              inside the VM:
              <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden mt-1">
                <pre className="p-3 text-[11px] font-mono text-green-400/80 overflow-x-auto">
                  <code>cd ~/.network-spy/ca && python3 -m http.server 8000\{"\n"}# Inside VM: wget http://&lt;host-ip&gt;:8000/network-spy.crt</code>
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
              <b>Linux guest</b> (most common for KVM) →{" "}
              <code className="text-blue-400">sudo cp network-spy.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates</code>.
              See the <b>Linux</b> guide in the sidebar for browser-specific (NSS, Firefox) steps.
            </li>
            <li>
              <b>Windows guest</b> → Double-click the <code className="text-blue-400">.crt</code>,
              "Install Certificate" → Current User → Trusted Root Certification Authorities.
            </li>
          </ul>
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
              With <b>user-mode networking</b> (default, <code className="text-blue-400">-net user</code>),
              the host is at <code className="text-blue-400">10.0.2.2</code>.
              With <b>bridged networking</b> or <b>macvtap</b>, use the host's LAN IP.
            </li>
            <li>
              Set the proxy in the guest OS to{" "}
              <code className="text-blue-400">&lt;host-ip&gt;:9090</code>.
            </li>
            <li>
              For CLI tools:
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
          <p className="text-[12px] text-zinc-400">
            In the VM browser, visit <code className="text-blue-400">https://example.com</code>.
            No cert warning = working. The request should appear in NetworkSpy on the host.
          </p>
        </div>
      ),
    },
  ];

  return (
    <Guide
      platform="KVM"
      icon={<FiMonitor size={32} />}
      steps={kvmSteps}
    />
  );
}
