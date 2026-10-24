import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/app.js';
import { migrate } from '../src/db/migrate.js';

// Сетка слотов типа события: GET /api/event-types/:id/slots
// (docs/spec.md, «Сетка слотов и окно записи»). Слоты всегда по 30 минут
// (`SLOT_MINUTES`), длительности у типа нет.
//
// «Сегодня» задаётся инъекцией часов при сборке приложения, поэтому сетка
// детерминирована: 20 октября 2026, 08:00 — все слоты дня ещё впереди.
const NOW = new Date(2026, 9, 20, 8, 0);

let server;

before(async () => {
  server = await startTestServer({ now: () => NOW });
  migrate(server.db);
});

after(async () => {
  await server.close();
});

// Каждый сценарий начинается с чистых таблиц (брони ссылаются на типы).
beforeEach(() => {
  server.db.exec('DELETE FROM bookings; DELETE FROM event_types;');
});

// Создаёт тип события на приложении и возвращает его `id`.
async function createEventType(baseUrl, { name = 'Тип' } = {}) {
  const res = await fetch(`${baseUrl}/api/event-types`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  return (await res.json()).eventType.id;
}

// Сетка слотов типа.
async function getSlots(baseUrl, id) {
  const res = await fetch(`${baseUrl}/api/event-types/${id}/slots`);
  assert.equal(res.status, 200);
  return (await res.json()).days;
}

// Кладёт бронь прямо в таблицу: создание брони живёт в другом тесте, а
// занятость нужна уже сейчас — это подготовка данных, а не проверка.
function insertBooking(db, { eventTypeId, date, startMinutes, durationMinutes = 30 }) {
  db.prepare(
    `INSERT INTO bookings
       (event_type_id, date, start_minutes, duration_minutes, guest_name, guest_email)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    eventTypeId,
    date,
    startMinutes,
    durationMinutes,
    'Иван',
    'ivan@example.com',
  );
}

// Слот с указанным началом на дне.
function slotAt(day, start) {
  return day.slots.find((slot) => slot.start === start);
}

// Отдельное приложение с другими часами — для сценариев про «сейчас».
async function startAt(now) {
  const instance = await startTestServer({ now: () => now });
  migrate(instance.db);
  return instance;
}

test('отдаёт 18 слотов по 30 минут в каждом из 14 дней', async () => {
  const id = await createEventType(server.baseUrl);

  const days = await getSlots(server.baseUrl, id);

  assert.equal(days.length, 14);
  for (const day of days) {
    assert.equal(day.slots.length, 18);
  }

  assert.deepEqual(days[0].slots[0], {
    start: '09:00',
    end: '09:30',
    available: true,
  });
  assert.deepEqual(days[0].slots.at(-1), {
    start: '17:30',
    end: '18:00',
    available: true,
  });
});

test('окно — 14 дней [сегодня … сегодня + 13] включительно', async () => {
  const id = await createEventType(server.baseUrl);

  const days = await getSlots(server.baseUrl, id);

  assert.equal(days[0].date, '2026-10-20');
  assert.equal(days.at(-1).date, '2026-11-02');
});

test('на чистой базе все слоты окна свободны', async () => {
  const id = await createEventType(server.baseUrl);

  const days = await getSlots(server.baseUrl, id);
  const allSlots = days.flatMap((day) => day.slots);

  assert.equal(allSlots.length, 14 * 18);
  assert.ok(allSlots.every((slot) => slot.available));
});

test('слот, пересекающийся с бронью, недоступен и остаётся в сетке', async () => {
  const id = await createEventType(server.baseUrl);

  // Бронь 09:00–10:00 (60 минут) на завтра пересекает два 30-минутных слота.
  insertBooking(server.db, {
    eventTypeId: id,
    date: '2026-10-21',
    startMinutes: 9 * 60,
    durationMinutes: 60,
  });

  const days = await getSlots(server.baseUrl, id);
  const tomorrow = days[1];

  assert.equal(tomorrow.date, '2026-10-21');
  assert.equal(tomorrow.slots.length, 18);
  assert.equal(slotAt(tomorrow, '09:00').available, false);
  assert.equal(slotAt(tomorrow, '09:30').available, false);
  assert.equal(slotAt(tomorrow, '10:00').available, true);
});

test('касание интервалов занятостью не считается', async () => {
  const id = await createEventType(server.baseUrl);

  // Бронь 09:00–09:30: следующий слот 09:30–10:00 только касается её.
  insertBooking(server.db, {
    eventTypeId: id,
    date: '2026-10-21',
    startMinutes: 9 * 60,
  });

  const days = await getSlots(server.baseUrl, id);
  const tomorrow = days[1];

  assert.equal(slotAt(tomorrow, '09:00').available, false);
  assert.equal(slotAt(tomorrow, '09:30').available, true);
});

test('бронь в другой день не влияет на доступность', async () => {
  const id = await createEventType(server.baseUrl);

  insertBooking(server.db, {
    eventTypeId: id,
    date: '2026-10-21',
    startMinutes: 9 * 60,
  });

  const days = await getSlots(server.baseUrl, id);

  assert.equal(slotAt(days[0], '09:00').available, true);
  assert.equal(slotAt(days[2], '09:00').available, true);
});

test('прошедшие слоты сегодня недоступны, но остаются в сетке', async () => {
  const midday = await startAt(new Date(2026, 9, 20, 12, 0));

  try {
    const id = await createEventType(midday.baseUrl);
    const days = await getSlots(midday.baseUrl, id);
    const today = days[0];

    assert.equal(today.slots.length, 18);
    assert.equal(slotAt(today, '11:30').available, false);
    assert.equal(slotAt(today, '12:00').available, false);
    assert.equal(slotAt(today, '12:30').available, true);

    // На будущие дни «сейчас» не влияет.
    assert.equal(slotAt(days[1], '09:00').available, true);
  } finally {
    await midday.close();
  }
});

test('нецелый id даёт 404 event_type_not_found', async () => {
  const res = await fetch(`${server.baseUrl}/api/event-types/abc/slots`);

  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, 'event_type_not_found');
});

test('id в нецелевидной записи («1.0», «1e0») даёт 404, а не 200', async () => {
  const id = await createEventType(server.baseUrl);

  for (const raw of [`${id}.0`, `${id}e0`, `0x${id.toString(16)}`]) {
    const res = await fetch(`${server.baseUrl}/api/event-types/${raw}/slots`);

    assert.equal(res.status, 404, `ожидали 404 для id «${raw}»`);
    assert.equal((await res.json()).error.code, 'event_type_not_found');
  }
});

test('несуществующий id даёт 404 event_type_not_found', async () => {
  const res = await fetch(`${server.baseUrl}/api/event-types/999/slots`);

  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, 'event_type_not_found');
});
