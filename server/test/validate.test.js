import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBody } from '../src/middleware/validate.js';

// Прогоняет middleware валидации над телом и возвращает перехваченную ошибку.
function run(schemaName, body) {
  const middleware = validateBody(schemaName);
  const req = { body };

  let error;
  middleware(req, {}, (err) => {
    error = err;
  });

  return { req, error };
}

function fields(error) {
  return error.details.map((detail) => detail.field).sort();
}

test('валидатор пропускает корректное тело и подставляет default из контракта', () => {
  const { req, error } = run('EventTypeCreate', {
    name: 'Консультация',
  });

  assert.equal(error, undefined);
  assert.equal(req.body.description, '');
});

test('валидатор собирает details по всем невалидным полям сразу', () => {
  const { error } = run('EventTypeCreate', {});

  assert.equal(error.status, 400);
  assert.equal(error.code, 'validation_error');
  assert.deepEqual(fields(error), ['name']);
});

test('валидатор ловит слишком длинное название', () => {
  const { error } = run('EventTypeCreate', {
    name: 'x'.repeat(101),
  });

  assert.deepEqual(fields(error), ['name']);
});

test('валидатор ловит формат даты и времени в брони', () => {
  const { error } = run('BookingCreate', {
    eventTypeId: 1,
    date: '15.10.2026',
    start: '25:00',
    guestName: 'Иван',
    guestEmail: 'ivan@example.com',
  });

  assert.deepEqual(fields(error), ['date', 'start']);
});

test('валидатор ловит тип поля', () => {
  const { error } = run('BookingCreate', {
    eventTypeId: '1',
    date: '2026-10-15',
    start: '09:00',
    guestName: 'Иван',
    guestEmail: 'ivan@example.com',
  });

  assert.deepEqual(fields(error), ['eventTypeId']);
});
