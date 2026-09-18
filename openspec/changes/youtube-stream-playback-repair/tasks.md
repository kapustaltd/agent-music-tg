## 1. Resolver repair

- [x] 1.1 Использовать `youtube:player_client=android` только для `ytm:` URI.
- [x] 1.2 Добавить progressive MP4 fallback до 360p после audio-only форматов.
- [x] 1.3 Сохранить прежний SoundCloud resolver path.

## 2. Verification

- [x] 2.1 Добавить regression-проверки extractor args и fallback format.
- [x] 2.2 Прогнать `bun run typecheck`, полный `bun test` и `bun run build:miniapp`.
- [ ] 2.3 Выполнить `deploy/deploy-test.sh` и проверить `/healthz`.
- [ ] 2.4 Запушить исправление в `origin/main`.
