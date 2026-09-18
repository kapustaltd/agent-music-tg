## Design direction

Ориентир для web-режима — плотная музыкальная рабочая область: постоянный левый rail, основной контент с реальными плейлистами/поиском и optional now-playing rail, когда загружен трек. Основное действие должно быть видно сразу; декоративные gradients и copy-only blocks не занимают самостоятельные колонки.

## Decisions

1. Header имеет только поиск, бренд и профиль. Баланс генераций находится внутри ProfileScreen; переключатель темы убирается из UI, текущая системная/сохранённая схема продолжает применяться.
2. Profile не является tabbar item. На profile/help экранe dock не подсвечивает другой раздел.
3. Screen transition оставляет только короткий opacity-вход нового экрана без outgoing-слоя, translate и ambient gradient layers, чтобы navigation не создавала вспышки и layout tearing.
4. Desktop prompt-context удаляется. Web density достигается реальными sections, шириной main surface и now-playing rail, а не декоративной орбитальной иллюстрацией.
5. FAQ остаётся содержательным; удаляются только заголовок и абзац, которые дублируют назначение двух явных action buttons.

## Verification

- `bun run typecheck`
- `bun test`
- `bun run build:miniapp`
- ручная проверка 390px и desktop fullscreen: header, tabbar, prompt, profile/help, transitions, player.
