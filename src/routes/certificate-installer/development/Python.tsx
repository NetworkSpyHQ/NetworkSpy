import { SiPython } from "react-icons/si";
import Guide, { GuideStep } from "../Guide";

export function PythonInstaller() {
  const steps: GuideStep[] = [
    {
      title: "What This Does",
      description: (
        <div className="space-y-3">
          <p>
            To intercept HTTPS traffic from Python scripts (CLI tools, tests, scrapers,
            API clients), your Python HTTP library needs to route requests through
            NetworkSpy's proxy <b>and</b> trust the NetworkSpy CA certificate.
          </p>
          <p>
            There are three levels of configuration, from quickest to most thorough:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-[12px] text-zinc-400 ml-2">
            <li>
              <b>Environment variables</b> — works for <code className="text-blue-400">requests</code>,
              <code className="text-blue-400">httpx</code>, <code className="text-blue-400">urllib</code>,
              and any library that respects <code className="text-blue-400">HTTP_PROXY</code>/<code className="text-blue-400">REQUESTS_CA_BUNDLE</code>
            </li>
            <li>
              <b>Per-session</b> — explicit proxy + CA bundle in a <code className="text-blue-400">requests.Session</code>
            </li>
            <li>
              <b>Monkey-patch</b> — intercept everything system-wide via environment variables
            </li>
          </ol>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-3">
            <p className="text-[11px] text-amber-300 font-bold mb-1">Prerequisites</p>
            <p className="text-[11px] text-amber-300/80">
              The CA certificate must be installed on your machine first. NetworkSpy
              must be running with the proxy active (default: <code className="text-amber-400/80">localhost:9090</code>).
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Method 1: Environment Variables (Quickest)",
      description: (
        <div className="space-y-3">
          <p>
            Set these before running your Python script. Works for <b>requests</b>,
            <b> httpx</b>, <b>urllib3</b>, <b>aiohttp</b>, and most HTTP clients
            that respect the de-facto standard env vars:
          </p>
        </div>
      ),
      codeBlocks: [
        {
          fileName: "Terminal (set env vars)",
          code:
            `export HTTP_PROXY=http://localhost:9090
export HTTPS_PROXY=http://localhost:9090
export REQUESTS_CA_BUNDLE=~/.network-spy/ca/network-spy.crt
export SSL_CERT_FILE=~/.network-spy/ca/network-spy.crt

# Now run your script
python my_script.py`,
        },
      ],
    },
    {
      title: "Method 2: requests.Session (Recommended for scripts)",
      description: (
        <div className="space-y-3">
          <p>
            Explicit configuration gives you full control. Create a session with the
            proxy and CA bundle wired in:
          </p>
        </div>
      ),
      codeBlocks: [
        {
          fileName: "intercept_session.py",
          code:
            `import requests
import os

CA_PATH = os.path.expanduser("~/.network-spy/ca/network-spy.crt")
PROXY = "http://localhost:9090"

session = requests.Session()
session.proxies = {
    "http": PROXY,
    "https": PROXY,
}
session.verify = CA_PATH  # trust NetworkSpy CA

# All requests through this session are intercepted
resp = session.get("https://api.example.com/data")
print(resp.status_code, resp.json())

# Disable proxy for specific domains
session.proxies = {}
resp = session.get("https://localhost:3000/health")  # bypasses proxy`,
        },
      ],
    },
    {
      title: "Method 3: httpx (async + sync)",
      description: (
        <div className="space-y-3">
          <p>
            <code className="text-blue-400">httpx</code> supports both sync and async.
            Configure a client with the proxy and CA:
          </p>
        </div>
      ),
      codeBlocks: [
        {
          fileName: "intercept_httpx.py",
          code:
            `import httpx
import os

CA_PATH = os.path.expanduser("~/.network-spy/ca/network-spy.crt")

# Sync
with httpx.Client(
    proxy="http://localhost:9090",
    verify=CA_PATH,
) as client:
    resp = client.get("https://api.example.com/data")
    print(resp.json())

# Async
async with httpx.AsyncClient(
    proxy="http://localhost:9090",
    verify=CA_PATH,
) as client:
    resp = await client.get("https://api.example.com/data")
    print(resp.json())`,
        },
      ],
    },
    {
      title: "Add to pytest Configuration",
      description: (
        <div className="space-y-3">
          <p>
            To intercept traffic from your test suite, add a conftest fixture:
          </p>
        </div>
      ),
      codeBlocks: [
        {
          fileName: "conftest.py",
          code:
            `import pytest
import os

@pytest.fixture(autouse=True)
def intercept_http_traffic(monkeypatch):
    """Route all test HTTP traffic through NetworkSpy."""
    monkeypatch.setenv("HTTP_PROXY", "http://localhost:9090")
    monkeypatch.setenv("HTTPS_PROXY", "http://localhost:9090")
    monkeypatch.setenv(
        "REQUESTS_CA_BUNDLE",
        os.path.expanduser("~/.network-spy/ca/network-spy.crt"),
    )
    yield`,
        },
      ],
    },
    {
      title: "Verify It Works",
      description: (
        <div className="space-y-3">
          <p>
            Run a quick smoke test — you should see the request appear in NetworkSpy:
          </p>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
            <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden">
              <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
                <code>export HTTP_PROXY=http://localhost:9090{"\n"}export HTTPS_PROXY=http://localhost:9090{"\n"}export REQUESTS_CA_BUNDLE=~/.network-spy/ca/network-spy.crt{"\n"}{"\n"}python -c "import requests; print(requests.get('https://httpbin.org/json').status_code)"</code>
              </pre>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500">
            If you get an SSL error, verify the CA cert path exists:{" "}
            <code className="text-zinc-400">ls -la ~/.network-spy/ca/network-spy.crt</code>.
            If you get a connection error, check NetworkSpy is running.
          </p>
        </div>
      ),
    },
  ];

  return (
    <Guide platform="Python" icon={<SiPython size={32} />} steps={steps} />
  );
}
