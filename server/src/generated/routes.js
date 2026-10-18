// Сгенерировано scripts/generate-api.mjs из api/openapi/openapi.yaml.
// Не редактируйте вручную: правка начинается с `.tsp`, затем
// `npm run build` в `api/` и `npm run generate:api` в `server/`.

import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';

// Заготовка обработчика: маршрут зарегистрирован по контракту, но логика ещё
// не написана. Ответ 501 — временная заглушка каркаса, в контракт не входит;
// монтирование в приложение — дело `src/app.js` (см. README).
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

/** Ресурс «Bookings». */
export const bookingsRouter = Router();
// Предстоящие брони
bookingsRouter.get('/api/bookings', stub('Bookings_list'));
// Создание брони
bookingsRouter.post('/api/bookings', validateBody('BookingCreate'), stub('Bookings_create'));

/** Ресурс «EventTypes». */
export const eventTypesRouter = Router();
// Список типов событий
eventTypesRouter.get('/api/event-types', stub('EventTypes_list'));
// Создание типа события
eventTypesRouter.post('/api/event-types', validateBody('EventTypeCreate'), stub('EventTypes_create'));

/** Ресурс «EventTypeSlots». */
export const eventTypeSlotsRouter = Router();
// Сетка слотов типа события
eventTypeSlotsRouter.get('/api/event-types/:id/slots', stub('EventTypeSlots_list'));

/** Все сгенерированные маршруты контракта. */
export const apiRouter = Router();
apiRouter.use(bookingsRouter);
apiRouter.use(eventTypesRouter);
apiRouter.use(eventTypeSlotsRouter);
