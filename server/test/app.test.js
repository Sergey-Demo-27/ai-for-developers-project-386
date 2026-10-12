import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/app.js';
import { openDatabase } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';

let server;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server.close();
});

test('приложение отвечает 404 в едином JSON-формате на неизвестный маршрут', async () => {
  const res = await fetch(`${server.baseUrl}/no-such-route`);

  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /application\/json/);

  const body = await res.json();
  assert.equal(body.error.status, 404);
  assert.equal(typeof body.error.message, 'string');
});

test('применение пустой схемы не завершается ошибкой', () => {
  const db = openDatabase(':memory:');
  try {
    assert.doesNotThrow(() => migrate(db));
  } finally {
    db.close();
  }
});
