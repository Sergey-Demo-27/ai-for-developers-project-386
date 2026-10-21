// Репозиторий броней: доступ к таблице `bookings`.
//
// Соединение приходит снаружи (req.app.locals.db). Занятость читает сетка
// слотов (`listBookingsInRange`), создание брони живёт рядом со стражем
// занятости (docs/spec.md, «Правило занятости»).

import { toTimeString } from '../lib/time.js';

/** @typedef {import('../generated/types.js').Booking} Booking */

// Колонки таблицы в порядке контракта.
const COLUMNS =
  'id, event_type_id, date, start_minutes, duration_minutes, guest_name, guest_email, created_at';

// Занятые интервалы в диапазоне дат `[fromDate, toDate]` включительно.
// Даты — строки `YYYY-MM-DD`, поэтому сравнение лексикографическое (ADR 0002).
export function listBookingsInRange(db, { fromDate, toDate }) {
  const rows = db
    .prepare(
      `SELECT date, start_minutes, duration_minutes
         FROM bookings
        WHERE date >= ? AND date <= ?`,
    )
    .all(fromDate, toDate);

  return rows.map((row) => ({
    date: row.date,
    startMinutes: row.start_minutes,
    durationMinutes: row.duration_minutes,
  }));
}

// Строка таблицы (snake_case) → бронь контракта (camelCase). `end` вычисляется
// из `start` и снимка длительности брони.
function toBooking(row) {
  return {
    id: row.id,
    eventTypeId: row.event_type_id,
    date: row.date,
    start: toTimeString(row.start_minutes),
    end: toTimeString(row.start_minutes + row.duration_minutes),
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    createdAt: row.created_at,
  };
}

// Предстоящие брони: только те, чей слот ещё не начался (GLOSSARY.md,
// «Предстоящая бронь») — дата позже сегодняшней либо сегодняшняя с началом
// строго в будущем. Порядок — по возрастанию даты, затем начала. Имя типа
// приходит join'ом, длительность — из снимка брони.
//
// @returns {Array<import('../generated/types.js').BookingListItem>}
export function listUpcomingBookings(db, { today, nowMinutes }) {
  const rows = db
    .prepare(
      `SELECT b.id, b.date, b.start_minutes, b.duration_minutes,
              b.guest_name, b.guest_email, b.created_at,
              e.name AS event_type_name
         FROM bookings AS b
         JOIN event_types AS e ON e.id = b.event_type_id
        WHERE b.date > ?
           OR (b.date = ? AND b.start_minutes > ?)
        ORDER BY b.date, b.start_minutes, b.id`,
    )
    .all(today, today, nowMinutes);

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    start: toTimeString(row.start_minutes),
    end: toTimeString(row.start_minutes + row.duration_minutes),
    eventTypeName: row.event_type_name,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    createdAt: row.created_at,
  }));
}

// Бронь по `id` или `undefined`, если такой брони нет.
function getBookingById(db, id) {
  const row = db
    .prepare(`SELECT ${COLUMNS} FROM bookings WHERE id = ?`)
    .get(id);

  return row ? toBooking(row) : undefined;
}

/**
 * Создаёт бронь, если её интервал не пересекается ни с одной существующей
 * (занятость сквозная по типам). Проверка и вставка живут в одной транзакции
 * `BEGIN IMMEDIATE`; между `SELECT` пересечения и `INSERT` нет `await`, поэтому
 * `node:sqlite` синхронно исключает гонку (docs/spec.md, «Правило занятости»).
 *
 * @returns {Booking | undefined} созданная бронь или `undefined`, если слот занят
 */
export function insertBooking(
  db,
  { eventTypeId, date, startMinutes, durationMinutes, guestName, guestEmail },
) {
  db.exec('BEGIN IMMEDIATE');

  let id;

  try {
    // Пересечение полуоткрытых интервалов `[start, start + duration)`;
    // касание (existing.start = new end) конфликтом не считается.
    const conflict = db
      .prepare(
        `SELECT 1
           FROM bookings
          WHERE date = ?
            AND start_minutes < ?
            AND start_minutes + duration_minutes > ?
          LIMIT 1`,
      )
      .get(date, startMinutes + durationMinutes, startMinutes);

    if (conflict) {
      db.exec('ROLLBACK');
      return undefined;
    }

    ({ lastInsertRowid: id } = db
      .prepare(
        `INSERT INTO bookings
           (event_type_id, date, start_minutes, duration_minutes, guest_name, guest_email)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(eventTypeId, date, startMinutes, durationMinutes, guestName, guestEmail));

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return getBookingById(db, id);
}
