// Репозиторий броней: доступ к таблице `bookings`.
//
// Соединение приходит снаружи (req.app.locals.db). Пока только чтение
// занятости: сетка слотов смотрит, какие интервалы уже заняты в окне записи.
// Создание брони появится отдельным тикетом.

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
