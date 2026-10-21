import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/app.js';
import { migrate } from '../src/db/migrate.js';

// Создание брони и правило занятости: POST /api/bookings
// (docs/spec.md, «Правило занятости», «HTTP-контракты и ошибки»).
//
// Тесты ходят по HTTP через fetch — тот же путь, что у клиента; «сегодня»
// задаётся инъекцией часов, поэтому окно записи детерминировано.
const NOW = new Date(2026, 9, 20, 8, 0); // 20 октября 2026, 08:00

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

// Создаёт тип события и возвращает его `id`.
async function createEventType(baseUrl, { durationMinutes }) {
  const res = await fetch(`${baseUrl}/api/event-types`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Тип', durationMinutes }),
  });

  return (await res.json()).eventType.id;
}

// POST /api/bookings с телом как есть.
function postBooking(baseUrl, body) {
  return fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Сетка слотов типа.
async function getSlots(baseUrl, id) {
  const res = await fetch(`${baseUrl}/api/event-types/${id}/slots`);
  assert.equal(res.status, 200);
  return (await res.json()).days;
}

// Слот с указанным началом на дне.
function slotAt(day, start) {
  return day.slots.find((slot) => slot.start === start);
}

test('создаёт бронь и отвечает 201 телом { booking } со снимком длительности', async () => {
  const id = await createEventType(server.baseUrl, { durationMinutes: 30 });

  const res = await postBooking(server.baseUrl, {
    eventTypeId: id,
    date: '2026-10-21',
    start: '09:00',
    guestName: 'Иван',
    guestEmail: 'ivan@example.com',
  });

  assert.equal(res.status, 201);

  const { booking } = await res.json();
  assert.equal(typeof booking.id, 'number');
  assert.equal(booking.eventTypeId, id);
  assert.equal(booking.date, '2026-10-21');
  assert.equal(booking.start, '09:00');
  assert.equal(booking.end, '09:30');
  assert.equal(booking.guestName, 'Иван');
  assert.equal(booking.guestEmail, 'ivan@example.com');
  assert.match(booking.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
});

test('конец брони — начало плюс длительность типа', async () => {
  const id = await createEventType(server.baseUrl, { durationMinutes: 60 });

  const res = await postBooking(server.baseUrl, {
    eventTypeId: id,
    date: '2026-10-21',
    start: '09:00',
    guestName: 'Иван',
    guestEmail: 'ivan@example.com',
  });

  assert.equal(res.status, 201);
  assert.equal((await res.json()).booking.end, '10:00');
});

test('имя гостя сохраняется без окружающих пробелов', async () => {
  const id = await createEventType(server.baseUrl, { durationMinutes: 30 });

  const res = await postBooking(server.baseUrl, {
    eventTypeId: id,
    date: '2026-10-21',
    start: '09:00',
    guestName: '  Иван  ',
    guestEmail: 'ivan@example.com',
  });

  assert.equal(res.status, 201);
  assert.equal((await res.json()).booking.guestName, 'Иван');
});

test('после брони слот занят в сетке своего и любого другого типа', async () => {
  const id = await createEventType(server.baseUrl, { durationMinutes: 30 });
  const otherId = await createEventType(server.baseUrl, { durationMinutes: 60 });

  const res = await postBooking(server.baseUrl, {
    eventTypeId: id,
    date: '2026-10-21',
    start: '09:00',
    guestName: 'Иван',
    guestEmail: 'ivan@example.com',
  });
  assert.equal(res.status, 201);

  const own = await getSlots(server.baseUrl, id);
  const other = await getSlots(server.baseUrl, otherId);

  assert.equal(slotAt(own[1], '09:00').available, false);
  assert.equal(slotAt(other[1], '09:00').available, false);
  assert.equal(slotAt(other[1], '10:00').available, true);
});

test('повторная бронь того же слота даёт 409 slot_taken', async () => {
  const id = await createEventType(server.baseUrl, { durationMinutes: 30 });
  const body = {
    eventTypeId: id,
    date: '2026-10-21',
    start: '09:00',
    guestName: 'Иван',
    guestEmail: 'ivan@example.com',
  };

  assert.equal((await postBooking(server.baseUrl, body)).status, 201);

  const res = await postBooking(server.baseUrl, body);
  assert.equal(res.status, 409);

  const { error } = await res.json();
  assert.equal(error.status, 409);
  assert.equal(error.code, 'slot_taken');
  assert.equal(error.message, 'Это время уже занято, выберите другой слот');
});

test('частичное наложение разных типов даёт 409', async () => {
  const id = await createEventType(server.baseUrl, { durationMinutes: 30 });
  const otherId = await createEventType(server.baseUrl, { durationMinutes: 60 });

  // Занято 09:00–10:00 типом на час; слот 09:30–10:00 пересекается с ним.
  const first = await postBooking(server.baseUrl, {
    eventTypeId: otherId,
    date: '2026-10-21',
    start: '09:00',
    guestName: 'Иван',
    guestEmail: 'ivan@example.com',
  });
  assert.equal(first.status, 201);

  const res = await postBooking(server.baseUrl, {
    eventTypeId: id,
    date: '2026-10-21',
    start: '09:30',
    guestName: 'Пётр',
    guestEmail: 'petr@example.com',
  });

  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, 'slot_taken');
});

test('касание интервалов конфликтом не считается', async () => {
  const halfHour = await createEventType(server.baseUrl, { durationMinutes: 30 });
  const hour = await createEventType(server.baseUrl, { durationMinutes: 60 });

  // 09:00–10:00 и 10:00–10:30 только касаются в точке 10:00.
  const first = await postBooking(server.baseUrl, {
    eventTypeId: hour,
    date: '2026-10-21',
    start: '09:00',
    guestName: 'Иван',
    guestEmail: 'ivan@example.com',
  });
  assert.equal(first.status, 201);

  const second = await postBooking(server.baseUrl, {
    eventTypeId: halfHour,
    date: '2026-10-21',
    start: '10:00',
    guestName: 'Пётр',
    guestEmail: 'petr@example.com',
  });

  assert.equal(second.status, 201);
});

test('бронь в другой день не мешает тому же слоту', async () => {
  const id = await createEventType(server.baseUrl, { durationMinutes: 30 });
  const body = {
    eventTypeId: id,
    start: '09:00',
    guestName: 'Иван',
    guestEmail: 'ivan@example.com',
  };

  assert.equal(
    (await postBooking(server.baseUrl, { ...body, date: '2026-10-21' })).status,
    201,
  );
  assert.equal(
    (await postBooking(server.baseUrl, { ...body, date: '2026-10-22' })).status,
    201,
  );
});

// Отдельное приложение с другими часами — для сценариев про «сейчас».
async function startAt(now) {
  const instance = await startTestServer({ now: () => now });
  migrate(instance.db);
  return instance;
}

// Имена полей из `details` ошибки валидации.
function fields(body) {
  return body.error.details.map((detail) => detail.field).sort();
}

// Тело брони с корректными значениями; поля переопределяются по месту.
function bookingBody(eventTypeId, overrides = {}) {
  return {
    eventTypeId,
    date: '2026-10-21',
    start: '09:00',
    guestName: 'Иван',
    guestEmail: 'ivan@example.com',
    ...overrides,
  };
}

test('границы окна записи: сегодня и сегодня + 13 приняты', async () => {
  const id = await createEventType(server.baseUrl, { durationMinutes: 30 });

  const first = await postBooking(server.baseUrl, bookingBody(id, { date: '2026-10-20' }));
  const last = await postBooking(server.baseUrl, bookingBody(id, { date: '2026-11-02' }));

  assert.equal(first.status, 201);
  assert.equal(last.status, 201);
});

test('дата вне окна записи даёт 400 по полю date', async () => {
  const id = await createEventType(server.baseUrl, { durationMinutes: 30 });

  for (const date of ['2026-10-19', '2026-11-03']) {
    const res = await postBooking(server.baseUrl, bookingBody(id, { date }));

    assert.equal(res.status, 400, `ожидали 400 для даты «${date}»`);

    const body = await res.json();
    assert.equal(body.error.code, 'validation_error');
    assert.deepEqual(fields(body), ['date']);
  }
});

test('слот сегодняшнего дня с прошедшим началом даёт 400 по полю start', async () => {
  const midday = await startAt(new Date(2026, 9, 20, 12, 0));

  try {
    const id = await createEventType(midday.baseUrl, { durationMinutes: 30 });

    // 11:30 уже прошло, 12:00 идёт прямо сейчас — оба недоступны.
    for (const start of ['11:30', '12:00']) {
      const res = await postBooking(
        midday.baseUrl,
        bookingBody(id, { date: '2026-10-20', start }),
      );

      assert.equal(res.status, 400, `ожидали 400 для старта «${start}»`);
      assert.deepEqual(fields(await res.json()), ['start']);
    }

    // Ближайший будущий слот принимается.
    const res = await postBooking(
      midday.baseUrl,
      bookingBody(id, { date: '2026-10-20', start: '12:30' }),
    );
    assert.equal(res.status, 201);
  } finally {
    await midday.close();
  }
});

test('время вне сетки типа даёт 400 по полю start', async () => {
  const halfHour = await createEventType(server.baseUrl, { durationMinutes: 30 });
  const forty = await createEventType(server.baseUrl, { durationMinutes: 40 });

  // 09:15 — между слотами 30-минутного типа; 08:30 — до начала рабочего дня.
  for (const start of ['09:15', '08:30']) {
    const res = await postBooking(server.baseUrl, bookingBody(halfHour, { start }));

    assert.equal(res.status, 400, `ожидали 400 для старта «${start}»`);
    assert.deepEqual(fields(await res.json()), ['start']);
  }

  // 17:40 — неполный остаток справа у 40-минутного типа: не слот.
  const res = await postBooking(server.baseUrl, bookingBody(forty, { start: '17:40' }));
  assert.equal(res.status, 400);
  assert.deepEqual(fields(await res.json()), ['start']);
});

test('несуществующий тип события даёт 404 event_type_not_found', async () => {
  const res = await postBooking(server.baseUrl, bookingBody(999));

  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, 'event_type_not_found');
});

test('нецелый eventTypeId отклоняет схема контракта, а не обработчик', async () => {
  // Тикет #22 формулирует «нецелый eventTypeId → 404» по аналогии с путём
  // `:id` слотов, но в контракте `eventTypeId` — integer: нецелое значение
  // ловит схема (`BookingCreate`) и отдаёт `400 validation_error`, до
  // обработчика оно не доходит. Существование типа — уже смысловое правило.
  const res = await postBooking(server.baseUrl, bookingBody('1'));

  assert.equal(res.status, 400);
  assert.deepEqual(fields(await res.json()), ['eventTypeId']);
});

test('пустое после trim имя гостя даёт 400 по полю guestName', async () => {
  const id = await createEventType(server.baseUrl, { durationMinutes: 30 });

  const res = await postBooking(server.baseUrl, bookingBody(id, { guestName: '   ' }));

  assert.equal(res.status, 400);
  assert.deepEqual(fields(await res.json()), ['guestName']);
});

test('email неверного формата даёт 400 по полю guestEmail', async () => {
  const id = await createEventType(server.baseUrl, { durationMinutes: 30 });

  for (const guestEmail of ['not-an-email', 'ivan@example', 'ivan example.com']) {
    const res = await postBooking(server.baseUrl, bookingBody(id, { guestEmail }));

    assert.equal(res.status, 400, `ожидали 400 для email «${guestEmail}»`);
    assert.deepEqual(fields(await res.json()), ['guestEmail']);
  }
});

test('details собирается по всем невалидным полям разом', async () => {
  const id = await createEventType(server.baseUrl, { durationMinutes: 30 });

  const res = await postBooking(
    server.baseUrl,
    bookingBody(id, {
      date: '2026-10-19',
      start: '09:15',
      guestName: '   ',
      guestEmail: 'nope',
    }),
  );

  assert.equal(res.status, 400);
  assert.deepEqual(fields(await res.json()), [
    'date',
    'guestEmail',
    'guestName',
    'start',
  ]);
});
