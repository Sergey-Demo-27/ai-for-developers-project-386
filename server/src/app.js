import express from 'express';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

// Собирает Express-приложение. Сознательно НЕ вызывает listen —
// это делает server.js, а тесты поднимают приложение на своём порту.
//
// Необязательный `db` кладётся в app.locals, чтобы будущие репозитории
// могли получить соединение через req.app.locals.db.
export function createApp({ db } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.locals.db = db ?? null;

  // Проверка живости: используется дымовым тестом (`npm run smoke`) и CI,
  // чтобы убедиться, что приложение поднялось и отвечает.
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Заготовки маршрутов и их валидация сгенерированы из контракта в
  // `src/generated/routes.js` (см. `npm run generate:api` и README). Пока
  // обработчики не написаны, они не смонтированы: запрос под `/api/...`
  // остаётся `404 not_found`. Смонтируйте здесь `apiRouter`, когда появится
  // первая реализация:
  //   import { apiRouter } from './generated/routes.js';
  //   app.use(apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
