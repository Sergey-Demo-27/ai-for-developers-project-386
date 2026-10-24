-- Схема базы данных.
--
-- Файл применяется командой `npm run migrate`. Операторы идемпотентны
-- (`CREATE TABLE IF NOT EXISTS`), повторный запуск безопасен.

-- Типы событий — шаблоны, по которым нарезаются слоты (docs/spec.md).
-- Состав полей — ровно три: идентификатор, название, описание. Длительность
-- слота — константа 30 минут (`SLOT_MINUTES`), отдельного поля у типа нет.
CREATE TABLE IF NOT EXISTS event_types (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  description      TEXT    NOT NULL DEFAULT ''
);

-- Брони — записи гостей на конкретный слот. Время хранится как локальное
-- настенное (ADR 0002): `date` (`YYYY-MM-DD`) + `start_minutes` (минуты от
-- полуночи) + длина слота `duration_minutes` (константа `SLOT_MINUTES`).
-- Занятость считается по этой таблице и сквозная по типам; отдельной таблицы
-- или индекса занятости нет — пересечение интервалов `UNIQUE` не выражает.
CREATE TABLE IF NOT EXISTS bookings (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type_id    INTEGER NOT NULL REFERENCES event_types(id),
  date             TEXT    NOT NULL,
  start_minutes    INTEGER NOT NULL
                   CHECK (start_minutes >= 0 AND start_minutes < 1440),
  duration_minutes INTEGER NOT NULL
                   CHECK (duration_minutes > 0 AND duration_minutes <= 540),
  guest_name       TEXT    NOT NULL,
  guest_email      TEXT    NOT NULL,
  created_at       TEXT    NOT NULL
                   DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
