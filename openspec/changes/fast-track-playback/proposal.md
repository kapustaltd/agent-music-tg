## Why

При нажатии на трек первый звук иногда появляется с заметной задержкой или не появляется вовсе. На холодном старте stream-resolver каждый раз запускает `yt-dlp` без общего cache-dir, а при быстрой смене трека старое событие ошибки одного HTMLAudioElement может запустить retry уже для нового источника.

## What Changes

- Переиспользовать общий yt-dlp cache для streaming и download-пути, чтобы не повторять решение YouTube player state.
- Сделать запуск трека устойчивым к stale `error`/`play()` событиям от предыдущего `src`.
- Сократить паузу transient retry до минимальной безопасной задержки.
- Разрешить аудиоэлементу начинать буферизацию сразу после назначения источника.

## Capabilities

### New Capabilities

- `fast-track-playback`: быстрый и безопасный старт браузерного воспроизведения.

### Modified Capabilities

<!-- Поведение публичного API не меняется. -->

## Impact

- `server/audio/extractor.ts`, `server/audio/stream-resolver.ts` — общие параметры и cache yt-dlp.
- `miniapp/src/lib/player.tsx` — защита playback attempts от устаревших событий и быстрый retry.
- Тесты stream-resolver — проверка cache-dir и timeout параметров.
