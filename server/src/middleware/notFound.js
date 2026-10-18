import HttpError from '../lib/httpError.js';

// Ловит запросы, не совпавшие ни с одним маршрутом, и передаёт ошибку
// в errorHandler — чтобы все ответы имели единый формат.
export default function notFound(req, res, next) {
  next(
    new HttpError(404, `Маршрут не найден: ${req.method} ${req.originalUrl}`, {
      code: 'not_found',
    }),
  );
}
