// Обработчики ресурса «Слоты»: сетка окна записи для типа события.
//
// Маршрут приходит из сгенерированного роутера (`src/generated/routes.js`);
// здесь остаётся смысловая часть — найти тип, взять занятость и построить сетку.

import HttpError from '../lib/httpError.js';
import {
  addDays,
  BOOKING_WINDOW_DAYS,
  toDateString,
  toMinutesOfDay,
} from '../lib/time.js';
import { listBookingsInRange } from '../repositories/bookings.js';
import { getEventTypeById } from '../repositories/eventTypes.js';
import { buildSlotGrid } from '../services/slots.js';

// GET /api/event-types/:id/slots — вся сетка окна записи одним ответом.
export function listSlotsHandler(req, res) {
  const { id } = req.params;

  // `:id` смоделирован строкой: нецелое значение даёт `404`, а не `400`.
  // Проверка строгая, по цифрам: `Number()` пропустил бы «1.0», «1e0», «0x10».
  const eventType = /^\d+$/.test(id)
    ? getEventTypeById(req.app.locals.db, Number(id))
    : undefined;

  if (!eventType) {
    throw new HttpError(404, 'Тип события не найден', {
      code: 'event_type_not_found',
    });
  }

  const now = req.app.locals.now();
  const today = toDateString(now);

  const bookings = listBookingsInRange(req.app.locals.db, {
    fromDate: today,
    toDate: addDays(today, BOOKING_WINDOW_DAYS - 1),
  });

  res.json({
    days: buildSlotGrid({
      today,
      nowMinutes: toMinutesOfDay(now),
      bookings,
    }),
  });
}
