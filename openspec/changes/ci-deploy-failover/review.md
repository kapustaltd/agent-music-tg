# Проверка change: ci-deploy-failover

Дата: 2026-09-23. Основа: `511f7390bfbbc7aaf14e9bab594e704bc611e1a2`;
проверенные файлы: `.github/workflows/ci.yml`, `README.md`,
`deploy/deploy-with-failover.sh`, `deploy/remote.sh`,
`deploy/deploy.sh`, `deploy/deploy-test.sh`, `deploy/deploy-dash.sh`,
`deploy/deploy-reserve.sh`, reserve unit/Nginx templates,
`openspec/changes/ci-deploy-failover/`. Тип: самопроверка.

## Соответствие требованиям

| Требование / сценарий | Реализация (файл:строка) | Проверка и результат | Статус |
| --- | --- | --- | --- |
| Primary остаётся `45.128.235.219`, резерв — `litteraly@89.34.219.35` | `.github/workflows/ci.yml:90-93,145-148` | Значения вынесены в GitHub variables с указанными defaults | подтверждено |
| После bounded timeout попытаться деплоить на резерв | `deploy/deploy-with-failover.sh:37-64` | Shell syntax прошёл; ветка fallback использует только exit code `124` | код подтверждён; CI-run не выполнен |
| Ошибка приложения не маскируется fallback | `deploy/deploy-with-failover.sh:58-60` | Ненулевой код, отличный от `124`, завершается без второй попытки | подтверждено по коду |
| Restricted fallback деплоит в два user-owned каталога | `deploy/deploy-reserve.sh`, `.github/workflows/ci.yml` | Reserve scripts используют `/opt/meatproxy-prod|test`, `/usr/local/bin/bun` и отдельные fallback script names | код подтверждён; CI-run не выполнен |
| Reserve units/Nginx разделяют prod/test | `deploy/meatproxy-*.service`, `deploy/meatproxy-*.nginx` | Templates проверены shell/YAML/diff-проверками; `nginx -t` на VPS ещё не выполнен | код подтверждён; серверная установка O1 |
| Production gate остаётся ручным | `.github/workflows/ci.yml:132-136` | Условие `workflow_dispatch + deploy_production + main` сохранено | подтверждено |
| Cloudflare и активный Telegram failover настроены | вне текущего diff | DNS/Tunnel не менялись; резервный сервер не подготовлен | не выполнено, O1 |

## Находки

- **P1 · partial · O1.** Read-only SSH-проверка показала, что Bun уже доступен,
  но `/opt/meatproxy-prod`, `/opt/meatproxy-test` и соответствующие units ещё не
  созданы на момент проверки. Поэтому fallback остановится на pre-flight до
  серверной подготовки каталогов, env-файлов, units и Nginx.

- **P1 · partial · вне scope.** Cloudflare origins/tunnel и active/passive
  переключение не настроены. Два экземпляра с одним Telegram-токеном нельзя
  держать активными одновременно из-за long polling.

## Проверки

| Команда или ручной сценарий | Результат | Ограничение |
| --- | --- | --- |
| `bash -n` для всех изменённых deploy scripts | успех | не выполняет удалённый deploy |
| `git diff --check` | успех | — |
| Ruby YAML parse `.github/workflows/ci.yml` | успех | `actionlint` не установлен; GitHub Actions run ещё не выполнен |
| SSH read-only probe `litteraly@89.34.219.35` | SSH/Bun доступны; два target-каталога и units ещё отсутствуют | `.env` и production data не читались |
| `git status` / diff review | чужие `.commandcode/taste/` и `.ignore` не затронуты | изменения пока не отправлены в remote |

## Итог

Код и CI-конфигурация готовы, но итерация ждёт операционной подготовки
резервного VPS и Cloudflare-инфраструктуры. Открыт пункт O1.
Незапрошенные улучшения: нет.
