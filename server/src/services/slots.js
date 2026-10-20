// Сетка слотов типа события на окно записи
// (docs/spec.md, «Сетка слотов и окно записи»).
//
// Чистая функция: длительность типа, сегодняшняя дата, текущие минуты и
// занятые интервалы — на входе, дни со слотами — на выходе. Ни БД, ни часов
// внутри: и то, и другое передаёт обработчик.

import {
  addDays,
  BOOKING_WINDOW_DAYS,
  toTimeString,
  WORKDAY_END_MINUTES,
  WORKDAY_START_MINUTES,
} from '../lib/time.js';

/**
 * @param {object} input
 * @param {number} input.durationMinutes длительность типа — шаг сетки
 * @param {string} input.today сегодняшняя дата `YYYY-MM-DD`
 * @param {number} input.nowMinutes текущее время суток в минутах от полуночи
 * @param {Array<{date: string, startMinutes: number, durationMinutes: number}>} input.bookings
 *   занятые интервалы (сквозные по типам)
 * @returns {Array<{date: string, slots: Array<{start: string, end: string, available: boolean}>}>}
 */
export function buildSlotGrid({
  durationMinutes,
  today,
  nowMinutes,
  bookings,
}) {
  const days = [];

  for (let offset = 0; offset < BOOKING_WINDOW_DAYS; offset += 1) {
    const date = addDays(today, offset);
    const booked = bookings.filter((booking) => booking.date === date);
    const slots = [];

    // Слот существует, только если целиком влезает до конца рабочего дня:
    // неполный остаток у правого края слотом не является.
    for (
      let start = WORKDAY_START_MINUTES;
      start + durationMinutes <= WORKDAY_END_MINUTES;
      start += durationMinutes
    ) {
      const end = start + durationMinutes;

      // Сегодня доступны только слоты, начинающиеся строго позже текущего
      // момента; идущий слот недоступен.
      const isPast = offset === 0 && start <= nowMinutes;

      // Пересечение полуоткрытых интервалов `[start, end)`; касание — не
      // пересечение (09:00–09:30 и 09:30–10:00 сосуществуют).
      const isBooked = booked.some(
        (booking) =>
          booking.startMinutes < end &&
          booking.startMinutes + booking.durationMinutes > start,
      );

      slots.push({
        start: toTimeString(start),
        end: toTimeString(end),
        available: !isPast && !isBooked,
      });
    }

    days.push({ date, slots });
  }

  return days;
}
