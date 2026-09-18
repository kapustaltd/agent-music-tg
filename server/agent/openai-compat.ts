import {
  parseJsonText,
  type AgentGenerateOptions,
  type AgentMessage,
  type AgentResult,
  type ToolCall,
  type ToolSpec,
} from "./types";
import { toolsForOpenAIChat } from "./tools";

interface OpenAIChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
}

function toOpenAIMessages(system: string, messages: AgentMessage[]): OpenAIChatMessage[] {
  const out: OpenAIChatMessage[] = [{ role: "system", content: system }];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      out.push({
        role: "assistant",
        content: m.content,
        tool_calls: m.toolCalls?.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: JSON.stringify(tc.args) },
        })),
      });
    } else {
      out.push({ role: "tool", tool_call_id: m.callId, content: m.content });
    }
  }
  return out;
}

export interface OpenAICompatConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Abort a provider request before the agent-level timeout can leave it hanging. */
  timeoutMs?: number;
  /** OpenAI reasoning budget. Omitted for third-party compatible APIs. */
  reasoningEffort?: "minimal" | "low" | "medium" | "high";
  /** Maximum completion size for gateways that require an explicit budget. */
  maxTokens?: number;
}

interface OpenAIMessagePayload {
  content?: string | null;
  reasoning?: string | null;
  reasoning_content?: string | null;
  tool_calls?: Array<{
    index?: number;
    id?: string;
    function?: { name?: string; arguments?: string };
  }>;
}

interface OpenAIResponsePayload {
  choices?: Array<{ message?: OpenAIMessagePayload; delta?: OpenAIMessagePayload }>;
}

interface ToolCallAccumulator {
  id: string;
  name: string;
  arguments: string;
}

function toToolCalls(accumulators: Map<number, ToolCallAccumulator>): ToolCall[] | undefined {
  const calls: ToolCall[] = [];
  for (const call of accumulators.values()) {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(call.arguments || "{}");
    } catch {
      args = { _raw: call.arguments };
    }
    calls.push({ id: call.id, name: call.name, args });
  }
  return calls.length > 0 ? calls : undefined;
}

function resultFromMessage(message: OpenAIMessagePayload | undefined): AgentResult {
  const reasoning = message?.reasoning_content ?? message?.reasoning;
  const toolCalls = message?.tool_calls
    ? toToolCalls(
        new Map(
          message.tool_calls.map((tc, index) => [
            tc.index ?? index,
            { id: tc.id ?? `call-${index}`, name: tc.function?.name ?? "", arguments: tc.function?.arguments ?? "" },
          ]),
        ),
      )
    : undefined;
  return {
    text: message?.content ?? "",
    reasoning: typeof reasoning === "string" && reasoning.trim().length > 0 ? reasoning : undefined,
    toolCalls,
  };
}

/**
 * Reads OpenAI-compatible SSE while preserving the provider's tool-call
 * fragments. Reasoning is forwarded as soon as a delta arrives so the admin
 * transcript remains useful while a slow model is still thinking.
 */
async function readOpenAIStream(
  res: Response,
  baseUrl: string,
  onReasoning?: (delta: string) => void,
): Promise<AgentResult> {
  if (!res.body) throw new Error(`${baseUrl} returned an empty streaming response`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  let buffer = "";
  let eventData = "";
  let sawSse = false;
  let text = "";
  let reasoning = "";
  const toolCalls = new Map<number, ToolCallAccumulator>();

  const handlePayload = (payload: string) => {
    const value = payload.trim();
    if (!value || value === "[DONE]") return;
    let data: OpenAIResponsePayload;
    try {
      data = JSON.parse(value) as OpenAIResponsePayload;
    } catch {
      throw new Error(`${baseUrl} returned an invalid streaming JSON chunk`);
    }
    const message = data.choices?.[0]?.delta ?? data.choices?.[0]?.message;
    if (!message) return;
    if (typeof message.content === "string") text += message.content;
    const reasoningDelta = message.reasoning_content ?? message.reasoning;
    if (typeof reasoningDelta === "string" && reasoningDelta.length > 0) {
      reasoning += reasoningDelta;
      onReasoning?.(reasoningDelta);
    }
    for (const [position, fragment] of (message.tool_calls ?? []).entries()) {
      const index = fragment.index ?? position;
      const current = toolCalls.get(index) ?? { id: `call-${index}`, name: "", arguments: "" };
      if (fragment.id) current.id = fragment.id;
      if (fragment.function?.name) current.name += fragment.function.name;
      if (fragment.function?.arguments) current.arguments += fragment.function.arguments;
      toolCalls.set(index, current);
    }
  };

  const flushEvent = () => {
    if (!eventData) return;
    handlePayload(eventData);
    eventData = "";
  };

  while (true) {
    const next = await reader.read();
    if (next.done) break;
    const chunk = decoder.decode(next.value, { stream: true });
    raw += chunk;
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).replace(/\r$/, "");
      buffer = buffer.slice(newline + 1);
      if (line.startsWith("data:")) {
        sawSse = true;
        eventData += line.slice(5).trimStart();
      } else if (line === "") {
        flushEvent();
      }
      newline = buffer.indexOf("\n");
    }
  }
  const tail = decoder.decode();
  raw += tail;
  buffer += tail;
  if (buffer.startsWith("data:")) {
    sawSse = true;
    eventData += buffer.slice(5).trimStart();
  }
  flushEvent();

  // A few compatible gateways ignore `stream: true` and return ordinary JSON.
  // Keep that response shape working instead of turning it into a parse error.
  if (!sawSse) {
    const data = parseJsonText<OpenAIResponsePayload>(raw.replace(/\s*data:\s*\[DONE\]\s*$/, ""), baseUrl);
    return resultFromMessage(data.choices?.[0]?.message);
  }

  return {
    text,
    reasoning: reasoning.trim().length > 0 ? reasoning : undefined,
    toolCalls: toToolCalls(toolCalls),
  };
}

/** Shared OpenAI Chat Completions-compatible transport (OpenAI, CheapVibeCode, Ollama). */
export async function openaiCompatChat(
  config: OpenAICompatConfig,
  system: string,
  messages: AgentMessage[],
  tools: ToolSpec[],
  options?: AgentGenerateOptions,
): Promise<AgentResult> {
  const streaming = Boolean(options?.onReasoning);
  const res = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: toOpenAIMessages(system, messages),
      tools: tools.length > 0 ? toolsForOpenAIChat(tools) : undefined,
      reasoning_effort: config.reasoningEffort,
      max_tokens: config.maxTokens,
      stream: streaming ? true : undefined,
    }),
    signal: AbortSignal.timeout(config.timeoutMs ?? 120_000),
  });
  if (!res.ok) {
    throw new Error(`${config.baseUrl} chat completion failed: ${res.status} ${await res.text()}`);
  }
  if (streaming) return readOpenAIStream(res, config.baseUrl, options?.onReasoning);
  const rawBody = (await res.text()).replace(/\s*data:\s*\[DONE\]\s*$/, "");
  const data = parseJsonText<OpenAIResponsePayload>(rawBody, config.baseUrl);
  return resultFromMessage(data.choices?.[0]?.message);
}
