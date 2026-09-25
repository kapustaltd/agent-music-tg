import { createHmac } from "node:crypto";
import { describe, expect, test } from "bun:test";

process.env.TELEGRAM_BOT_TOKEN ??= "test-token";

const { env } = await import("../env");
const { openDb } = await import("../db");
const { getGrantHistoryForUser } = await import("../admin/grant-history");
const { getUser, upsertUser } = await import("../access/users-store");
const { createApiRoutes } = await import("./routes");

const ADMIN_CHAT = 1001;
const USER_A = 1002;
const USER_B = 1003;

function buildInitData(chatId: number): string {
  const params = new URLSearchParams();
  params.set("auth_date", String(Math.floor(Date.now() / 1000)));
  params.set("user", JSON.stringify({ id: chatId, first_name: `User ${chatId}` }));
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(env.telegramBotToken).digest();
  params.set("hash", createHmac("sha256", secretKey).update(dataCheckString).digest("hex"));
  return params.toString();
}

function freshDb() {
  const db = openDb(":memory:");
  db.run("INSERT INTO allowlist (chat_id, is_admin) VALUES (?, 1)", [ADMIN_CHAT]);
  db.run("INSERT INTO allowlist (chat_id, is_admin) VALUES (?, 0)", [USER_A]);
  return db;
}

describe("POST /admin/users/grant-credits-all", () => {
  test("adds ten credits and history rows to every registered user", async () => {
    const db = freshDb();
    upsertUser(db, ADMIN_CHAT);
    upsertUser(db, USER_A);
    upsertUser(db, USER_B);
    db.query(`UPDATE users SET credits = 3 WHERE chat_id = ?`).run(USER_A);
    db.query(`UPDATE users SET credits = 7 WHERE chat_id = ?`).run(USER_B);

    const response = await createApiRoutes(db).request("/admin/users/grant-credits-all", {
      method: "POST",
      headers: { "X-Telegram-Init-Data": buildInitData(ADMIN_CHAT) },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ amount: 10, updatedUsers: 3 });
    expect(getUser(db, ADMIN_CHAT)?.credits).toBe(20);
    expect(getUser(db, USER_A)?.credits).toBe(13);
    expect(getUser(db, USER_B)?.credits).toBe(17);
    expect(getGrantHistoryForUser(db, USER_A)[0]).toMatchObject({ type: "credits", amount: 10, grantedBy: ADMIN_CHAT });
    expect(getGrantHistoryForUser(db, USER_B)[0]).toMatchObject({ type: "credits", amount: 10, grantedBy: ADMIN_CHAT });
  });

  test("rejects a non-admin without changing balances", async () => {
    const db = freshDb();
    upsertUser(db, USER_A);
    db.query(`UPDATE users SET credits = 4 WHERE chat_id = ?`).run(USER_A);

    const response = await createApiRoutes(db).request("/admin/users/grant-credits-all", {
      method: "POST",
      headers: { "X-Telegram-Init-Data": buildInitData(USER_A) },
    });

    expect(response.status).toBe(403);
    expect(getUser(db, USER_A)?.credits).toBe(4);
    expect(getGrantHistoryForUser(db, USER_A)).toHaveLength(0);
  });
});
