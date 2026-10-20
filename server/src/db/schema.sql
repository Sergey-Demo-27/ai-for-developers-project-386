-- Схема базы данных.
--
-- Файл применяется командой `npm run migrate`. Операторы идемпотентны
-- (`CREATE TABLE IF NOT EXISTS`), повторный запуск безопасен.

-- Типы событий — шаблоны, по которым нарезаются слоты (docs/spec.md).
-- Состав полей — ровно четыре: идентификатор, название, описание,
-- длительность в минутах. `id` генерирует система; длительность ограничена
-- рабочим днём, иначе тип не порождает ни одного слота.
CREATE TABLE IF NOT EXISTS event_types (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  description      TEXT    NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL
                   CHECK (duration_minutes > 0 AND duration_minutes <= 540)
);
