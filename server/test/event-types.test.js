import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/app.js';
import { migrate } from '../src/db/migrate.js';

// Типы событий: POST/GET /api/event-types (docs/spec.md, «Типы событий»).
// Тесты ходят по HTTP через fetch — тот же путь, что у клиента.
// Длительности у типа нет: слоты всегда по 30 минут (`SLOT_MINUTES`).
let server;

before(async () => {
  server = await startTestServer();
  migrate(server.db);
});

after(async () => {
  await server.close();
});

// Каждый сценарий начинается с чистой таблицы.
beforeEach(() => {
  server.db.exec('DELETE FROM event_types');
});

function post(body) {
  return fetch(`${server.baseUrl}/api/event-types`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('на чистой базе список типов пуст', async () => {
  const res = await fetch(`${server.baseUrl}/api/event-types`);

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { eventTypes: [] });
});

test('создаёт тип события и отвечает 201 телом { eventType } без длительности', async () => {
  const res = await post({
    name: 'Консультация',
    description: 'Разбор задачи',
  });

  assert.equal(res.status, 201);

  const { eventType } = await res.json();
  assert.equal(typeof eventType.id, 'number');
  assert.deepEqual(
    { ...eventType, id: undefined },
    {
      id: undefined,
      name: 'Консультация',
      description: 'Разбор задачи',
    },
  );
  assert.equal('durationMinutes' in eventType, false);
});

test('описание необязательно и по умолчанию пустая строка', async () => {
  const res = await post({ name: 'Без описания' });

  assert.equal(res.status, 201);
  assert.equal((await res.json()).eventType.description, '');
});

test('название сохраняется без окружающих пробелов', async () => {
  const res = await post({ name: '  Консультация  ' });

  assert.equal(res.status, 201);
  assert.equal((await res.json()).eventType.name, 'Консультация');
});

test('список отдаёт типы в порядке возрастания id', async () => {
  await post({ name: 'Первый' });
  await post({ name: 'Второй' });

  const res = await fetch(`${server.baseUrl}/api/event-types`);
  const { eventTypes } = await res.json();

  assert.deepEqual(
    eventTypes.map((eventType) => eventType.name),
    ['Первый', 'Второй'],
  );
  assert.ok(eventTypes[0].id < eventTypes[1].id);
});

test('отклоняет пустое после trim название', async () => {
  const res = await post({ name: '   ' });

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.equal(body.error.code, 'validation_error');
  assert.deepEqual(body.error.details, [
    { field: 'name', message: 'Поле не может быть пустым' },
  ]);
});

test('отклоняет название длиннее 100 символов', async () => {
  const res = await post({ name: 'x'.repeat(101) });

  assert.equal(res.status, 400);
  assert.ok(
    (await res.json()).error.details.some(
      (detail) => detail.field === 'name',
    ),
  );
});

test('отклоняет описание длиннее 1000 символов', async () => {
  const res = await post({
    name: 'Тип',
    description: 'x'.repeat(1001),
  });

  assert.equal(res.status, 400);
  assert.ok(
    (await res.json()).error.details.some(
      (detail) => detail.field === 'description',
    ),
  );
});

test('собирает details по всем невалидным полям разом', async () => {
  const res = await post({});

  assert.equal(res.status, 400);

  const { details } = (await res.json()).error;
  assert.deepEqual(
    details.map((detail) => detail.field).sort(),
    ['name'],
  );
});
