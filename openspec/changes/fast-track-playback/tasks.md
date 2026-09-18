## 1. yt-dlp stream cold path

- [x] 1.1 Вынести общий `--cache-dir`, `--socket-timeout` и базовые yt-dlp аргументы в extractor.
- [x] 1.2 Подключить общий набор аргументов в stream-resolver без изменения выбора progressive формата.
- [x] 1.3 Добавить regression-проверки аргументов stream-resolver.

## 2. Browser playback reliability

- [x] 2.1 Изолировать новый источник отдельным `HTMLAudioElement` и инвалидировать предыдущий playback attempt.
- [x] 2.2 Игнорировать stale `error` и rejected `play()` от старого элемента/`src`.
- [x] 2.3 Сократить retry delay до 100 мс при сохранении bounded retry count.
- [x] 2.4 Включить немедленную буферизацию после назначения источника.

## 3. Verification

- [x] 3.1 Прогнать изменённые server и Mini App тесты.
- [x] 3.2 Прогнать `bun run typecheck` и `bun run build:miniapp`.
- [ ] 3.3 Проверить test instance через `deploy/deploy-test.sh`.
