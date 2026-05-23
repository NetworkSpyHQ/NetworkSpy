import { describe, it, expect, vi } from "vitest";
import { SmartViewerMatching, TrafficDataProvider } from "../SmartViewerMatching";
import { ViewerMatcher, Viewer } from "@src/context/ViewerContext";

const makeProvider = (overrides?: Partial<TrafficDataProvider>): TrafficDataProvider => ({
  getRequestPairData: vi.fn().mockResolvedValue({ headers: [], body: "" }),
  getResponsePairData: vi.fn().mockResolvedValue({ headers: [], body: "" }),
  ...overrides,
});

const makeViewer = (overrides?: Partial<Viewer>): Viewer => ({
  id: "v1",
  name: "Test Viewer",
  content: JSON.stringify({ blocks: [], matchers: [] }),
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("SmartViewerMatching", () => {
  describe("glob matching", () => {
    it("matches exact URL path", async () => {
      const builtin: Record<string, ViewerMatcher[]> = {
        graphql: [{ glob: "*/graphql" }],
      };
      const matcher = new SmartViewerMatching(makeProvider(), builtin, []);
      const traffic = { id: "t1", url: "https://api.example.com/graphql" };

      const scores = await matcher.matchTraffic("t1", traffic);
      expect(scores).toHaveProperty("graphql");
      expect(scores.graphql).toBeGreaterThan(0);
    });

    it("does not match wrong URL path", async () => {
      const builtin: Record<string, ViewerMatcher[]> = {
        graphql: [{ glob: "*/graphql" }],
      };
      const matcher = new SmartViewerMatching(makeProvider(), builtin, []);
      const traffic = { id: "t1", url: "https://api.example.com/rest/v1/users" };

      const scores = await matcher.matchTraffic("t1", traffic);
      expect(scores).not.toHaveProperty("graphql");
    });

    it("matches wildcard glob with *graphql*", async () => {
      const builtin: Record<string, ViewerMatcher[]> = {
        graphql: [{ glob: "*graphql*" }],
      };
      const matcher = new SmartViewerMatching(makeProvider(), builtin, []);
      const traffic = { id: "t1", url: "https://api.example.com/graphql" };

      const scores = await matcher.matchTraffic("t1", traffic);
      expect(scores).toHaveProperty("graphql");
    });

    it("matches partial URL substring via glob", async () => {
      const builtin: Record<string, ViewerMatcher[]> = {
        custom: [{ glob: "graphql" }],
      };
      const matcher = new SmartViewerMatching(makeProvider(), builtin, []);
      const traffic = { id: "t1", url: "https://my-graphql-server.com/query" };

      const scores = await matcher.matchTraffic("t1", traffic);
      expect(scores).toHaveProperty("custom");
    });
  });

  describe("JS matcher", () => {
    it("evaluates JS matcher returning true", async () => {
      const builtin: Record<string, ViewerMatcher[]> = {
        json_viewer: [{ js: "return traffic.url.includes('.json')" }],
      };
      const matcher = new SmartViewerMatching(makeProvider(), builtin, []);
      const traffic = { id: "t1", url: "https://api.example.com/data.json" };

      const scores = await matcher.matchTraffic("t1", traffic);
      expect(scores).toHaveProperty("json_viewer");
    });

    it("ignores JS matcher returning false", async () => {
      const builtin: Record<string, ViewerMatcher[]> = {
        json_viewer: [{ js: "return traffic.url.includes('.json')" }],
      };
      const matcher = new SmartViewerMatching(makeProvider(), builtin, []);
      const traffic = { id: "t1", url: "https://api.example.com/data.xml" };

      const scores = await matcher.matchTraffic("t1", traffic);
      expect(scores).not.toHaveProperty("json_viewer");
    });

    it("handles JS matcher that throws gracefully", async () => {
      const builtin: Record<string, ViewerMatcher[]> = {
        bad: [{ js: "throw new Error('oops')" }],
      };
      const matcher = new SmartViewerMatching(makeProvider(), builtin, []);
      const traffic = { id: "t1", url: "https://example.com" };

      const scores = await matcher.matchTraffic("t1", traffic);
      expect(scores).not.toHaveProperty("bad");
    });

    it("ignores empty JS matcher", async () => {
      const builtin: Record<string, ViewerMatcher[]> = {
        empty: [{ js: "" }],
      };
      const matcher = new SmartViewerMatching(makeProvider(), builtin, []);
      const traffic = { id: "t1", url: "https://example.com" };

      const scores = await matcher.matchTraffic("t1", traffic);
      expect(scores).not.toHaveProperty("empty");
    });
  });

  describe("combined matchers", () => {
    it("scores higher when multiple matchers match", async () => {
      const builtin: Record<string, ViewerMatcher[]> = {
        graphql: [
          { glob: "*graphql*" },
          { js: "return traffic.url.includes('/graphql')" },
        ],
      };
      const matcher = new SmartViewerMatching(makeProvider(), builtin, []);
      const traffic = { id: "t1", url: "https://api.example.com/graphql" };

      const scores = await matcher.matchTraffic("t1", traffic);
      expect(scores.graphql).toBe(2);
    });

    it("has higher score when both JS checks pass", async () => {
      const builtin: Record<string, ViewerMatcher[]> = {
        graphql: [
          { js: "return true" },
          { js: "return true" },
        ],
      };
      const matcher = new SmartViewerMatching(makeProvider(), builtin, []);
      const traffic = { id: "t1", url: "https://example.com" };

      const scores = await matcher.matchTraffic("t1", traffic);
      expect(scores.graphql).toBe(2);
    });
  });

  describe("custom viewer matchers", () => {
    it("scores custom viewers with matchers", async () => {
      const viewers: Viewer[] = [
        makeViewer({
          id: "custom1",
          content: JSON.stringify({
            blocks: [],
            matchers: [{ glob: "*admin*" }],
          }),
        }),
      ];
      const matcher = new SmartViewerMatching(makeProvider(), {}, viewers);
      const traffic = { id: "t1", url: "https://admin.example.com/dashboard" };

      const scores = await matcher.matchTraffic("t1", traffic);
      expect(scores).toHaveProperty("custom1");
    });

    it("skips custom viewers with invalid content", async () => {
      const viewers: Viewer[] = [
        makeViewer({ id: "bad", content: "not-json" }),
      ];
      const matcher = new SmartViewerMatching(makeProvider(), {}, viewers);
      const traffic = { id: "t1", url: "https://example.com" };

      const scores = await matcher.matchTraffic("t1", traffic);
      expect(scores).not.toHaveProperty("bad");
    });
  });

  describe("empty inputs", () => {
    it("returns empty scores for empty builtin matchers and no viewers", async () => {
      const matcher = new SmartViewerMatching(makeProvider(), {}, []);
      const traffic = { id: "t1", url: "https://example.com" };

      const scores = await matcher.matchTraffic("t1", traffic);
      expect(scores).toEqual({});
    });
  });
});
