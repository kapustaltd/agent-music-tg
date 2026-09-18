import type { AgentGenerateOptions, AgentProvider } from "../types";
import { openaiCompatChat } from "../openai-compat";

const PRIMARY_BASE_URL = "https://ru.cheapvibecode.ru/v1";
const FALLBACK_BASE_URL = "https://cheapvibecode.ru/v1";
const LEGACY_PRIMARY_BASE_URL = FALLBACK_BASE_URL;

function normalizeBaseUrl(baseUrl: string | undefined): string {
  const value = (baseUrl ?? PRIMARY_BASE_URL).replace(/\/+$/, "");
  // Existing DB overrides used the old primary domain. The provider's
  // recommended RU endpoint is faster and avoids waiting for the fallback.
  return value === LEGACY_PRIMARY_BASE_URL ? PRIMARY_BASE_URL : value;
}

function shouldTryFallback(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  // Do not retry invalid credentials or unsupported models against the same
  // service: that only doubles the latency. Retry network and upstream faults.
  return /(?:fetch failed|network|timed out|timeout|\b5\d\d\b)/i.test(message);
}

export function createCheapVibeCodeProvider(apiKey: string, model = "deepseek-v4-flash", baseUrl?: string): AgentProvider {
  const primary = normalizeBaseUrl(baseUrl);
  return {
    id: "cheapvibecode",
    generateMessages: async (system, messages, tools, options?: AgentGenerateOptions) => {
      try {
        return await openaiCompatChat({ baseUrl: primary, apiKey, model, timeoutMs: 40_000 }, system, messages, tools, options);
      } catch (err) {
        if (primary !== PRIMARY_BASE_URL || !shouldTryFallback(err)) throw err;
        return openaiCompatChat(
          { baseUrl: FALLBACK_BASE_URL, apiKey, model, timeoutMs: 40_000 },
          system,
          messages,
          tools,
          options,
        );
      }
    },
  };
}
