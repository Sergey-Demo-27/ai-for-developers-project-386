import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { apiRouter } from '../src/generated/routes.js';
import notFound from '../src/middleware/notFound.js';
import errorHandler from '../src/middleware/errorHandler.js';

// Сгенерированные заготовки маршрутов в приложение пока не смонтированы
// (см. src/app.js), поэтому тест собирает приложение из них напрямую.
let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use(apiRouter);
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
  assert.equal(body.error.details.length, 2);
});

test('неизвестный путь под /api остаётся 404 not_found', async () => {
  const res = await fetch(`${baseUrl}/api/nope`);

  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, 'not_found');
});
