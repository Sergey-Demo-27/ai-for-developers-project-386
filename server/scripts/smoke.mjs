// Дымовой тест: поднимает реальный сервер на временной базе и проходит
// сквозной путь по контракту (docs/spec.md, «Дымовой тест и /health»):
// POST /api/event-types → GET /api/event-types/:id/slots → POST /api/bookings →
// GET /api/bookings, сверяя коды и форму ответов. Сначала ждём 200 от /health —
// это проба готовности, — и только потом идём по контракту.
//
// База живёт во временном каталоге (`DB_PATH`), поэтому `data/dev.db` не
// пачкается: схема применяется здесь же, до старта сервера.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';

const SERVER_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const TIMEOUT_MS = 15_000;

const tempDir = mkdtempSync(path.join(tmpdir(), 'call-calendar-smoke-'));
const dbPath = path.join(tempDir, 'smoke.db');

// Схема идемпотентна; на чистой временной базе её нужно применить до старта.
const setupDb = openDatabase(dbPath);
migrate(setupDb);
setupDb.close();

// Порт берём свободный, чтобы дымовой тест не конфликтовал с запущенным
// `npm run dev` на 3000; явный `PORT` в окружении — по-прежнему уважаем.
const port = process.env.PORT ?? String(await freePort());
const baseUrl = `http://127.0.0.1:${port}`;

const server = spawn(
  process.execPath,
  ['--env-file-if-exists=.env', 'src/server.js'],
  {
    cwd: SERVER_DIR,
    stdio: 'inherit',
    // Переменные окружения перекрывают `.env` (значения из окружения имеют
    // приоритет над `--env-file`), поэтому временная база и порт побеждают.
    env: { ...process.env, DB_PATH: dbPath, PORT: port },
  },
);

let code = 1;
try {
  await waitForHealth();
  await runContract();
  console.log('OK: сквозной путь по контракту пройден');
  code = 0;
} catch (err) {
  console.error('Дымовой тест не прошёл:', err.message);
} finally {
  await stopServer();
  rmSync(tempDir, { recursive: true, force: true });
}
process.exit(code);

// Останавливаем сервер и дожидаемся выхода, чтобы не удалять временную базу,
// пока процесс ещё держит её файлы. Ожидание ограничено: `server.js` завершается
// по SIGTERM сам, но зависший процесс не должен вешать тест.
async function stopServer() {
  if (server.exitCode !== null) return;
  const exited = new Promise((resolve) => server.once('exit', resolve));
  server.kill('SIGTERM');
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3_000))]);
}

// Свободный порт: слушаем 0, узнаём выданный номер и сразу освобождаем.
async function freePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const { port: free } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return free;
}

async function waitForHealth() {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`сервер завершился до готовности (код ${server.exitCode})`);
    }
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) {
        // Проба готовности отвечает `{ status: "ok" }` (docs/spec.md,
        // «Дымовой тест и /health»); этого ответа и ждём.
        const body = await res.json();
        if (body.status === 'ok') return;
      }
    } catch {
      // сервер ещё не слушает — пробуем снова
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`не дождались ответа ${baseUrl}/health за ${TIMEOUT_MS} мс`);
}

// Сквозной путь по контракту: создаём тип, читаем сетку, бронируем свободный
// слот и убеждаемся, что бронь попала в список предстоящих.
async function runContract() {
  const created = await postJson('/api/event-types', {
    name: 'Дымовой тип',
  });
  assert.equal(created.status, 201, 'POST /api/event-types → 201');
  const eventType = created.body.eventType;
  assert.ok(eventType, 'ответ содержит { eventType }');
  assert.equal(typeof eventType.id, 'number', 'eventType.id — число');
  assert.equal(eventType.name, 'Дымовой тип', 'имя сохранено');
  assert.equal(
    'durationMinutes' in eventType,
    false,
    'у типа события нет длительности — слоты всегда по 30 минут',
  );

  const slots = await getJson(`/api/event-types/${eventType.id}/slots`);
  assert.equal(slots.status, 200, 'GET /api/event-types/:id/slots → 200');
  const days = slots.body.days;
  assert.ok(Array.isArray(days), 'ответ содержит { days }');
  assert.equal(days.length, 14, 'сетка — ровно 14 дней окна записи');

  const free = firstAvailableSlot(days);
  assert.ok(free, 'в окне записи есть хотя бы один свободный слот');

  const createdBooking = await postJson('/api/bookings', {
    eventTypeId: eventType.id,
    date: free.date,
    start: free.start,
    guestName: 'Дымовой гость',
    guestEmail: 'smoke@example.com',
  });
  assert.equal(createdBooking.status, 201, 'POST /api/bookings → 201');
  const booking = createdBooking.body.booking;
  assert.ok(booking, 'ответ содержит { booking }');
  assert.equal(booking.eventTypeId, eventType.id, 'бронь ссылается на тип');
  assert.equal(booking.date, free.date, 'дата брони — дата слота');
  assert.equal(booking.start, free.start, 'начало брони — начало слота');
  assert.equal(booking.end, free.end, 'end вычислен из начала и 30 минут');
  assert.equal(booking.guestName, 'Дымовой гость', 'имя гостя сохранено');
  assert.equal(booking.guestEmail, 'smoke@example.com', 'email сохранён');
  assert.ok(booking.createdAt, 'booking.createdAt присутствует');

  const listed = await getJson('/api/bookings');
  assert.equal(listed.status, 200, 'GET /api/bookings → 200');
  assert.ok(Array.isArray(listed.body.bookings), 'ответ содержит { bookings }');
  const match = listed.body.bookings.find((item) => item.id === booking.id);
  assert.ok(match, 'созданная бронь попала в список предстоящих');
  assert.equal(
    match.eventTypeName,
    'Дымовой тип',
    'eventTypeName приходит join’ом по типу',
  );
}

// Первый свободный слот сетки — дни идут в порядке окна, слоты внутри дня тоже.
function firstAvailableSlot(days) {
  for (const day of days) {
    for (const slot of day.slots) {
      if (slot.available) {
        return { date: day.date, start: slot.start, end: slot.end };
      }
    }
  }
  return undefined;
}

async function getJson(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  return { status: response.status, body: await response.json() };
}

async function postJson(pathname, body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
