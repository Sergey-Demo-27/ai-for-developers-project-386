import HttpError from '../lib/httpError.js';

// Централизованный обработчик ошибок. В Express 5 сюда автоматически
// попадают и ошибки из async-обработчиков. Обязательно четыре аргумента,
// иначе Express не распознает middleware как обработчик ошибок.
// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, req, res, next) {
  const status = err instanceof HttpError ? err.status : 500;
  const expose = err instanceof HttpError ? err.expose : false;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    error: {
      status,
      message: expose && err.message ? err.message : 'Internal Server Error',
    },
  });
}
