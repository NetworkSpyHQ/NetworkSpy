import { SiRuby } from "react-icons/si";
import Guide, { GuideStep } from "../Guide";

export function RubyInstaller() {
  const steps: GuideStep[] = [
    {
      title: "What This Does",
      description: (
        <div className="space-y-3">
          <p>
            To intercept HTTPS traffic from Ruby programs (Rails apps, scripts,
            tests, API clients), your HTTP client needs to route requests through
            NetworkSpy's proxy <b>and</b> trust the NetworkSpy CA certificate.
          </p>
          <p>
            Ruby's <code className="text-blue-400">Net::HTTP</code> and popular
            gems (<code className="text-blue-400">httparty</code>,
            <code className="text-blue-400"> faraday</code>,
            <code className="text-blue-400"> rest-client</code>) all respect the
            standard proxy environment variables.
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
      title: "Method 1: Environment Variables (Quickest)",
      description: (
        <div className="space-y-3">
          <p>
            Set these before running your Ruby script. Works for{" "}
            <b>Net::HTTP</b>, <b>httparty</b>, <b>faraday</b>, <b>rest-client</b>,
            <b> typhoeus</b>, and most gems that follow the standard:
          </p>
        </div>
      ),
      codeBlocks: [
        {
          fileName: "Terminal",
          code:
            `export HTTP_PROXY=http://localhost:9090
export HTTPS_PROXY=http://localhost:9090
export SSL_CERT_FILE=~/.network-spy/ca/network-spy.crt

# Now run your script
ruby my_script.rb

# Or for Rails
HTTP_PROXY=http://localhost:9090 HTTPS_PROXY=http://localhost:9090 \\
  SSL_CERT_FILE=~/.network-spy/ca/network-spy.crt \\
  rails server`,
        },
      ],
    },
    {
      title: "Net::HTTP (Built-in, No Gems)",
      description: (
        <div className="space-y-3">
          <p>
            Ruby's built-in <code className="text-blue-400">Net::HTTP</code>
            respects <code className="text-blue-400">HTTP_PROXY</code> env vars.
            For explicit proxy + CA configuration:
          </p>
        </div>
      ),
      codeBlocks: [
        {
          fileName: "net_http_intercept.rb",
          code:
            `require "net/http"
require "uri"

ca_path = File.expand_path("~/.network-spy/ca/network-spy.crt")

uri = URI("https://api.example.com/data")

# Create HTTP connection through the proxy
http = Net::HTTP.new(
  uri.host,
  uri.port,
  "localhost",  # proxy host
  9090,         # proxy port
)

# Enable TLS and set the CA cert
http.use_ssl = true
http.ca_file = ca_path
http.verify_mode = OpenSSL::SSL::VERIFY_PEER

request = Net::HTTP::Get.new(uri)
response = http.request(request)

puts response.code
puts response.body`,
        },
      ],
    },
    {
      title: "Faraday with Proxy & Custom CA",
      description: (
        <div className="space-y-3">
          <p>
            Faraday is the most popular HTTP client in Ruby. Configure proxy
            and SSL options in the connection:
          </p>
        </div>
      ),
      codeBlocks: [
        {
          fileName: "faraday_intercept.rb",
          code:
            `require "faraday"

ca_path = File.expand_path("~/.network-spy/ca/network-spy.crt")

conn = Faraday.new(
  url: "https://api.example.com",
  proxy: "http://localhost:9090",
  ssl: {
    ca_file: ca_path,
    verify: true,
  },
) do |f|
  f.request :json
  f.response :json
end

resp = conn.get("/data")
puts resp.status
puts resp.body`,
        },
      ],
    },
    {
      title: "Ruby on Rails: Application-wide Config",
      description: (
        <div className="space-y-3">
          <p>
            For Rails apps, configure the proxy in an initializer. This way all
            Active Job webhooks, Action Mailer API calls, and third-party gem
            requests are intercepted:
          </p>
        </div>
      ),
      codeBlocks: [
        {
          fileName: "config/initializers/network_spy.rb",
          code:
            `# Route all outbound HTTP through NetworkSpy in development
if Rails.env.development?
  require "faraday"

  ca_path = File.expand_path("~/.network-spy/ca/network-spy.crt")

  # For gems that use Faraday (e.g., Octokit, Stripe)
  Faraday.default_connection_options = {
    proxy: "http://localhost:9090",
    ssl: { ca_file: ca_path, verify: true },
  }

  # For gems using Net::HTTP directly
  ENV["HTTP_PROXY"] = "http://localhost:9090"
  ENV["HTTPS_PROXY"] = "http://localhost:9090"
  ENV["SSL_CERT_FILE"] = ca_path
end`,
        },
      ],
    },
    {
      title: "Verify It Works",
      description: (
        <div className="space-y-3">
          <p>Quick smoke test — should appear in NetworkSpy:</p>
          <div className="bg-[#0c0c0c] border border-zinc-800 rounded-xl overflow-hidden">
            <pre className="p-4 text-[11px] font-mono text-green-400/80 overflow-x-auto">
              <code>export HTTP_PROXY=http://localhost:9090{"\n"}export HTTPS_PROXY=http://localhost:9090{"\n"}export SSL_CERT_FILE=~/.network-spy/ca/network-spy.crt{"\n"}{"\n"}ruby -e 'require "net/http"; puts Net::HTTP.get_response(URI("https://httpbin.org/get")).code'</code>
            </pre>
          </div>
          <p className="text-[11px] text-zinc-500">
            If you get <code className="text-zinc-400">SSL_connect returned=1 errno=0 ... certificate verify failed</code>,
            the CA cert path is wrong or <code className="text-zinc-400">SSL_CERT_FILE</code>
            is not set. Verify with{" "}
            <code className="text-zinc-400">ls ~/.network-spy/ca/network-spy.crt</code>.
          </p>
        </div>
      ),
    },
  ];

  return (
    <Guide platform="Ruby" icon={<SiRuby size={32} />} steps={steps} />
  );
}
