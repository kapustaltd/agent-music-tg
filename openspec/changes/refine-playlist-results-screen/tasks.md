# Tasks: refine-playlist-results-screen

## 1. OpenSpec and baseline

- [x] 1.1 Зафиксировать proposal, design, requirements и список задач для
      экрана результата плейлиста.
- [x] 1.2 Проверить текущий effective cascade для ResultsScreen, fixed dock и
      player reserve на мобильной ширине.

## 2. ResultsScreen actions

- [x] 2.1 Добавить `Слушать` как primary action с `Play`/`Pause`, используя
      очередь доступных треков и существующий `player.toggle`.
- [x] 2.2 Перевести скачивание в компактное вторичное действие; сохранить
      состояния idle/sending/sent/error без скачка размеров.
- [x] 2.3 Обновить доступные подписи на `Скачать N треков в чат` и
      `Сохранить в медиатеку` / `Убрать из медиатеки`.
- [x] 2.4 Сделать сохранение и шаринг визуально вторичными, сохранив touch
      target и focus-visible.
- [x] 2.5 Обернуть название в отдельный текстовый элемент для предсказуемого
      переноса рядом с кнопкой переименования.

## 3. Results layout and chrome

- [x] 3.1 Сжать мобильный header до горизонтальной группы с обложкой 80–88px и
      уменьшенным заголовком без clipping длинных названий.
- [x] 3.2 Уменьшить вертикальный ритм header → actions → tracklist и оставить
      первый трек видимым в коротком viewport.
- [x] 3.3 Добавить нижний safe-area reserve для последнего трека над dock и
      mini-player; не вставлять пустой reserve между списком и extend-секцией.
- [x] 3.4 Проверить responsive action bar на 320px, 360px, 480px и desktop.

## 4. Admin navigation

- [x] 4.1 Убрать admin tab из `BottomNav` и из публичного списка пользовательских
      tabs.
- [x] 4.2 Добавить admin entry в `ProfileScreen` только для `me.isAdmin` и
      подключить переход из `App.tsx`.
- [x] 4.3 Проверить, что обычный пользователь не видит admin entry и что admin
      по-прежнему открывает существующий экран.

## 5. Verification

- [x] 5.1 Запустить `bun run typecheck`.
- [x] 5.2 Запустить `bun run build:miniapp`.
- [x] 5.3 Запустить `bun test` как проверку отсутствия регрессий shared/server
      логики.
- [ ] 5.4 Провести ручную проверку light/dark, длинного названия, idle/sending/
      sent/error, проигрывания, сохранения, шаринга и нижней прокрутки.
- [ ] 5.5 Отметить выполненные пункты и сохранить русский release note после
      функционального коммита.
