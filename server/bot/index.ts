import { Bot, InlineKeyboard } from "grammy";
import { sequentialize } from "@grammyjs/runner";
import type { AppDb } from "../db";
import { env } from "../env";
import type { BotContext } from "./context";
import { allowlistGate } from "./middleware";
import { getAllowlist } from "../lib/access-control";
import { getReferralSettings } from "../lib/settings";
import { upsertUser, setPhotoFileId } from "../access/users-store";
import { alertNewUser } from "../payments/alerts";
import { registerAdminPanel } from "./admin-panel";
import { applyReferral } from "../access/referral-store";
import { grantPlaylistSlotsForPayment } from "../access/stars-payments-store";
import { classifyStarsPayload } from "../payments/stars";
import { parseStartAttribution, recordAttributionTouch, recordEvent, recordFirstTouch } from "../analytics/store";
import { parseShareToken } from "../access/share-link";
import { getShare } from "../access/shares-store";
import { escapeHtml, statusMessage } from "./message-format";

function formatGenerationCount(count: number): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  const form = mod100 >= 11 && mod100 <= 14
    ? "генераций"
    : mod10 === 1
      ? "генерация"
      : mod10 >= 2 && mod10 <= 4
        ? "генерации"
        : "генераций";
  return `${count} ${form}`;
}

export function createBot(db: AppDb): Bot<BotContext> {
  const bot = new Bot<BotContext>(env.telegramBotToken);
  bot.catch((err) => {
    console.error(`Bot handler error for update ${err.ctx.update.update_id}:`, err.error);
  });
  // The runner in server/index.ts handles updates from different chats
  // concurrently. Keep updates from one chat ordered for consistent signup,
  // attribution and payment state.
  bot.use(sequentialize((ctx) => {
    return String(ctx.chat?.id ?? ctx.from?.id ?? "");
  }));
  bot.use(allowlistGate(db));

  bot.command("start", async (ctx) => {
    const startParam = String(ctx.match ?? "").trim() || null;
    const isNewUser = upsertUser(
      db,
      ctx.chat.id,
      ctx.from?.username ?? null,
      ctx.from?.first_name ?? null,
    );
    const attribution = parseStartAttribution(startParam);
    recordFirstTouch(db, ctx.chat.id, attribution);
    if (startParam) recordAttributionTouch(db, ctx.chat.id, attribution);
    recordEvent(db, ctx.chat.id, "bot_started", startParam ? { startParam } : {});
    if (isNewUser) {
      alertNewUser(ctx.chat.id, ctx.from?.username).catch(() => {});
    }
    const refMatch = /^ref_(\d+)$/.exec(startParam ?? "");
    if (isNewUser && refMatch) {
      const referrerChatId = Number(refMatch[1]);
      if (applyReferral(db, referrerChatId, ctx.chat.id)) {
        const reward = formatGenerationCount(getReferralSettings(db).rewardCredits);
        bot.api.sendMessage(
          referrerChatId,
          `Новый реферал. Вам начислено <b>${escapeHtml(reward)}</b>.`,
          { parse_mode: "HTML" },
        ).catch(() => {});
      }
    }
    // A shared playlist link is also a referral: the author brought this person
    // in, so it credits through the same path ref_ links use. applyReferral is
    // idempotent per invitee, so re-tapping the link changes nothing.
    const shareToken = parseShareToken(startParam);
    const share = shareToken ? getShare(db, shareToken) : null;
    const liveShare = share && share.revokedAt === null ? share : null;
    if (liveShare && applyReferral(db, liveShare.ownerChatId, ctx.chat.id)) {
      const reward = formatGenerationCount(getReferralSettings(db).rewardCredits);
      bot.api.sendMessage(
        liveShare.ownerChatId,
        `По вашей ссылке пришли. Вам начислено <b>${escapeHtml(reward)}</b>.`,
        { parse_mode: "HTML" },
      ).catch(() => {});
    }

    // Fire-and-forget: avatar persistence is not part of the Mini App launch
    // response and must not delay the single /start message.
    const startChatId = ctx.chat.id;
    void bot.api
      .getUserProfilePhotos(startChatId, { limit: 1 })
      .then((photos) => {
        const first = photos.photos[0];
        if (first && first.length > 0) {
          setPhotoFileId(db, startChatId, first[first.length - 1]!.file_id);
        }
      })
      .catch(() => { /* non-critical; profile will show placeholder */ });

    const appUrl = new URL(env.publicOrigin);
    if (liveShare) appUrl.searchParams.set("share", liveShare.token);
    const keyboard = new InlineKeyboard().webApp("Открыть приложение", appUrl.toString());
    await ctx.reply("Откройте Mini App, чтобы продолжить.", { reply_markup: keyboard });
  });

  registerAdminPanel(bot, db);
  const startCommand = { command: "start", description: "Открыть приложение" };
  bot.api.setMyCommands([startCommand]).catch(() => {});
  const adminCommands = [startCommand, { command: "stats", description: "Статистика для админа" }];
  for (const admin of getAllowlist(db).filter((entry) => entry.isAdmin)) {
    bot.api
      .setMyCommands(adminCommands, { scope: { type: "chat", chat_id: admin.chatId } })
      .catch(() => {});
  }

  // Telegram Stars (XTR) for playlist slots. An unrecognised payload is
  // rejected rather than blanket-approved, so a checkout can only succeed for
  // an invoice issued by the Mini App flow.
  bot.on("pre_checkout_query", async (ctx) => {
    const payload = classifyStarsPayload(ctx.preCheckoutQuery.invoice_payload);
    if (payload.kind !== "slots") {
      await ctx.answerPreCheckoutQuery(false, "Этот счёт больше недоступен.").catch(() => {});
      return;
    }
    await ctx.answerPreCheckoutQuery(true).catch(() => {});
  });

  bot.on("message:successful_payment", async (ctx) => {
    const payment = ctx.message.successful_payment;
    const payload = classifyStarsPayload(payment.invoice_payload);
    if (payload.kind !== "slots") return;
    const { chatId, slots } = payload;
    const granted = grantPlaylistSlotsForPayment(db, payment.telegram_payment_charge_id, chatId, slots);
    if (granted) {
      await ctx
        .reply(statusMessage("check", "Лимит увеличен", `Добавлено мест: ${slots}.`), { parse_mode: "HTML" })
        .catch(() => {});
    }
  });

  return bot;
}
