// Репозиторий типов событий: доступ к таблице `event_types`.
//
// Соединение приходит снаружи (req.app.locals.db) — репозиторий не знает,
// откуда оно взялось, и остаётся проверяемым на in-memory базе.

/** @typedef {import('../generated/types.js').EventType} EventType */

// Колонки таблицы в порядке контракта — один список на оба запроса.
const COLUMNS = 'id, name, description';

// Строка таблицы (snake_case) → тип контракта (camelCase).
function toEventType(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
  };
}

// Все типы в порядке возрастания `id` — как требует контракт.
export function listEventTypes(db) {
  const rows = db
    .prepare(`SELECT ${COLUMNS} FROM event_types ORDER BY id`)
    .all();

  return rows.map(toEventType);
}

// Тип по `id` или `undefined`, если такого типа нет.
export function getEventTypeById(db, id) {
  const row = db
    .prepare(`SELECT ${COLUMNS} FROM event_types WHERE id = ?`)
    .get(id);

  return row ? toEventType(row) : undefined;
}

// Вставляет тип и возвращает созданную строку. `id` генерирует SQLite.
export function insertEventType(db, { name, description }) {
  const { lastInsertRowid } = db
    .prepare('INSERT INTO event_types (name, description) VALUES (?, ?)')
    .run(name, description);

  return getEventTypeById(db, lastInsertRowid);
}
