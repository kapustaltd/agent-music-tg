# Design: ci-deploy-failover

## Решение

`.github/workflows/ci.yml` вызывает `deploy/deploy-with-failover.sh`. Обёртка
запускает существующий deploy-скрипт с `timeout` на основной target и запускает
тот же commit на `FALLBACK_HOST` только если `timeout` вернул код `124`.
Ошибки проверки приложения, SSH-проверки и rollback возвращаются без fallback,
чтобы не замаскировать дефект релиза.

Основной target остаётся настраиваемым через `DEPLOY_HOST` и по умолчанию
`root@45.128.235.219`. Резервный target настраивается через
`DEPLOY_FALLBACK_HOST` и по умолчанию `litteraly@89.34.219.35`.

## Доступ non-root

Основной target сохраняет старый root-based deploy. Для резервного target
используются `deploy-reserve-test.sh` и `deploy-reserve-prod.sh`: SSH-пользователь
владеет `/opt/meatproxy-test` и `/opt/meatproxy-prod`, запускает
`/usr/local/bin/bun` без sudo, а sudo нужен только для restart systemd units.
Units, env-файлы и Nginx должны быть подготовлены оператором заранее.

## Ограничения

- GitHub Actions secret `DEPLOY_SSH_KEY` должен работать на обоих VPS.
- `DEPLOY_KNOWN_HOSTS` должен содержать pinned host keys обоих VPS.
- Запуск второго процесса с тем же Telegram bot token во время работы первого
  вызывает конфликт long polling. Резервный сервер должен оставаться passive,
  а переключение трафика и остановка primary должны быть отдельной
  инфраструктурной операцией.
- Cloudflare-маршрутизация не меняется этим diff и требует отдельной настройки
  tunnel ingress на Nginx-порты `8094`/`8095`/`8096`.

## Проверка

- `bash -n` для новых и изменённых shell-скриптов.
- `git diff --check`.
- YAML-проверка workflow доступным локальным валидатором или проверка GitHub
  Actions после push.
