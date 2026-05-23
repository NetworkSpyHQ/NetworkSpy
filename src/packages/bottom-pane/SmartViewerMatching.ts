import { ViewerMatcher, Viewer } from "@src/context/ViewerContext";

export interface TrafficDataProvider {
  getRequestPairData(trafficId: string): Promise<{ headers?: any; body?: any }>;
  getResponsePairData(trafficId: string): Promise<{ headers?: any; body?: any }>;
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const decoder = new TextDecoder();

const normalizeHeaders = (headers: any): Record<string, string> => {
  if (Array.isArray(headers)) {
    return headers.reduce((acc: any, h: any) => ({ ...acc, [h.key || h.name]: h.value }), {});
  }
  return headers || {};
};

const getHeader = (headers: any[], name: string): string =>
  headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

const readBody = (body: any): string => {
  if (!body) return "";
  return body instanceof Uint8Array || Array.isArray(body)
    ? decoder.decode(new Uint8Array(body))
    : body;
};

export class SmartViewerMatching {
  private provider: TrafficDataProvider;
  private builtinMatchers: Record<string, ViewerMatcher[]>;
  private viewers: Viewer[];

  constructor(
    provider: TrafficDataProvider,
    builtinMatchers: Record<string, ViewerMatcher[]>,
    viewers: Viewer[]
  ) {
    this.provider = provider;
    this.builtinMatchers = builtinMatchers;
    this.viewers = viewers;
  }

  async matchTraffic(trafficId: string, traffic: any): Promise<Record<string, number>> {
    const readRequestHeaders = async () =>
      normalizeHeaders((await this.provider.getRequestPairData(trafficId))?.headers);
    const readRequestBody = async () =>
      readBody((await this.provider.getRequestPairData(trafficId))?.body);
    const readResponseHeaders = async () =>
      normalizeHeaders((await this.provider.getResponsePairData(trafficId))?.headers);
    const readResponseBody = async () =>
      readBody((await this.provider.getResponsePairData(trafficId))?.body);

    const evaluateMatcher = async (matcher: ViewerMatcher): Promise<boolean> => {
      if (matcher.glob) {
        const url = traffic.url || traffic.uri || "";
        if (url.includes(matcher.glob)) return true;
        const pattern = matcher.glob;
        const regex = new RegExp(
          "^" +
            pattern
              .split("*")
              .map((s) => s.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"))
              .join(".*") +
            "$",
          "i"
        );
        if (regex.test(url)) return true;
      }
      if (matcher.js && matcher.js.trim() !== "") {
        try {
          const src = `return (async () => { try { ${matcher.js} } catch(e) { return false; } })();`;
          const fn = new AsyncFunction(
            "traffic",
            "readRequestHeaders",
            "readRequestBody",
            "readResponseHeaders",
            "readResponseBody",
            "getHeader",
            src
          );
          return !!(await fn(
            traffic,
            readRequestHeaders,
            readRequestBody,
            readResponseHeaders,
            readResponseBody,
            getHeader
          ));
        } catch {
          return false;
        }
      }
      return false;
    };

    const scoreMode = async (matchers: ViewerMatcher[]): Promise<number> => {
      const results = await Promise.all(matchers.map((m) => evaluateMatcher(m)));
      return results.filter(Boolean).length;
    };

    const builtinPromises = Object.entries(this.builtinMatchers).map(
      async ([modeId, matchers]) => {
        const score = await scoreMode(matchers);
        return { modeId, score };
      }
    );

    const customPromises = this.viewers.map(async (viewer) => {
      try {
        const content = JSON.parse(viewer.content);
        if (content.matchers && Array.isArray(content.matchers)) {
          const score = await scoreMode(content.matchers);
          return { modeId: viewer.id, score };
        }
      } catch {}
      return { modeId: viewer.id, score: 0 };
    });

    const allResults = await Promise.all([...builtinPromises, ...customPromises]);

    const scores: Record<string, number> = {};
    for (const { modeId, score } of allResults) {
      if (score > 0) scores[modeId] = score;
    }
    return scores;
  }
}
