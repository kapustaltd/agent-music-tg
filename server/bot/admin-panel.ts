import { Bot } from "grammy";
import type { AppDb } from "../db";
import type { BotContext } from "./context";
import { getAdminStats, type StatsPeriod } from "../admin/stats";
import { heading } from "./emoji";

const STATS_PERIOD_LABELS: Record<StatsPeriod, string> = {
  today: "Сегодня",
  week: "Неделя",
  month: "Месяц",
  all: "Всё время",
};

function statsText(s: ReturnType<typeof getAdminStats>): string {
  const rev = s.revenue.length > 0 ? s.revenue.map((r) => `${r.total} ${r.asset}`).join(", ") : "0";
  const revAllTime =
    s.revenueAllTime.length > 0 ? s.revenueAllTime.map((r) => `${r.total} ${r.asset}`).join(", ") : "0";
  const conv = s.conversionRate === null ? "—" : `${(s.conversionRate * 100).toFixed(1)}%`;
  const top = s.topOffers.length > 0 ? s.topOffers.map((o) => `${o.title} (${o.count})`).join(", ") : "—";
  const topUsers =
    s.topActiveUsers.length > 0
      ? s.topActiveUsers
          .map((u, i) => `${i + 1}. ${u.username ? "@" + u.username : u.chatId} — ${u.generations}`)
          .join("\n")
      : "—";
  const seg = s.segments;
  const funnelLabels: Record<(typeof s.funnel)[number]["event"], string> = {
    acquired: "Пришли",
    miniapp_opened: "Открыли приложение",
    generation_started: "Начали генерацию",
    generation_completed: "Получили плейлист",
    checkout_started: "Начали оплату",
    purchase_completed: "Оплатили",
  };
  const funnel = s.funnel
    .map((step) => `${funnelLabels[step.event]}: ${step.users}${step.overallConversion === null ? "" : ` (${(step.overallConversion * 100).toFixed(1)}%)`}`)
    .join("\n");
  const attributionLabel = (value: string | null): string => {
    if (!value) return "";
    return {
      direct: "Прямой",
      referral: "Реферальная программа",
      unknown: "Неизвестный",
      telegram: "Telegram",
      legacy: "Исторические данные",
      "deep-link": "Диплинк",
    }[value] ?? value;
  };
  const sources = s.trafficSources
    .slice(0, 5)
    .map((source) => `${attributionLabel(source.source)}${source.medium ? ` / ${attributionLabel(source.medium)}` : ""}: ${source.users} → ${source.payers}`)
    .join("\n") || "Нет данных";
  const campaigns = s.utmCampaigns
    .slice(0, 5)
    .map((campaign) => `${campaign.campaign}: ${campaign.users} → ${campaign.payers}`)
    .join("\n") || "Нет данных";
  return (
    `<b>${heading("stats", "Статистика")}</b> · ${STATS_PERIOD_LABELS[s.period]}\n` +
    `Всего пользователей: ${s.totalUsers}\n` +
    `Новых за период: ${s.newUsers}\n` +
    `Активных подписок: ${s.activeSubscriptions}\n` +
    `Оплаченных покупок: ${s.paidPurchases}\n` +
    `Выручка за период: ${rev}\n` +
    `Выручка всего: ${revAllTime}\n` +
    `Конверсия: ${conv}\n` +
    `Топ пакеты: ${top}\n\n` +
    `<b>Сегменты пользователей</b>\n` +
    `С подпиской: ${seg.activeSubscription}\n` +
    `На трайле: ${seg.trialActive}\n` +
    `Покупали, без подписки: ${seg.payingNoSubscription}\n` +
    `Бесплатные, без покупок: ${seg.freeNoActivity}\n\n` +
    `<b>Топ по активности</b> (генераций)\n${topUsers}\n\n` +
    `<b>Группы</b>\n${s.groups.active} активных · ${s.groups.searches} поисков · ${s.groups.tracks} треков\n\n` +
    `<b>Inline-поиск</b>\n${s.inline.users} пользователей · ${s.inline.searches} поисков · ${s.inline.tracks} отправок\n\n` +
    `<b>Воронка привлечения</b>\n${funnel}\n\n` +
    `<b>Источники трафика</b>\n${sources}\n\n` +
    `<b>UTM-кампании</b>\n${campaigns}`
  );
}

/** Registers the only interactive admin command that remains in Telegram. */
export function registerAdminPanel(bot: Bot<BotContext>, db: AppDb): void {
  bot.command("stats", async (ctx) => {
    if (!ctx.isAdmin) return;
    await ctx.reply(statsText(getAdminStats(db, "all")), { parse_mode: "HTML" });
  });
}
