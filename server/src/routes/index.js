// Обработчики операций контракта, сгруппированные по `operationId`.
//
// Сгенерированный роутер (`src/generated/routes.js`) подставляет их в маршруты
// по имени операции; операции без обработчика отвечают `501 not_implemented`.
// Новые ресурсы добавляются сюда по мере реализации.

import { createBookingHandler, listBookingsHandler } from './bookings.js';
import { createEventTypeHandler, listEventTypesHandler } from './eventTypes.js';
import { listSlotsHandler } from './slots.js';

export const handlers = {
  EventTypes_list: listEventTypesHandler,
  EventTypes_create: createEventTypeHandler,
  EventTypeSlots_list: listSlotsHandler,
  Bookings_list: listBookingsHandler,
  Bookings_create: createBookingHandler,
};
