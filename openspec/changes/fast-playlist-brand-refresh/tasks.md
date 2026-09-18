# Tasks: fast-playlist-brand-refresh

## Спецификация и UI

- [x] Создать proposal, design, tasks и capability spec.
- [x] Убрать подпись `AI собирает плейлист`, не меняя подпись режима поиска.
- [x] Добавить точечный SVG-знак в шапку и обновить favicon.

## Скорость генерации

- [x] Снизить безопасный лимит агентских итераций с 12 до 4.
- [x] Проверить, что обычный путь поиска/финализации и fallback-тесты проходят.

## Проверка и поставка

- [x] Запустить `bun run typecheck`.
- [x] Запустить `bun test`.
- [x] Запустить `bun run build:miniapp`.
- [x] Обновить graft-граф после изменений.
- [ ] Создать функциональный Conventional Commit и отдельный commit с
  русскими release notes.
- [ ] Запустить `./deploy/deploy-test.sh` с итогового HEAD.
