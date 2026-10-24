// Смысловые правила тела `POST /api/bookings`, которые схема контракта не
// выражает (docs/spec.md, «Валидация»): окно записи, реальность слота,
// непустое после trim имя и формат email.
//
// Типы, обязательность, длины и формат `date`/`start` проверяет схема — здесь
// они не дублируются. Функция чистая: «сегодня» и текущие минуты приходят
// снаружи, как и у сетки слотов (`services/slots.js`).

import {
  addDays,
  BOOKING_WINDOW_DAYS,
  parseTimeToMinutes,
} from '../lib/time.js';
import { slotStarts } from './slots.js';

// Базовая проверка формата из спеки: «что-то@что-то.что-то» без пробелов.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Проверяет тело брони поверх схемы контракта. Возвращает нарушения по всем
 * полям разом (не «первое по очереди») и разобранное начало слота.
 *
 * @param {object} input
 * @param {string} input.date дата `YYYY-MM-DD`
 * @param {string} input.start начало слота `HH:MM`
 * @param {string} input.guestName имя гостя
 * @param {string} input.guestEmail email гостя
 * @param {string} input.today сегодняшняя дата `YYYY-MM-DD`
 * @param {number} input.nowMinutes текущее время суток в минутах
 * @returns {{details: Array<{field: string, message: string}>, startMinutes: number}}
 */
export function validateBooking({
  date,
  start,
  guestName,
  guestEmail,
  today,
  nowMinutes,
}) {
  const details = [];
  const startMinutes = parseTimeToMinutes(start);

  const lastDate = addDays(today, BOOKING_WINDOW_DAYS - 1);
  if (date < today || date > lastDate) {
    details.push({ field: 'date', message: 'Дата вне окна записи' });
  }

  // Слот существует, только если его начало лежит на сетке типа
  // (`services/slots.js` — единственное определение реального слота).
  if (!slotStarts().includes(startMinutes)) {
    details.push({
      field: 'start',
      message: 'Время не совпадает со слотом типа события',
    });
  } else if (date === today && startMinutes <= nowMinutes) {
    details.push({ field: 'start', message: 'Это время уже прошло' });
  }

  if (guestName.trim() === '') {
    details.push({ field: 'guestName', message: 'Поле не может быть пустым' });
  }

  if (!EMAIL_PATTERN.test(guestEmail)) {
    details.push({ field: 'guestEmail', message: 'Укажите корректный email' });
  }

  return { details, startMinutes };
}
