import { afterEach, describe, expect, mock, test } from "bun:test";
import { createCheapVibeCodeProvider } from "./cheapvibecode";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restore();
});

describe("CheapVibeCode provider defaults", () => {
  test("uses the recommended endpoint and deepseek flash model", async () => {
    let requestUrl = "";
    let requestBody: Record<string, unknown> | undefined;
    globalThis.fetch = mock(async (input: string | URL | Request, init?: RequestInit) => {
      requestUrl = String(input);
      requestBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }));
    }) as unknown as typeof fetch;

    const provider = createCheapVibeCodeProvider("test-key");
    await provider.generateMessages("system", [{ role: "user", content: "test" }], []);

    expect(requestUrl).toBe("https://ru.cheapvibecode.ru/v1/chat/completions");
    expect(requestBody?.model).toBe("deepseek-v4-flash");
  });

  test("normalizes the old primary override to the recommended endpoint", async () => {
    let requestUrl = "";
    globalThis.fetch = mock(async (input: string | URL | Request) => {
      requestUrl = String(input);
      return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }));
    }) as unknown as typeof fetch;

    const provider = createCheapVibeCodeProvider("test-key", "deepseek-v4-flash", "https://cheapvibecode.ru/v1/");
    await provider.generateMessages("system", [{ role: "user", content: "test" }], []);

    expect(requestUrl).toBe("https://ru.cheapvibecode.ru/v1/chat/completions");
  });

  test("does not retry a permanent upstream error against the fallback", async () => {
    let calls = 0;
    globalThis.fetch = mock(async () => {
      calls++;
      return new Response("invalid model", { status: 400 });
    }) as unknown as typeof fetch;

    const provider = createCheapVibeCodeProvider("test-key");
    await expect(provider.generateMessages("system", [{ role: "user", content: "test" }], [])).rejects.toThrow("400");

    expect(calls).toBe(1);
  });

  test("falls back to a healthy CheapVibeCode model after a timeout", async () => {
    const requestBodies: Record<string, unknown>[] = [];
    let calls = 0;
    globalThis.fetch = mock(async (_input: string | URL | Request, init?: RequestInit) => {
      requestBodies.push(JSON.parse(String(init?.body)));
      calls++;
      if (calls === 1) throw new Error("request timed out");
      return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }));
    }) as unknown as typeof fetch;

    const provider = createCheapVibeCodeProvider("test-key", "deepseek-v4-flash");
    await expect(provider.generateMessages("system", [{ role: "user", content: "test" }], [])).resolves.toMatchObject({
      text: "ok",
    });

    expect(requestBodies.map((body) => body.model)).toEqual(["deepseek-v4-flash", "gpt-5.6-luna"]);
  });
});
