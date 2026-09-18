import { afterEach, describe, expect, mock, test } from "bun:test";
import { createOpenAIProvider } from "./openai";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restore();
});

describe("OpenAI provider latency defaults", () => {
  test("uses the fast model and minimal reasoning for tool-routing turns", async () => {
    let requestBody: Record<string, unknown> | undefined;
    globalThis.fetch = mock(async (_input: string | URL | Request, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: "", tool_calls: [] } }] }));
    }) as unknown as typeof fetch;

    const provider = createOpenAIProvider("test-key");
    await provider.generateMessages("system", [{ role: "user", content: "рок для тренировки" }], []);

    expect(requestBody?.model).toBe("gpt-5-mini");
    expect(requestBody?.reasoning_effort).toBe("minimal");
  });

  test("does not send OpenAI-specific reasoning options to a custom compatible API", async () => {
    let requestBody: Record<string, unknown> | undefined;
    globalThis.fetch = mock(async (_input: string | URL | Request, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }));
    }) as unknown as typeof fetch;

    const provider = createOpenAIProvider("test-key", "custom-model", "https://llm.example/v1");
    await provider.generateMessages("system", [{ role: "user", content: "test" }], []);

    expect(requestBody).not.toHaveProperty("reasoning_effort");
  });

  test("preserves provider reasoning separately from the visible response", async () => {
    globalThis.fetch = mock(async () =>
      new Response(JSON.stringify({
        choices: [{ message: { content: "", reasoning_content: "Проверяю запрос" } }],
      })),
    ) as unknown as typeof fetch;

    const provider = createOpenAIProvider("test-key");
    await expect(provider.generateMessages("system", [{ role: "user", content: "test" }], [])).resolves.toMatchObject({
      text: "",
      reasoning: "Проверяю запрос",
    });
  });

  test("streams reasoning deltas and reconstructs fragmented tool calls", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const chunks = [
      'data: {"choices":[{"delta":{"reasoning_content":"Проверяю "}}]}\n\n',
      'data: {"choices":[{"delta":{"reasoning_content":"запрос"}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call-1","function":{"name":"searchTrack","arguments":"{\\"artist\\":\\"Burial\\","}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":" \\"title\\":\\"Archangel\\"}"}}]}}]}\n\n',
      "data: [DONE]\n\n",
    ];
    globalThis.fetch = mock(async (_input: string | URL | Request, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body));
      const encoder = new TextEncoder();
      let index = 0;
      return new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            if (index >= chunks.length) {
              controller.close();
              return;
            }
            controller.enqueue(encoder.encode(chunks[index++]!));
          },
        }),
        { headers: { "content-type": "text/event-stream" } },
      );
    }) as unknown as typeof fetch;

    const deltas: string[] = [];
    const provider = createOpenAIProvider("test-key", "custom-model", "https://llm.example/v1");
    const result = await provider.generateMessages("system", [{ role: "user", content: "test" }], [], {
      onReasoning: (delta) => deltas.push(delta),
    });

    expect(requestBody?.stream).toBe(true);
    expect(deltas).toEqual(["Проверяю ", "запрос"]);
    expect(result).toMatchObject({
      text: "",
      reasoning: "Проверяю запрос",
      toolCalls: [{ id: "call-1", name: "searchTrack", args: { artist: "Burial", title: "Archangel" } }],
    });
  });
});
