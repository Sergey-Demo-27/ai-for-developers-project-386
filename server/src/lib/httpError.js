// Ошибка с HTTP-статусом. Бросайте её из любого места приложения
// (в том числе из async-обработчиков Express 5) — middleware errorHandler
// сам превратит её в корректный JSON-ответ.
export default class HttpError extends Error {
  constructor(status, message, options) {
    super(message, options);
    this.name = 'HttpError';
    this.status = status;
    // Детали внутренних (5xx) ошибок не должны утекать клиенту.
    this.expose = status < 500;
  }
}
