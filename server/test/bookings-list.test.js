import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/app.js';
import { migrate } from '../src/db/migrate.js';

// Список предстоящих броней: GET /api/bookings
// (docs/spec.md, «HTTP-контракты и ошибки», «Подтверждение, успех и список
// предстоящих броней»).
//
// Часы подставляются инъекцией и меняются по ходу сценария: брони создаются
// «утром», а список читается позже — так проверяется отбор будущего без
// ручных вставок в таблицу. Слоты всегда по 30 минут (`SLOT_MINUTES`).
const MORNING = new Date(2026, 9, 20, 8, 0); // 20 октября 2026, 08:00
const MIDDAY = new Date(2026, 9, 20, 12, 0); // 20 октября 2026, 12:00

let now = MORNING;
let server;

before(async () => {
  server = await startTestServer({ now: () => now });
  migrate(server.db);
});

after(async () => {
  await server.close();
});

beforeEach(() => {
  now = MORNING;
  server.db.exec('DELETE FROM bookings; DELETE FROM event_types;');
});

// Создаёт тип события и возвращает его `id`.
async function createEventType(baseUrl, { name = 'Тип' } = {}) {
  const res = await fetch(`${baseUrl}/api/event-types`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  return (await res.json()).eventType.id;
}

// Создаёт бронь и возвращает её тело из ответа `201 { booking }`.
async function book(baseUrl, body) {
  const res = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      guestName: 'Иван',
      guestEmail: 'ivan@example.com',
      ...body,
    }),
  });

  const payload = await res.json();
  assert.equal(
    res.status,
    201,
    `подготовка брони должна удаваться: ${JSON.stringify(payload)}`,
  );
  return payload.booking;
}

// GET /api/bookings как есть.
function listBookings(baseUrl) {
  return fetch(`${baseUrl}/api/bookings`);
}

test('отдаёт только будущие брони, по возрастанию даты и времени, с именем типа и интервалом 30 минут', async () => {
  const consultation = await createEventType(server.baseUrl, {
    name: 'Консультация',
  });
  const meeting = await createEventType(server.baseUrl, { name: 'Созвон' });

  // Бронь сегодня в 09:00 к полудню уже началась — в список не попадает.
  const started = await book(server.baseUrl, {
    eventTypeId: consultation,
    date: '2026-10-20',
    start: '09:00',
    guestName: 'Прошедший',
    guestEmail: 'past@example.com',
  });
  const todayLater = await book(server.baseUrl, {
    eventTypeId: consultation,
    date: '2026-10-20',
    start: '12:30',
  });
  const tomorrowEarly = await book(server.baseUrl, {
    eventTypeId: meeting,
    date: '2026-10-21',
    start: '09:00',
  });
  const tomorrowLate = await book(server.baseUrl, {
    eventTypeId: meeting,
    date: '2026-10-21',
    start: '10:00',
  });

  now = MIDDAY;

  const res = await listBookings(server.baseUrl);
  assert.equal(res.status, 200);

  const { bookings } = await res.json();

  // Порядок: сначала дата, затем время начала.
  assert.deepEqual(
    bookings.map((booking) => [booking.id, booking.date, booking.start]),
    [
      [todayLater.id, '2026-10-20', '12:30'],
      [tomorrowEarly.id, '2026-10-21', '09:00'],
      [tomorrowLate.id, '2026-10-21', '10:00'],
    ],
  );

  const [first] = bookings;
  assert.equal(first.end, '13:00', 'конец — начало плюс 30 минут');
  assert.equal(
    first.eventTypeName,
    'Консультация',
    'имя типа — join по event_type_id',
  );
  assert.equal(first.guestName, 'Иван');
  assert.equal(first.guestEmail, 'ivan@example.com');
  assert.match(
    first.createdAt,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
  );

  assert.ok(
    !bookings.some((booking) => booking.id === started.id),
    'бронь с уже начавшимся слотом в список не попадает',
  );
});

test('бронь сегодняшнего дня включается, только если начало строго в будущем', async () => {
  const id = await createEventType(server.baseUrl);

  // К полудню 12:00 уже идёт, 12:30 ещё не начался.
  await book(server.baseUrl, {
    eventTypeId: id,
    date: '2026-10-20',
    start: '12:00',
  });
  const later = await book(server.baseUrl, {
    eventTypeId: id,
    date: '2026-10-20',
    start: '12:30',
  });

  now = MIDDAY;

  const { bookings } = await (await listBookings(server.baseUrl)).json();

  assert.deepEqual(
    bookings.map((booking) => booking.id),
    [later.id],
  );
});

test('бронь с прошедшей датой в список не попадает', async () => {
  const id = await createEventType(server.baseUrl);

  await book(server.baseUrl, {
    eventTypeId: id,
    date: '2026-10-21',
    start: '09:00',
  });

  // Завтрашняя относительно брони дата уже прошла.
  now = new Date(2026, 10, 5);

  const { bookings } = await (await listBookings(server.baseUrl)).json();

  assert.deepEqual(bookings, []);
});

test('чистая база отдаёт пустой список', async () => {
  const res = await listBookings(server.baseUrl);

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { bookings: [] });
});
