import type { AgentGenerateOptions, AgentProvider } from "../types";
import { openaiCompatChat } from "../openai-compat";

const PRIMARY_BASE_URL = "https://ru.cheapvibecode.ru/v1";
const FALLBACK_BASE_URL = "https://cheapvibecode.ru/v1";
const LEGACY_PRIMARY_BASE_URL = FALLBACK_BASE_URL;
const FALLBACK_MODEL = "gpt-5.6-luna";
// A hung model must not consume the whole agent timeout before the provider
// can try another CheapVibeCode model or endpoint.
const CALL_TIMEOUT_MS = 12_000;

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
        return await openaiCompatChat({ baseUrl: primary, apiKey, model, timeoutMs: CALL_TIMEOUT_MS }, system, messages, tools, options);
      } catch (err) {
        if (!shouldTryFallback(err)) throw err;

        // CheapVibeCode can expose a model in /models while that model's
        // upstream is temporarily wedged. Keep the request on the same
        // provider and use its currently healthy low-cost model first.
        if (primary === PRIMARY_BASE_URL && model !== FALLBACK_MODEL) {
          try {
            return await openaiCompatChat(
              { baseUrl: primary, apiKey, model: FALLBACK_MODEL, timeoutMs: CALL_TIMEOUT_MS },
              system,
              messages,
              tools,
              options,
            );
          } catch (fallbackModelError) {
            err = fallbackModelError;
          }
        }

        if (primary !== PRIMARY_BASE_URL) throw err;
        return openaiCompatChat(
          { baseUrl: FALLBACK_BASE_URL, apiKey, model: model === FALLBACK_MODEL ? model : FALLBACK_MODEL, timeoutMs: CALL_TIMEOUT_MS },
          system,
          messages,
          tools,
          options,
        );
      }
    },
  };
}
