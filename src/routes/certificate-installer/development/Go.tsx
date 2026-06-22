import { SiGo } from "react-icons/si";
import Guide, { GuideStep } from "../Guide";

export function GoInstaller() {
  const steps: GuideStep[] = [
    {
      title: "What This Does",
      description: (
        <div className="space-y-3">
          <p>
            To intercept HTTPS traffic from Go programs (microservices, CLI tools,
            tests, API clients), your HTTP client needs to route requests through
            NetworkSpy's proxy <b>and</b> trust the NetworkSpy CA certificate.
          </p>
          <p>
            Go's <code className="text-blue-400">net/http</code> respects the{" "}
            <code className="text-blue-400">HTTP_PROXY</code> /{" "}
            <code className="text-blue-400">HTTPS_PROXY</code> environment variables
            by default. For the CA certificate, you configure a custom{" "}
            <code className="text-blue-400">http.Transport</code> with a custom root CA pool.
          </p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mt-3">
            <p className="text-[11px] text-amber-300 font-bold mb-1">Prerequisites</p>
            <p className="text-[11px] text-amber-300/80">
              The CA certificate must be installed on your machine. NetworkSpy
              must be running (default: <code className="text-amber-400/80">localhost:9090</code>).
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Quick: Environment Variables (Ad-hoc)",
      description: (
        <div className="space-y-3">
          <p>
            Go's <code className="text-blue-400">net/http</code> reads proxy settings
            from the environment automatically. Set these before running:
          </p>
          <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden">
            <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
              <code>export HTTP_PROXY=http://localhost:9090{"\n"}export HTTPS_PROXY=http://localhost:9090{"\n"}export SSL_CERT_FILE=~/.network-spy/ca/network-spy.crt{"\n"}{"\n"}go run main.go</code>
            </pre>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">
            <code className="text-zinc-400">SSL_CERT_FILE</code> works if your
            program uses the system cert pool (Go's default). Many Go programs
            ship their own certs — for those, use the explicit Transport below.
          </p>
        </div>
      ),
    },
    {
      title: "Custom http.Transport with Proxy & CA (Recommended)",
      description: (
        <div className="space-y-3">
          <p>
            Explicit configuration gives you full control. Create a transport
            with the proxy and custom CA certificate pool:
          </p>
        </div>
      ),
      codeBlocks: [
        {
          fileName: "main.go",
          code:
            `package main

import (
    "crypto/tls"
    "crypto/x509"
    "fmt"
    "io"
    "net/http"
    "net/url"
    "os"
)

func main() {
    home, _ := os.UserHomeDir()
    caPath := home + "/.network-spy/ca/network-spy.crt"

    // Read the CA cert
    caCert, err := os.ReadFile(caPath)
    if err != nil {
        panic(err)
    }

    // Create a cert pool with the CA
    caCertPool := x509.NewCertPool()
    caCertPool.AppendCertsFromPEM(caCert)

    // Configure proxy
    proxyURL, _ := url.Parse("http://localhost:9090")

    // Build the client
    client := &http.Client{
        Transport: &http.Transport{
            Proxy: http.ProxyURL(proxyURL),
            TLSClientConfig: &tls.Config{
                RootCAs: caCertPool,
            },
        },
    }

    resp, err := client.Get("https://api.example.com/data")
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    fmt.Println(resp.Status, string(body))
}`,
        },
      ],
    },
    {
      title: "Global http.DefaultTransport (Intercept Everything)",
      description: (
        <div className="space-y-3">
          <p>
            Replace the default transport to intercept <b>all</b> HTTP traffic
            in your program (including libraries that use the default client):
          </p>
        </div>
      ),
      codeBlocks: [
        {
          fileName: "init.go (call in main)",
          code:
            `func initNetworkSpy() {
    home, _ := os.UserHomeDir()
    caCert, _ := os.ReadFile(home + "/.network-spy/ca/network-spy.crt")
    pool := x509.NewCertPool()
    pool.AppendCertsFromPEM(caCert)

    proxyURL, _ := url.Parse("http://localhost:9090")

    http.DefaultTransport = &http.Transport{
        Proxy: http.ProxyURL(proxyURL),
        TLSClientConfig: &tls.Config{RootCAs: pool},
    }
    // Also set for http.DefaultClient
    http.DefaultClient.Transport = http.DefaultTransport
}`,
        },
      ],
    },
    {
      title: "Verify It Works",
      description: (
        <div className="space-y-3">
          <p>Run this quick test — the request should appear in NetworkSpy:</p>
          <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden">
            <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
              <code>export HTTP_PROXY=http://localhost:9090{"\n"}export HTTPS_PROXY=http://localhost:9090{"\n"}{"\n"}go run -e 'package main; import ("net/http"; "fmt"); func main() {"{"} r,_ := http.Get("https://httpbin.org/get"); fmt.Println(r.Status) {"}"}'</code>
            </pre>
          </div>
          <p className="text-[11px] text-zinc-500">
            If you get <code className="text-zinc-400">x509: certificate signed by unknown authority</code>,
            the CA cert wasn't loaded. Verify the path and use the explicit Transport approach.
          </p>
        </div>
      ),
    },
  ];

  return (
    <Guide platform="Go" icon={<SiGo size={32} />} steps={steps} />
  );
}
