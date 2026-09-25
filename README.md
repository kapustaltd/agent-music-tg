# agent-music-tg

Telegram bot + Mini App that turns a mood/request into a real playlist via an AI agent. The interface is in Russian. Music comes from SoundCloud or YouTube Music (no account linking or OAuth required). Restricted to an allowlist of chat IDs; only admins can change the active AI provider / music backend.

- **Bot**: `@music_agentbot`, long-polling (no public webhook route). Telegram-интерфейс ограничен командами `/start` и admin-only `/stats`; `/start` открывает Mini App одной кнопкой.
- **Mini App**: https://miniapp.xdshka.party — Liquid Glass UI, prompt entry, results, admin-only settings.
- **Backend**: Bun + Hono (`server/`), `bun:sqlite` for allowlist/settings.

See `openspec/changes/telegram-miniapp-bot/` for the full proposal/design/specs/tasks behind this build.

## Run locally

```bash
bun install
cp .env.example .env   # fill in TELEGRAM_BOT_TOKEN, ALLOWLIST_CHAT_IDS, ADMIN_CHAT_IDS, at least one LLM key
bun run dev
```

Для проверки анимации подбора без Telegram-авторизации запустите `cd miniapp && bun run dev --host 127.0.0.1` и откройте `http://127.0.0.1:5173/?preview=loading`. Кнопки «Назад» и «Дальше» переключают фиктивные этапы; этот режим доступен только в dev-сборке.

## Telegram bot

`/start` регистрирует пользователя, сохраняет атрибуцию deep-link и отправляет
одно сообщение с кнопкой «Открыть приложение». Для ссылки на shared playlist
кнопка сразу открывает соответствующий экран Mini App. `/stats` доступна только
администраторам и возвращает статистику обычным текстом без клавиатуры.

Остальные команды, inline/group search, callback-меню и обработка обычного текста
в боте отключены. Пользовательские действия выполняются в Mini App. Служебные
апдейты Telegram Stars для покупок из Mini App сохраняются.

## Test

```bash
bun install --frozen-lockfile
(cd miniapp && bun install --frozen-lockfile)
(cd dashboard && bun install --frozen-lockfile)
bun run check         # server types, isolated tests, Mini App + dashboard builds
bun run test          # tests only (all test files, isolated module registries)
```

CI and local checks use Bun `1.3.14`. The quality gate stops on the first failure.
Both frontend builds include TypeScript checks. Successful CI runs retain separate
Mini App and dashboard artifacts for 7 days, named with the verified commit SHA.
Deploy jobs check out that same SHA even when a manually selected branch moves.
The existing external deployment scripts still rebuild bundles; the artifacts are
for inspection, not yet the deployment input. Verification jobs have a 20-minute
timeout. Deploy jobs have a 35-minute timeout: they allow up to 10 minutes on
the primary VPS and try the passive fallback only when that bounded attempt
times out.

See [the refactoring audit](docs/refactoring-audit.md) for the remaining technical debt.

## Работа coding-агентов

Общий процесс подключён через [AGENTS.md](AGENTS.md):
задача → OpenSpec/план → реализация → ревью → сверка
с требованиями → проверки → коммиты и push. Для небольших правок есть короткий путь.
[Регламент](docs/agents/workflow.md), [чек-лист ревью](docs/agents/review.md) и
[шаблон отчёта](docs/agents/review-template.md) хранятся в репозитории.
Это процесс разработки, не изменение AI-агента подбора музыки внутри бота.

## Deploy

Every push to `main` runs the checks in `.github/workflows/ci.yml` and, when
they pass, automatically deploys the separate test instance through the
bounded `deploy/deploy-with-failover.sh` wrapper. Pull requests run the checks but never deploy. The
workflow can also be started manually with `workflow_dispatch` and an optional
ref. Deploys are serialized so two releases cannot restart the test service at
the same time.

Configure these GitHub Actions values once:

- repository/environment variable `DEPLOY_HOST` (optional; defaults to
  `root@45.128.235.219`);
- repository/environment variable `DEPLOY_FALLBACK_HOST` (optional; defaults
  to `litteraly@89.34.219.35`);
- environment `test` secret `DEPLOY_SSH_KEY` — the private key for the
  dedicated Actions deploy key, installed on both SSH targets;
- environment `test` secret `DEPLOY_KNOWN_HOSTS` — pinned SSH host keys for
  both SSH targets;
- environment `test` secret `TEST_BOT_TOKEN` — the token used when the test
  `.env` is bootstrapped on the VPS.
- environment `production` secret `DEPLOY_SSH_KEY` — a separate private key
  for production promotion;
- environment `production` secret `DEPLOY_KNOWN_HOSTS` — pinned SSH host keys
  for both production SSH targets;
- environment `production` variable `DEPLOY_HOST` — the production SSH
  target. The environment has a required reviewer gate.

The fallback target is passive. Before enabling it, provision Bun at
`/usr/local/bin/bun`, `rsync`, the systemd units
`meatproxy-prod.service` and `meatproxy-test.service`, application directories,
separate `.env` files and the Cloudflare Tunnel/Nginx configuration. The
restricted SSH user only needs passwordless `sudo systemctl restart` for those
two units. The repository does not copy production secrets automatically.

The test workflow deploys to `/opt/agent-music-tg-test`, listens on port `8788`,
and serves the Mini App at `https://miniapp-dev.xdshka.party`. Production is
never deployed by a normal push. To promote the same `main` commit manually,
open **Actions → CI/CD → Run workflow**, keep `ref=main`, enable
`deploy_production`, and start the workflow. It will verify the commit, deploy
the test instance, then pause at the protected `production` environment for
approval before running the production deploy:

```bash
./deploy/deploy-test.sh             # test instance
./deploy/deploy-prod.sh             # production promotion after test review
./deploy/deploy.sh                  # standard local production deploy
./deploy/deploy.sh --dry-run        # dry-run (pre-flight only, no changes)
./deploy/deploy.sh --no-typecheck   # skip tsc type check
./deploy/deploy.sh --dirty          # allow from dirty tree or non-main branch
```

Builds the Mini App locally, rsyncs server code to `/opt/agent-music-tg` and the static build to `/srv/www/miniapp.xdshka.party` on the VPS, restarts the `agent-music-tg` systemd unit, and health-checks `/healthz`.

CI failover is implemented by `deploy/deploy-with-failover.sh`. It retries on
the fallback only for the explicit 10-minute attempt timeout and uses
`deploy/deploy-reserve-test.sh` or `deploy/deploy-reserve-prod.sh` there. A
failed health check, rollback or other non-timeout deployment error stops the
workflow.

The reserve layout is `/opt/meatproxy-prod` on port `8787` and
`/opt/meatproxy-test` on port `8788`. The service and Nginx templates are in
`deploy/meatproxy-*.service` and `deploy/meatproxy-*.nginx`. Production uses
`miniapp.xdshka.party`; test uses `miniapp-dev.xdshka.party`. The Platega
webhook template listens on the separate local Nginx port `8096` and forwards
only to production. After creating the secure env files, a root operator can
apply the checked-in templates with `sudo ./deploy/bootstrap-reserve.sh`; the
script does not start either Telegram bot.

Pre-flight checks run before any changes: git status, branch, `bun run typecheck`, SSH connectivity, and `.env` presence on the VPS. The release directory name includes the git commit SHA for traceability (e.g. `20250714-171509-a1b2c3d`).

If the health check fails, the script automatically rolls back to the previous release and restarts the service. On success, old releases beyond the 5 most recent are pruned. On success or failure, a Telegram notification is sent to the admin.

Infra on the VPS (already wired, only touch if changing ports/domains):
- `/etc/caddy/Caddyfile` — site block on `:8094` (see `deploy/miniapp.caddy`), reverse-proxying `/api/*` to `127.0.0.1:8787` and serving the Mini App static build for everything else.
- `/etc/cloudflared/config.yml` — ingress rule routing `miniapp.xdshka.party` to `localhost:8094` (this box has no direct A record; Cloudflare Tunnel handles public routing and TLS termination for every hostname on it).
- `/opt/agent-music-tg/.env` — secrets, not in git. `/opt/agent-music-tg/data/app.sqlite` — allowlist, active provider/backend settings.

Cloudflare DNS/Load Balancer and Tunnel routing are not changed by the CI
fallback. HTTP domains can use the two servers as origins only after the
passive server has matching Caddy/Tunnel configuration. The Telegram bot uses
long polling, so the same bot token must not be actively polled by both servers
at once; switching the active server is a separate infrastructure operation.

### Rollback

Every deploy lands in a `releases/<ts>-<sha>` dir under both `/opt/agent-music-tg` and `/srv/www/miniapp.xdshka.party`, with `current` symlinked to the latest. Automatic rollback happens on health check failure. To manually roll back:

```bash
ssh root@YOUR_VPS_IP
ls /opt/agent-music-tg/releases          # pick the previous release
ln -sfn /opt/agent-music-tg/releases/<previous> /opt/agent-music-tg/current
ln -sfn /srv/www/miniapp.xdshka.party/releases/<previous> /srv/www/miniapp.xdshka.party/current
systemctl restart agent-music-tg
curl -fsS http://127.0.0.1:8787/healthz
```

## Audio downloads & in-app playback

Playlist results can be downloaded as audio: the Mini App's «Скачать» button queues a server-side job that resolves a progressive audio stream with **yt-dlp** and pipes it straight into Telegram, overlapping the upstream download with the Bot API upload instead of first waiting for a complete temporary file. If streaming is unavailable or Telegram rejects it, the existing **yt-dlp** (+ **ffmpeg**) file extraction path takes over automatically (`deploy.sh` installs/updates both tools on the VPS). Uploaded tracks are cached by Telegram `file_id` (`audio_cache` table), so repeats never re-extract or re-upload. Download history lives in the profile's «Загрузки» tab with re-send and delete. Tracks also play inline in the Mini App via `GET /api/stream/:uri` (Range-supporting, initData-authenticated via query param).

The fast streaming path uses the catalog duration because bytes are never written as a complete local file. The file fallback measures the produced audio with **ffprobe**, and that measured value wins whenever available. Either value is cached with the `file_id`, so re-sends carry it too. SoundCloud results that are preview-only (`policy: SNIP`) or have no playable transcoding (`policy: BLOCK`) are dropped at search time rather than surfaced as songs.

The Mini App also preloads one likely first/next track in a browser `Audio` element and adopts that element on tap. This overlaps DNS/TLS, stream resolution, and the first audio buffer with the time the user is looking at the result, while keeping only one speculative track and avoiding a server-side MP3 memory cache.

Endpoints (all under initData auth): `POST /api/download`, `GET /api/downloads`, `POST /api/downloads/:id/resend`, `DELETE /api/downloads/:id`, `GET /api/stream/:uri`.

Config (`.env`): `AUDIO_SCRATCH_DIR` (temporary files for chat downloads, deleted after upload).

## Sharing playlists

Any generation result or saved playlist can be published as a link («Поделиться»). Publishing snapshots the tracklist, so editing or deleting the source never changes a link already in circulation, and publishing the same source twice returns the same link. Recipients open it in Telegram, see the tracklist with the author and the original prompt, play it in the Mini App, and can save it to their own playlists or generate their own.

Links take the form `https://t.me/<bot>?start=pl_<token>`. Set the optional `TELEGRAM_MINIAPP_NAME` (the Mini App short name from BotFather) to have them open the Mini App directly as `https://t.me/<bot>/<name>?startapp=pl_<token>` instead.

Arrivals are attributed to `share / telegram / shared-playlist` in admin statistics and credit the author through the existing referral reward, with the same per-invitee dedupe and cap. `GET /api/shares/:token` is the one route that serves callers who are not on the allowlist — that is what lets a link work for someone who is not a user yet; publishing, listing, and revoking stay behind the normal gate. Authors can revoke a link at any time (it then answers 410) and see its view count.

Endpoints: `POST /api/shares`, `GET /api/shares`, `GET /api/shares/:token`, `DELETE /api/shares/:token`.

## Telegram search in chats

Group keyword search and inline search are disabled. Search and track selection are
available from the Mini App; `AUDIO_STORAGE_CHAT_ID` remains a server-side option
for Mini App search cache warming.

## Payments (CryptoBot)

Playlist generation is paywalled: a user needs either generation credits or an active subscription, both sold as offers paid through [Crypto Pay](https://help.crypt.bot/crypto-pay-api) (@CryptoBot). Payment confirmation comes from a signed webhook at `POST /api/crypto/webhook`, with a polling fallback (`getInvoices`) that fulfills invoices if a webhook is missed. Fulfillment is idempotent per invoice — duplicate webhook + poll events grant exactly once.

### Setup

1. Create a Crypto Pay app: message @CryptoBot (or @CryptoTestnetBot for testnet) → Crypto Pay → Create App, copy the API token.
2. Set env vars in `.env` (see `.env.example`):
   - `CRYPTOBOT_TOKEN` — the Crypto Pay app token (required when payments are on).
   - `CRYPTOBOT_NETWORK` — `mainnet` (default) or `testnet`.
   - `PAYMENTS_ENABLED` — `true` by default.
3. In the Crypto Pay app settings, set the webhook URL to `https://miniapp.xdshka.party/api/crypto/webhook` (`PUBLIC_ORIGIN` + `/api/crypto/webhook`). The route is mounted before auth and verifies the `crypto-pay-api-signature` header (HMAC-SHA256 of the raw body keyed by SHA256 of the token); unsigned or mis-signed requests are rejected.
4. Create offers via the admin panel (below) — each offer grants either N generation credits or M days of subscription. Subscription users generate without spending credits; credit users spend one credit per *successful* generation (failed runs and clarification rounds are free).

Users buy and check balance/history in the «Магазин» and «Профиль» tabs Mini App.

### Payments via Platega (СБП)

Set `PLATEGA_MERCHANT_ID` and `PLATEGA_SECRET` from the Platega dashboard. The callback URL is `https://miniapp.xdshka.party/api/platega/webhook`; Platega authenticates callbacks with the `X-MerchantId` and `X-Secret` headers, so a `401 invalid signature` means the credentials in the running server environment do not match the merchant/API key configured in Platega. Keep callback verification enabled. After a successful or failed payment, Platega opens `PLATEGA_RETURN_URL`, which defaults to `https://t.me/music_agentbot` so the user returns to the bot instead of an environment-specific Mini App URL.

### Admin panel

Admins (`ADMIN_CHAT_IDS` or allowlist admin flag) get:

- **Bot**: `/stats` — all-time statistics without an inline menu.
- **Mini App**: «Админ» tab with the same stats/offers/broadcast/shop-settings, plus «Настройки» for the AI provider / music backend.

### Traffic attribution and funnel analytics

Admin statistics also show first-touch traffic sources, UTM campaigns, cohort conversion, and the unique-user funnel from acquisition through playlist generation and payment. Existing users from before this feature are labeled `unknown / legacy`; reconstructable historical generation, checkout, and purchase events are backfilled automatically.

Telegram deep links carry attribution in the start payload:

```text
https://t.me/<bot>?start=utm_<source>__<medium>__<campaign>__[content]__[term]
https://t.me/<bot>/<mini-app>?startapp=utm_<source>__<medium>__<campaign>__[content]__[term]
```

Example: `utm_vk__cpc__summer-2026__banner-a`. Use URL-safe slugs (`A-Z`, `a-z`, `0-9`, `_`, `-`) and keep the complete payload within Telegram's 64-character limit. A source-only link can use `src_youtube`. Referral payloads (`ref_<chatId>`) remain supported and are attributed as `referral / telegram`.

### Rollback / kill switch

Set `PAYMENTS_ENABLED=false` in `/opt/agent-music-tg/.env` and restart the unit: the paywall is bypassed (everyone generates for free, no credits consumed). Tables (`users`, `offers`, `invoices`) stay in place, harmless. Full removal = revert the deploy (see Rollback above).

### Known follow-ups

- Default backend is `youtube-music`; `soundcloud` is also available. Neither needs credentials — no per-user account linking or OAuth.
- The bot token was shared in plaintext during setup — rotate it via @BotFather when convenient, then update `TELEGRAM_BOT_TOKEN` in `/opt/agent-music-tg/.env` and restart.

### Иерархия Mini App

Mini App использует локальный Roboto с кириллицей и латиницей и точечные
Material Icons. Правила поверхностей, состояний и responsive-композиции —
в [DESIGN.md](DESIGN.md). В процессе генерации SSE может присылать первые
найденные треки в необязательном `progress.tracks`; это кандидаты, итоговый
плейлист по-прежнему приходит в `outcome`. Сырые ответы модели не публикуются.
Продление плейлиста считается успешным только если найден хотя бы один новый
трек: при пустом результате список, счётчик бесплатных продлений и баланс не
меняются. В разделе «Музыка» сбой загрузки отличается от пустой библиотеки и
позволяет повторить запрос.

Используйте `bun run test` (запускает `bun test --isolate`): существующие
`mock.module` в разных тестовых файлах изменяют одни и те же модули.
Изоляция всех файлов предотвращает зависимость результата от порядка запуска.
