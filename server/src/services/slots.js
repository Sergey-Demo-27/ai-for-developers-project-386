// Сетка слотов на окно записи (docs/spec.md, «Сетка слотов и окно записи»).
//
// Чистая функция: сегодняшняя дата, текущие минуты и занятые интервалы — на
// входе, дни со слотами — на выходе. Ни БД, ни часов внутри: и то, и другое
// передаёт обработчик. Длительность слота — константа `SLOT_MINUTES` (30 мин).

import {
  addDays,
  BOOKING_WINDOW_DAYS,
  SLOT_MINUTES,
  toTimeString,
  WORKDAY_END_MINUTES,
  WORKDAY_START_MINUTES,
} from '../lib/time.js';

/**
 * Начала слотов: арифметическая прогрессия от 09:00 с шагом в длительность
 * слота (`SLOT_MINUTES`); слот существует, только если целиком влезает до
 * 18:00 (неполный остаток справа слотом не является). Единственное определение
 * «реального слота» — им пользуются и сетка, и проверка брони
 * (`services/booking.js`).
 *
 * @returns {number[]} минуты от полуночи, по возрастанию
 */
export function slotStarts() {
  const starts = [];

  for (
    let start = WORKDAY_START_MINUTES;
    start + SLOT_MINUTES <= WORKDAY_END_MINUTES;
    start += SLOT_MINUTES
  ) {
    starts.push(start);
  }

  return starts;
}

/**
 * @param {object} input
 * @param {string} input.today сегодняшняя дата `YYYY-MM-DD`
 * @param {number} input.nowMinutes текущее время суток в минутах от полуночи
 * @param {Array<{date: string, startMinutes: number, durationMinutes: number}>} input.bookings
 *   занятые интервалы (сквозные по типам)
 * @returns {Array<{date: string, slots: Array<{start: string, end: string, available: boolean}>}>}
 */
export function buildSlotGrid({ today, nowMinutes, bookings }) {
  const days = [];

  for (let offset = 0; offset < BOOKING_WINDOW_DAYS; offset += 1) {
    const date = addDays(today, offset);
    const booked = bookings.filter((booking) => booking.date === date);
    const slots = [];

    for (const start of slotStarts()) {
      const end = start + SLOT_MINUTES;

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
