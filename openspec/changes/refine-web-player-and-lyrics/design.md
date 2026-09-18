## Design direction

Desktop Mini App состоит из трёх постоянных зон: `sidebar | main content | player`. При ширине `>=1200px` player занимает правую колонку и нижний mini-player скрывается. В диапазоне `840–1199px` правой колонки нет, поэтому остаётся нижний mini-player с резервом места в layout. Оба компактных представления открывают один и тот же full-player modal.

### Playlist

`ResultsScreen` становится одной content-led колонкой. Header плейлиста содержит cover mosaic, kicker, название 28–32px, count и actions. Composer «Добавить треки» находится после header перед tracklist. Очередь не дублируется в плейлисте: она живёт в desktop Now Playing/full-player.

### Player modal

Full-player остаётся modal поверх текущего экрана: затемнение мягкое, panel имеет тонкую границу и глубокую тень, а левый control закрывает окно крестиком. Desktop-композиция сохраняет cover слева и information/controls справа; правый cluster выровнен ближе к верхней трети artwork. Transport, reactions/lyrics и volume имеют отдельные группы и не конкурируют между собой.

### Lyrics

Lyrics получают sticky context header (`название`, `артист · Текст песни`) и почти непрозрачную surface. Синхронизированные строки получают классы `is-past`, `active`, `is-next`; активная строка — самый заметный текст с аккуратным accent, прошлые строки приглушены, будущие остаются читаемыми. Auto-scroll удерживает активную строку примерно на 35% высоты scroll viewport. Верхний и нижний fade сохраняют cue прокрутки.

### Typography

`Super Grotesk` используется первым в `--font-display` и `--font-body`; `Space Grotesk` подключается как web fallback, если лицензированный Super Grotesk не установлен в окружении. Type scale остаётся token-based, а playlist title понижается до display-tier 28px.

## Verification

- `bun run typecheck`
- `bun test`
- `bun run build:miniapp`
- Проверка responsive CSS для `840px`, `1199px`, `1200px` и mobile; keyboard/Escape закрытие modal; lyrics context и active state.
