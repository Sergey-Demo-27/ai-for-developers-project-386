import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { createApiRouter } from '../src/generated/routes.js';
import notFound from '../src/middleware/notFound.js';
import errorHandler from '../src/middleware/errorHandler.js';

// Сгенерированный роутер собирается фабрикой: без обработчиков операции
// отвечают 501, переданный обработчик подставляется по `operationId`.
let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use(createApiRouter());
  app.use(notFound);
  app.use(errorHandler);

  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('заготовка маршрута отвечает 501 not_implemented', async () => {
  const res = await fetch(`${baseUrl}/api/event-types`);

  assert.equal(res.status, 501);
  assert.equal((await res.json()).error.code, 'not_implemented');
});

test('маршрут из контракта валидирует тело до обработчика', async () => {
  const res = await fetch(`${baseUrl}/api/event-types`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });

  assert.equal(res.status, 400);

  const body = await res.json();
  assert.equal(body.error.code, 'validation_error');
  assert.equal(body.error.details.length, 1);
  assert.equal(body.error.details[0].field, 'name');
});

test('неизвестный путь под /api остаётся 404 not_found', async () => {
  const res = await fetch(`${baseUrl}/api/nope`);

  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, 'not_found');
});

test('переданный обработчик подставляется в маршрут по operationId', async () => {
  const app = express();
  app.use(express.json());
  app.use(
    createApiRouter({
      EventTypes_list: (req, res) => res.json({ eventTypes: [] }),
    }),
  );
  app.use(notFound);
  app.use(errorHandler);

  const local = app.listen(0);
  await once(local, 'listening');

  try {
    const res = await fetch(
      `http://127.0.0.1:${local.address().port}/api/event-types`,
    );

    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { eventTypes: [] });
  } finally {
    await new Promise((resolve) => local.close(resolve));
  }
});
