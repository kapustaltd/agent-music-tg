import { afterEach, beforeEach, describe, expect, test } from "bun:test";

process.env.TELEGRAM_BOT_TOKEN ??= "123456:test-token";
process.env.CRYPTOBOT_TOKEN ??= "test-crypto-token";
process.env.PUBLIC_ORIGIN ??= "https://miniapp.example";

const { openDb } = await import("../db");
const { createBot } = await import("./index");
const { publishShare } = await import("../access/shares-store");

const CHAT = 987654;
const ADMIN_CHAT = 987655;

interface ApiCall {
  method: string;
  payload: Record<string, unknown>;
}

function makeHarness(chatId: number, isAdmin: boolean) {
  const db = openDb(":memory:");
  db.run("INSERT INTO allowlist (chat_id, is_admin) VALUES (?, ?)", [chatId, isAdmin ? 1 : 0]);
  const bot = createBot(db);
  const calls: ApiCall[] = [];
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    if (method === "sendMessage") {
      return { ok: true, result: { message_id: 1, date: 0, chat: { id: chatId, type: "private" } } } as never;
    }
    if (method === "getUserProfilePhotos") {
      return { ok: true, result: { total_count: 0, photos: [] } } as never;
    }
    return { ok: true, result: true } as never;
  });
  return { db, bot, calls, sent: () => calls.filter((c) => c.method === "sendMessage") };
}

function textUpdate(chatId: number, text: string, updateId = 1) {
  return {
    update_id: updateId,
    message: {
      message_id: updateId + 100,
      date: Math.floor(Date.now() / 1000),
      chat: { id: chatId, type: "private" },
      from: { id: chatId, is_bot: false, first_name: "T" },
      text,
      entities: text.startsWith("/")
        ? [{ type: "bot_command", offset: 0, length: text.split(" ")[0]!.length }]
        : undefined,
    },
  };
}

function callbackUpdate(chatId: number, data: string, updateId = 1) {
  return {
    update_id: updateId,
    callback_query: {
      id: String(updateId),
      from: { id: chatId, is_bot: false, first_name: "T" },
      chat_instance: "x",
      data,
      message: {
        message_id: 5,
        date: Math.floor(Date.now() / 1000),
        chat: { id: chatId, type: "private" },
        text: "prev",
      },
    },
  };
}

function inlineUpdate(chatId: number, query = "motorama") {
  return {
    update_id: 1,
    inline_query: {
      id: "inline-1",
      from: { id: chatId, is_bot: false, first_name: "T" },
      query,
      offset: "",
    },
  };
}

describe("minimal Telegram entrypoint", () => {
  let user: ReturnType<typeof makeHarness>;
  let admin: ReturnType<typeof makeHarness>;

  beforeEach(async () => {
    user = makeHarness(CHAT, false);
    admin = makeHarness(ADMIN_CHAT, true);
    await user.bot.init().catch(() => {});
    await admin.bot.init().catch(() => {});
  });

  afterEach(() => {
    user.db.close();
    admin.db.close();
  });

  test("/start sends one Mini App button", async () => {
    await user.bot.handleUpdate(textUpdate(CHAT, "/start") as never);

    const sent = user.sent();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.payload.text).toBe("Откройте Mini App, чтобы продолжить.");
    const markup = sent[0]?.payload.reply_markup as { inline_keyboard: Array<Array<{ text: string; web_app?: { url: string } }>> };
    expect(markup.inline_keyboard).toEqual([[{ text: "Открыть приложение", web_app: { url: "https://miniapp.example/" } }]]);
  });

  test("/start share deep-link opens the shared playlist in the Mini App", async () => {
    const owner = 777001;
    user.db.run("INSERT INTO allowlist (chat_id, is_admin) VALUES (?, 0)", [owner]);
    const share = publishShare(user.db, owner, {
      sourceKind: "playlist",
      sourceId: 1,
      name: "Shared",
      prompt: null,
      tracks: [],
    });

    await user.bot.handleUpdate(textUpdate(CHAT, `/start pl_${share.token}`) as never);

    const markup = user.sent()[0]?.payload.reply_markup as { inline_keyboard: Array<Array<{ web_app?: { url: string } }>> };
    expect(markup.inline_keyboard).toHaveLength(1);
    expect(markup.inline_keyboard[0]?.[0]?.web_app?.url).toBe(`https://miniapp.example/?share=${share.token}`);
  });

  test("/stats is admin-only and has no keyboard", async () => {
    await admin.bot.handleUpdate(textUpdate(ADMIN_CHAT, "/stats") as never);
    await user.bot.handleUpdate(textUpdate(CHAT, "/stats") as never);

    expect(admin.sent()).toHaveLength(1);
    expect(String(admin.sent()[0]?.payload.text)).toContain("Статистика");
    expect(admin.sent()[0]?.payload.reply_markup).toBeUndefined();
    expect(user.sent()).toHaveLength(0);
  });

  test("legacy commands, callbacks, inline queries and plain text are ignored", async () => {
    await user.bot.handleUpdate(textUpdate(CHAT, "/admin") as never);
    await user.bot.handleUpdate(textUpdate(CHAT, "/search моторика", 2) as never);
    await user.bot.handleUpdate(textUpdate(CHAT, "найти музыку", 3) as never);
    await user.bot.handleUpdate(callbackUpdate(CHAT, "nav:generate", 4) as never);
    await user.bot.handleUpdate(inlineUpdate(CHAT) as never);

    expect(user.sent()).toHaveLength(0);
    expect(user.calls.some((call) => call.method === "answerInlineQuery")).toBe(false);
    expect(user.calls.some((call) => call.method === "answerCallbackQuery")).toBe(false);
  });
});
