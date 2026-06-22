import { SiDocker } from "react-icons/si";
import Guide, { GuideStep } from "../Guide";

export function DockerInstaller() {
  const dockerSteps: GuideStep[] = [
    {
      title: "What This Does",
      description: (
        <div className="space-y-3">
          <p>
            To intercept HTTPS traffic from processes running inside Docker containers,
            NetworkSpy acts as a proxy on your host machine. Each container routes its
            traffic through the host, and NetworkSpy decrypts TLS using its root CA.
          </p>
          <p>
            The container needs two things: the CA certificate installed in its trust
            store, and its HTTP traffic proxied through the host.
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
      title: "Copy Certificate Into the Container",
      description: (
        <div className="space-y-3">
          <p>
            Use <code className="text-blue-400">docker cp</code> to copy the cert
            from the host into a running container:
          </p>
          <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden">
            <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
              <code>docker cp ~/.network-spy/ca/network-spy.crt \{"\n"}  my-container:/usr/local/share/ca-certificates/network-spy.crt</code>
            </pre>
          </div>
          <p className="text-[11px] text-zinc-500">
            In a Dockerfile, add it during the build:
          </p>
          <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden mt-2">
            <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
              <code>COPY network-spy.crt /usr/local/share/ca-certificates/network-spy.crt\{"\n"}RUN update-ca-certificates</code>
            </pre>
          </div>
        </div>
      ),
    },
    {
      title: "Install Certificate in the Container",
      description: (
        <div className="space-y-3">
          <p>
            The installation command depends on the container's base image:
          </p>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Debian / Ubuntu based</p>
            <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden">
              <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
                <code>docker exec my-container sh -c \{"\n"}  "cp /usr/local/share/ca-certificates/network-spy.crt \{"\n"}   /usr/local/share/ca-certificates/ && \{"\n"}   update-ca-certificates"</code>
              </pre>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 mt-3">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Alpine based</p>
            <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden">
              <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
                <code>docker exec my-container sh -c \{"\n"}  "cp network-spy.crt /usr/local/share/ca-certificates/ && \{"\n"}   update-ca-certificates"</code>
              </pre>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 mt-3">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">RHEL / Fedora based</p>
            <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden">
              <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
                <code>docker exec my-container sh -c \{"\n"}  "cp network-spy.crt /etc/pki/ca-trust/source/anchors/ && \{"\n"}   update-ca-trust"</code>
              </pre>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Configure Proxy in the Container",
      description: (
        <div className="space-y-3">
          <p>
            Set environment variables so the container routes HTTP(S) traffic through
            NetworkSpy on the host:
          </p>
          <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden">
            <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
              <code>docker run -e HTTP_PROXY=http://host.docker.internal:9090 \{"\n"}  -e HTTPS_PROXY=http://host.docker.internal:9090 \{"\n"}  -e NO_PROXY=localhost,127.0.0.1 \{"\n"}  my-image</code>
            </pre>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">
            <code className="text-zinc-400">host.docker.internal</code> resolves to the
            host from inside a container (Docker Desktop on Mac/Windows). On Linux, use{" "}
            <code className="text-zinc-400">172.17.0.1</code> (the default Docker bridge
            gateway) or add <code className="text-zinc-400">--add-host=host.docker.internal:host-gateway</code>.
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
              Inside the container, run{" "}
              <code className="text-blue-400 text-[11px]">curl -v https://example.com</code>.
              The output should show <b>"NetworkSpy CA"</b> in the certificate chain
              and the request should succeed.
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
      platform="Docker"
      icon={<SiDocker size={32} />}
      steps={dockerSteps}
    />
  );
}
