import HttpError from '../lib/httpError.js';

// Код ошибки по умолчанию, когда обработчик его не задал. Контракт требует,
// чтобы `code` был всегда (docs/spec.md, «Конверт ошибки»).
const DEFAULT_CODES = {
  400: 'validation_error',
  404: 'not_found',
  409: 'slot_taken',
  500: 'internal_error',
};

// Централизованный обработчик ошибок. В Express 5 сюда автоматически
// попадают и ошибки из async-обработчиков. Обязательно четыре аргумента,
// иначе Express не распознает middleware как обработчик ошибок.
// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, req, res, next) {
  // express.json() не смог разобрать тело — это 400 invalid_json, а не 500.
  if (!(err instanceof HttpError) && err?.type === 'entity.parse.failed') {
    res.status(400).json({
      error: {
        status: 400,
        code: 'invalid_json',
        message: 'Тело запроса не является корректным JSON',
      },
    });
    return;
  }

  const status = err instanceof HttpError ? err.status : 500;
  const expose = err instanceof HttpError ? err.expose : false;

  if (status >= 500) {
    console.error(err);
  }

  const body = {
    status,
    code:
      (err instanceof HttpError && err.code) ||
      DEFAULT_CODES[status] ||
      'internal_error',
    message: expose && err.message ? err.message : 'Internal Server Error',
  };

  if (err instanceof HttpError && err.details) {
    body.details = err.details;
  }

  res.status(status).json({ error: body });
}
