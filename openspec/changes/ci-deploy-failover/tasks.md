# Tasks: ci-deploy-failover

## 1. Failover wrapper

- [x] 1.1 Добавить bounded primary attempt и fallback только на exit code 124.
- [x] 1.2 Передать отдельные SSH targets и sudo-режимы для primary/fallback.

## 2. Deploy compatibility

- [x] 2.1 Поддержать `REMOTE_SUDO` в production, test и dashboard deploy paths.
- [x] 2.2 Установить service units через временный файл с удалённым `install`,
      чтобы non-root SSH-пользователь не писал напрямую в `/etc`.
- [x] 2.3 Добавить restricted-user reserve deploy для `/opt/meatproxy-prod` и
      `/opt/meatproxy-test`, Bun `/usr/local/bin/bun`, systemd restart и
      Nginx/unit templates.
- [x] 2.4 Добавить безопасный root bootstrap, который устанавливает только
      проверенные templates после проверки env-файлов и не запускает ботов.

## 3. CI and documentation

- [x] 3.1 Подключить fallback wrapper к test и production jobs, сохранив ручной
      production gate.
- [x] 3.2 Описать GitHub variables/secrets и passive-server prerequisites.
- [x] 3.3 Выполнить shell/YAML/diff проверки и зафиксировать ограничения.

## Operational follow-up

- [ ] O1 На `89.34.219.35` создать два каталога, два units, два env-файла,
      Nginx и Cloudflare Tunnel ingress. Это намеренно выполняется оператором
      вне repository diff.
