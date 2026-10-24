// Обработчики ресурса «Брони».
//
// Маршрут и валидация тела приходят из сгенерированного роутера
// (`src/generated/routes.js`): к моменту вызова тело уже проверено по схеме
// контракта. Здесь остаются смысловые правила, которые схема не выражает
// (существование типа, окно записи, реальность слота, trim имени, занятость),
// — они собраны в `services/booking.js` и репозитории.

import HttpError from '../lib/httpError.js';
import { SLOT_MINUTES, toDateString, toMinutesOfDay } from '../lib/time.js';
import {
  insertBooking,
  listUpcomingBookings,
} from '../repositories/bookings.js';
import { getEventTypeById } from '../repositories/eventTypes.js';
import { validateBooking } from '../services/booking.js';

// GET /api/bookings — предстоящие брони владельца, отвечает `200 { bookings }`.
// Порядок и отбор будущего — в репозитории; «сегодня» и текущее время приходят
// из инъекции часов приложения.
export function listBookingsHandler(req, res) {
  const now = req.app.locals.now();

  res.json({
    bookings: listUpcomingBookings(req.app.locals.db, {
      today: toDateString(now),
      nowMinutes: toMinutesOfDay(now),
    }),
  });
}

// POST /api/bookings — создаёт бронь, отвечает `201 { booking }`.
export function createBookingHandler(req, res) {
  const { eventTypeId, date, start, guestName, guestEmail } = req.body;

  const eventType = getEventTypeById(req.app.locals.db, eventTypeId);

  if (!eventType) {
    throw new HttpError(404, 'Тип события не найден', {
      code: 'event_type_not_found',
    });
  }

  const now = req.app.locals.now();

  const { details, startMinutes } = validateBooking({
    date,
    start,
    guestName,
    guestEmail,
    today: toDateString(now),
    nowMinutes: toMinutesOfDay(now),
  });

  if (details.length > 0) {
    throw new HttpError(400, 'Некорректные данные запроса', {
      code: 'validation_error',
      details,
    });
  }

  const booking = insertBooking(req.app.locals.db, {
    eventTypeId,
    date,
    startMinutes,
    durationMinutes: SLOT_MINUTES,
    guestName: guestName.trim(),
    guestEmail,
  });

  if (!booking) {
    throw new HttpError(409, 'Это время уже занято, выберите другой слот', {
      code: 'slot_taken',
    });
  }

  res.status(201).json({ booking });
}
