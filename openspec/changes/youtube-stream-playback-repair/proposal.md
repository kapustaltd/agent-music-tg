## Why

После предыдущего ускорения воспроизведения часть треков YouTube Music всё ещё падает на `/api/stream`: yt-dlp выбирает audio-only URL default web client, но YouTube CDN отвечает `403`. Сервер затем пробует fallback на SoundCloud, который для некоторых треков долго таймаутится, поэтому Mini App показывает «Не удалось воспроизвести».

## What Changes

- Для `ytm:` использовать Android player client yt-dlp.
- Сохранять приоритет audio-only progressive форматов.
- Если audio-only формат отсутствует, разрешать небольшой progressive MP4 fallback, пригодный для `<audio>`.
- Добавить regression-тесты выбора client и fallback format.

## Capabilities

### New Capabilities

- `youtube-stream-playback`: получение рабочего progressive URL для YouTube Music.

### Modified Capabilities

<!-- Публичный API и права доступа не меняются. -->

## Impact

- `server/audio/stream-resolver.ts` — YouTube client/format selection.
- `server/audio/stream-resolver.test.ts` — проверка аргументов yt-dlp.
- Mini App UI не меняется: после исправления сервер отдаёт playable stream.
