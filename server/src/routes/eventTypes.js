// Обработчики ресурса «Типы событий».
//
// Маршруты и валидация тела приходят из сгенерированного роутера
// (`src/generated/routes.js`): к моменту вызова тело уже проверено по схеме
// контракта и заполнено значениями по умолчанию. Здесь остаются только
// смысловые правила, которые схема не выражает (trim).

import HttpError from '../lib/httpError.js';
import { insertEventType, listEventTypes } from '../repositories/eventTypes.js';

// GET /api/event-types — все типы, порядок по `id`; чистая база — пустой список.
export function listEventTypesHandler(req, res) {
  res.json({ eventTypes: listEventTypes(req.app.locals.db) });
}

// POST /api/event-types — создаёт тип события, отвечает `201 { eventType }`.
export function createEventTypeHandler(req, res) {
  const { name, description } = req.body;

  // Схема допускает строку из пробелов; «непустое после trim» — смысловое правило.
  const trimmedName = name.trim();
  if (trimmedName === '') {
    throw new HttpError(400, 'Некорректные данные запроса', {
      code: 'validation_error',
      details: [{ field: 'name', message: 'Поле не может быть пустым' }],
    });
  }

  const eventType = insertEventType(req.app.locals.db, {
    name: trimmedName,
    description,
  });

  res.status(201).json({ eventType });
}
