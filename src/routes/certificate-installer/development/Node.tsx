import { SiNodedotjs } from "react-icons/si";
import Guide, { GuideStep } from "../Guide";

export function NodeInstaller() {
  const steps: GuideStep[] = [
    {
      title: "What This Does",
      description: (
        <div className="space-y-3">
          <p>
            To intercept HTTPS traffic from Node.js (scripts, tests, API clients,
            CLI tools), your HTTP client needs to route requests through NetworkSpy's
            proxy <b>and</b> trust the NetworkSpy CA certificate.
          </p>
          <p>
            Node.js does <b>not</b> use the system trust store by default — you must
            explicitly tell it where to find the CA certificate.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-3">
            <p className="text-[11px] text-amber-300 font-bold mb-1">Prerequisites</p>
            <p className="text-[11px] text-amber-300/80">
              The CA certificate must be installed on your machine first. NetworkSpy
              must be running (default proxy: <code className="text-amber-400/80">localhost:9090</code>).
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Global: NODE_EXTRA_CA_CERTS (Easiest)",
      description: (
        <div className="space-y-3">
          <p>
            Set <code className="text-blue-400">NODE_EXTRA_CA_CERTS</code> to make
            Node.js trust the NetworkSpy CA for <b>all</b> TLS connections. This
            works with <code className="text-blue-400">fetch()</code>,
            <code className="text-blue-400"> axios</code>,
            <code className="text-blue-400"> node-fetch</code>,
            <code className="text-blue-400"> got</code>,
            and the built-in <code className="text-blue-400">https</code> module.
          </p>
          <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden">
            <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
              <code>export NODE_EXTRA_CA_CERTS=~/.network-spy/ca/network-spy.crt{"\n"}export HTTP_PROXY=http://localhost:9090{"\n"}export HTTPS_PROXY=http://localhost:9090{"\n"}{"\n"}node my_script.js</code>
            </pre>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">
            This is the cleanest approach. Add it to your{" "}
            <code className="text-zinc-400">~/.zshrc</code> or{" "}
            <code className="text-zinc-400">~/.bashrc</code> for persistent use,
            or set it per-project in a <code className="text-zinc-400">.env</code> file.
          </p>
        </div>
      ),
    },
    {
      title: "Native fetch() with Proxy & Custom CA",
      description: (
        <div className="space-y-3">
          <p>
            Node 18+ has a built-in <code className="text-blue-400">fetch()</code>.
            Use <code className="text-blue-400">undici</code>'s proxy agent for proxying,
            and <code className="text-blue-400">NODE_EXTRA_CA_CERTS</code> for the CA:
          </p>
        </div>
      ),
      codeBlocks: [
        {
          fileName: "fetch_with_proxy.js",
          code:
            `// Requires: npm install undici
import { ProxyAgent } from "undici";

const agent = new ProxyAgent({
  uri: "http://localhost:9090",
  // undici 6+ auto-follows env proxy settings
});

const resp = await fetch("https://api.example.com/data", {
  dispatcher: agent,
  // CA trust handled by NODE_EXTRA_CA_CERTS env var
});
console.log(resp.status, await resp.json());`,
        },
      ],
    },
    {
      title: "Axios with Proxy & Custom CA",
      description: (
        <div className="space-y-3">
          <p>
            Axios respects <code className="text-blue-400">HTTP_PROXY</code> env vars
            and <code className="text-blue-400">NODE_EXTRA_CA_CERTS</code>. For explicit
            configuration:
          </p>
        </div>
      ),
      codeBlocks: [
        {
          fileName: "axios_intercept.js",
          code:
            `import axios from "axios";
import https from "https";
import fs from "fs";
import os from "os";

const caPath = os.homedir() + "/.network-spy/ca/network-spy.crt";

const client = axios.create({
  proxy: {
    protocol: "http",
    host: "localhost",
    port: 9090,
  },
  httpsAgent: new https.Agent({ ca: fs.readFileSync(caPath) }),
});

// All requests through this client are intercepted
const { data } = await client.get("https://api.example.com/data");
console.log(data);`,
        },
      ],
    },
    {
      title: "Node https Module (Built-in)",
      description: (
        <div className="space-y-3">
          <p>
            Using the raw <code className="text-blue-400">https</code> module?
            Pass the CA cert via the agent:
          </p>
        </div>
      ),
      codeBlocks: [
        {
          fileName: "https_native.js",
          code:
            `import https from "https";
import fs from "fs";
import os from "os";

const caPath = os.homedir() + "/.network-spy/ca/network-spy.crt";

const agent = new https.Agent({
  ca: fs.readFileSync(caPath),
});

https.get("https://api.example.com/data", { agent }, (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => console.log(body));
});

// Proxy must be set via env vars: HTTP_PROXY, HTTPS_PROXY`,
        },
      ],
    },
    {
      title: "Verify It Works",
      description: (
        <div className="space-y-3">
          <p>Run a quick smoke test:</p>
          <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden">
            <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
              <code>export NODE_EXTRA_CA_CERTS=~/.network-spy/ca/network-spy.crt{"\n"}export HTTP_PROXY=http://localhost:9090{"\n"}export HTTPS_PROXY=http://localhost:9090{"\n"}{"\n"}node -e 'fetch("https://httpbin.org/json").then(r =&gt; r.json()).then(console.log)'</code>
            </pre>
          </div>
          <p className="text-[11px] text-zinc-500">
            The request should appear in NetworkSpy. If you get{" "}
            <code className="text-zinc-400">UNABLE_TO_VERIFY_LEAF_SIGNATURE</code>,
            <code className="text-zinc-400">NODE_EXTRA_CA_CERTS</code> is not set or
            the cert path is wrong.
          </p>
        </div>
      ),
    },
  ];

  return (
    <Guide platform="Node.js" icon={<SiNodedotjs size={32} />} steps={steps} />
  );
}
