## Context

Проверка на test VPS показала: для проблемного `ytm:` URI default resolve возвращает format 140, а запрос signed URL завершается `403`. Тот же ролик через `youtube:player_client=android` отдаёт progressive format 18 с HTTP `200`.

## Decisions

1. **Android client только для YouTube Music URI.** SoundCloud не получает YouTube-specific extractor args. Это ограничивает изменение тем источником, где воспроизведение ломается.
2. **Форматный порядок.** Сначала остаются `m4a/mp3` audio-only progressive форматы; затем выбирается `mp4` до 360p; последний fallback — любой progressive HTTP формат. MP4 содержит audio track и воспроизводится через HTML audio element, но ограничение 360p не позволяет случайно выбрать тяжёлый видеопоток.
3. **Fallback на сервере до cross-platform search.** Рабочий YouTube progressive URL предотвращает дорогостоящий и ненадёжный SoundCloud fallback для обычных треков.

## Risks / Trade-offs

- Некоторые YouTube ролики могут быть доступны только как MP4 с видеопотоком; такой fallback увеличивает трафик, но ограничен 360p и необходим для работоспособности.
- Android client может иметь собственные ограничения для age/geo-restricted видео; существующий server-side alternate source остаётся последним fallback.
