import express from 'express';
import { createApiRouter } from './generated/routes.js';
import { handlers } from './routes/index.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

// Собирает Express-приложение. Сознательно НЕ вызывает listen —
// это делает server.js, а тесты поднимают приложение на своём порту.
//
// Необязательные `db` и `now` кладутся в app.locals, чтобы репозитории
// получали соединение через req.app.locals.db, а обработчики, зависящие от
// текущего момента, — часы через req.app.locals.now (тесты подставляют свои).
export function createApp({ db, now } = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.locals.db = db ?? null;
  app.locals.now = now ?? (() => new Date());

  // Проверка живости: используется дымовым тестом (`npm run smoke`) и CI,
  // чтобы убедиться, что приложение поднялось и отвечает.
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Корень сервиса: технический ответ «жив», вне контракта /api. Нужен, чтобы
  // главная страница контейнера отвечала 200, а не 404 (автопроверка Hexlet
  // собирает образ из корневого Dockerfile и ждёт 200 на `/`).
  app.get('/', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Маршруты контракта собираются сгенерированным роутером: пути и валидация
  // тел приходят из OpenAPI, реализация — из `src/routes/index.js` по
  // `operationId`. Операции без обработчика пока отвечают `501 not_implemented`.
  app.use(createApiRouter(handlers));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
