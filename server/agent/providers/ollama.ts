import type { AgentGenerateOptions, AgentProvider } from "../types";
import { openaiCompatChat } from "../openai-compat";

/** Ollama's OpenAI-compatible endpoint (0.3+) — no real API key needed, auth is ignored locally. */
export function createOllamaProvider(baseUrl: string, model: string): AgentProvider {
  return {
    id: "ollama",
    generateMessages: (system, messages, tools, options?: AgentGenerateOptions) =>
      openaiCompatChat(
        { baseUrl: `${baseUrl.replace(/\/+$/, "")}/v1`, apiKey: "ollama", model },
        system,
        messages,
        tools,
        options,
      ),
  };
}
