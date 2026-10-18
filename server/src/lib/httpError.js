// Ошибка с HTTP-статусом. Бросайте её из любого места приложения
// (в том числе из async-обработчиков Express 5) — middleware errorHandler
// сам превратит её в корректный JSON-ответ.
//
// `code` — машинный код из контракта (`validation_error`, `slot_taken`, …),
// `details` — разбор по полям у ошибок валидации (см. docs/spec.md).
export default class HttpError extends Error {
  constructor(status, message, { code, details, cause } = {}) {
    super(message, { cause });
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
    // Детали внутренних (5xx) ошибок не должны утекать клиенту.
    this.expose = status < 500;
  }
}
