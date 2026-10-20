// Сгенерировано scripts/generate-api.mjs из api/openapi/openapi.yaml.
// Не редактируйте вручную: правка начинается с `.tsp`, затем
// `npm run build` в `api/` и `npm run generate:api` в `server/`.

import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';

// Заготовка обработчика: маршрут зарегистрирован по контракту, но логика ещё
// не написана. Ответ 501 — временная заглушка каркаса, в контракт не входит.
function stub(operationId) {
  return (req, res) => {
    res.status(501).json({
      error: {
        status: 501,
        code: 'not_implemented',
        message: `Обработчик «${operationId}» ещё не реализован`,
      },
    });
  };
}

/**
 * Собирает Express-роутер из маршрутов контракта. Тела запросов проверяются
 * схемами OpenAPI; реализацию подставляет вызывающий — по `operationId`.
 *
 * @param {Record<string, import('express').RequestHandler>} [handlers]
 *   обработчики операций по `operationId`; для операции без обработчика
 *   маршрут отвечает 501 not_implemented.
 * @returns {import('express').Router}
 */
export function createApiRouter(handlers = {}) {
  /** Ресурс «Bookings». */
  const bookingsRouter = Router();
  // Предстоящие брони
  bookingsRouter.get('/api/bookings', handlers['Bookings_list'] ?? stub('Bookings_list'));
  // Создание брони
  bookingsRouter.post('/api/bookings', validateBody('BookingCreate'), handlers['Bookings_create'] ?? stub('Bookings_create'));

  /** Ресурс «EventTypes». */
  const eventTypesRouter = Router();
  // Список типов событий
  eventTypesRouter.get('/api/event-types', handlers['EventTypes_list'] ?? stub('EventTypes_list'));
  // Создание типа события
  eventTypesRouter.post('/api/event-types', validateBody('EventTypeCreate'), handlers['EventTypes_create'] ?? stub('EventTypes_create'));

  /** Ресурс «EventTypeSlots». */
  const eventTypeSlotsRouter = Router();
  // Сетка слотов типа события
  eventTypeSlotsRouter.get('/api/event-types/:id/slots', handlers['EventTypeSlots_list'] ?? stub('EventTypeSlots_list'));

  /** Все сгенерированные маршруты контракта. */
  const apiRouter = Router();
  apiRouter.use(bookingsRouter);
  apiRouter.use(eventTypesRouter);
  apiRouter.use(eventTypeSlotsRouter);
  return apiRouter;
}
