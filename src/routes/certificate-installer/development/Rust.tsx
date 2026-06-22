import { SiRust } from "react-icons/si";
import Guide, { GuideStep } from "../Guide";

export function RustInstaller() {
  const steps: GuideStep[] = [
    {
      title: "What This Does",
      description: (
        <div className="space-y-3">
          <p>
            To intercept HTTPS traffic from Rust programs (CLI tools, microservices,
            tests, API clients), your HTTP client needs to route requests through
            NetworkSpy's proxy <b>and</b> trust the NetworkSpy CA certificate.
          </p>
          <p>
            The most popular Rust HTTP client is <b>reqwest</b>. It reads{" "}
            <code className="text-blue-400">HTTP_PROXY</code> /{" "}
            <code className="text-blue-400">HTTPS_PROXY</code> from the environment
            and supports custom root certificates via a <b>ClientBuilder</b>.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-3">
            <p className="text-[11px] text-amber-300 font-bold mb-1">Prerequisites</p>
            <p className="text-[11px] text-amber-300/80">
              NetworkSpy must be running (default proxy: <code className="text-amber-400/80">localhost:9090</code>).
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "reqwest: Custom Client with Proxy & CA",
      description: (
        <div className="space-y-3">
          <p>
            Add <code className="text-blue-400">reqwest</code> with the{" "}
            <code className="text-blue-400">rustls-tls</code> feature to your{" "}
            <code className="text-blue-400">Cargo.toml</code>, then build a
            custom client:
          </p>
        </div>
      ),
      codeBlocks: [
        {
          fileName: "Cargo.toml (dependencies)",
          code:
            `[dependencies]
reqwest = { version = "0.12", features = ["rustls-tls"] }
tokio = { version = "1", features = ["full"] }`,
        },
        {
          fileName: "src/main.rs",
          code:
            `use reqwest::Certificate;
use std::fs;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "~".into());
    let ca_path = format!("{}/.network-spy/ca/network-spy.crt", home);

    // Read the CA certificate
    let ca_bytes = fs::read(&ca_path)?;
    let cert = Certificate::from_pem(&ca_bytes)?;

    // Build client with proxy and custom CA
    let client = reqwest::Client::builder()
        .proxy(reqwest::Proxy::http("http://localhost:9090")?)
        // HTTPS also goes through the same proxy
        .proxy(reqwest::Proxy::https("http://localhost:9090")?)
        // Add the CA to the root cert store
        .add_root_certificate(cert)
        // Optional: disable system certs (use ONLY our CA)
        // .tls_built_in_root_certs(false)
        .build()?;

    let resp = client
        .get("https://api.example.com/data")
        .send()
        .await?;

    println!("Status: {}", resp.status());
    println!("Body: {}", resp.text().await?);
    Ok(())
}`,
        },
      ],
    },
    {
      title: "Proxy via Environment Variables",
      description: (
        <div className="space-y-3">
          <p>
            reqwest reads proxy settings from the environment by default. If you
            set <code className="text-blue-400">HTTP_PROXY</code> /
            <code className="text-blue-400">HTTPS_PROXY</code>, you only need to
            configure the CA cert:
          </p>
          <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden">
            <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
              <code>export HTTP_PROXY=http://localhost:9090{"\n"}export HTTPS_PROXY=http://localhost:9090{"\n"}cargo run</code>
            </pre>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">
            With this approach, your Rust code only needs the{" "}
            <code className="text-zinc-400">.add_root_certificate()</code> call
            — the proxy is picked up from the environment automatically.
          </p>
        </div>
      ),
    },
    {
      title: "Alternative: ureq (Minimal, Sync)",
      description: (
        <div className="space-y-3">
          <p>
            If you prefer a minimal sync client, <b>ureq</b> is a good option:
          </p>
        </div>
      ),
      codeBlocks: [
        {
          fileName: "Cargo.toml",
          code:
            `[dependencies]
ureq = { version = "3", features = ["tls"] }`,
        },
        {
          fileName: "src/main.rs",
          code:
            `use std::fs;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let home = std::env::var("HOME")?;
    let ca_path = format!("{}/.network-spy/ca/network-spy.crt", home);
    let ca_bytes = fs::read(ca_path)?;

    let agent = ureq::AgentBuilder::new()
        .proxy("http://localhost:9090")?
        .add_root_certificate(&ca_bytes)
        .build();

    let resp = agent.get("https://api.example.com/data").call()?;
    println!("Status: {}", resp.status());
    println!("Body: {}", resp.into_string()?);
    Ok(())
}`,
        },
      ],
    },
    {
      title: "Verify It Works",
      description: (
        <div className="space-y-3">
          <p>
            The request should appear in NetworkSpy:
          </p>
          <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden">
            <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
              <code>export HTTP_PROXY=http://localhost:9090{"\n"}export HTTPS_PROXY=http://localhost:9090{"\n"}cargo run</code>
            </pre>
          </div>
          <p className="text-[11px] text-zinc-500">
            If you get a TLS error, the CA certificate wasn't loaded. Verify the
            path: <code className="text-zinc-400">ls ~/.network-spy/ca/network-spy.crt</code>.
            For <b>native-tls</b> (default on Linux with reqwest 0.11), the system
            CA store is used — install the cert system-wide instead.
          </p>
        </div>
      ),
    },
  ];

  return (
    <Guide platform="Rust" icon={<SiRust size={32} />} steps={steps} />
  );
}
