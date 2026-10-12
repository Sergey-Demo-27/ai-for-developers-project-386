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

  // Здесь будут монтироваться маршруты по мере появления функционала:
  //   app.use('/api/...', router);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
