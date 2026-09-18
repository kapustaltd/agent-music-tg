import { afterEach, describe, expect, mock, test } from "bun:test";
import { createOpencodeProvider } from "./opencode";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restore();
});

describe("OpenCode Anthropic transport", () => {
  test("authenticates Messages API requests with x-api-key", async () => {
    let headers: Headers | undefined;
    globalThis.fetch = mock(async (_input: string | URL | Request, init?: RequestInit) => {
      headers = new Headers(init?.headers);
      return new Response(JSON.stringify({ content: [{ type: "text", text: "ok" }] }));
    }) as unknown as typeof fetch;

    const provider = createOpencodeProvider("test-key", "https://zen.example/v1", "claude-sonnet-5");
    await provider.generateMessages("system", [{ role: "user", content: "test" }], []);

    expect(headers?.get("x-api-key")).toBe("test-key");
    expect(headers?.get("anthropic-version")).toBe("2023-06-01");
    expect(headers?.get("authorization")).toBeNull();
  });
});
