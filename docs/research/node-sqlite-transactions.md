# node:sqlite: транзакции, UNIQUE и гонка за слот

Research-заметка к тикету #16 (карта #3). Вопрос: достаточно ли UNIQUE-индекса,
чтобы гарантировать «на одно время — одна бронь», когда интервалы броней
пересекаются и могут иметь разную длительность, и что именно умеет встроенный
`node:sqlite` в Node 24.

Проверялось на Node **v24.0.0** (в песочнице доступна только эта версия 24.x;
`.nvmrc` репозитория — `24`, CI ставит Node по `.nvmrc`), SQLite
**3.49.1** (`sqlite_source_id` 2025-02-18). Все эксперименты — в
`/tmp/opencode/node-sqlite-exp`, воспроизводимы.

## Краткий ответ

- `node:sqlite` — **синхронный** API. `DatabaseSync` — это одно соединение;
  все запросы выполняются в вызывающем потоке и **блокируют event loop**
  ([Node docs](https://nodejs.org/docs/latest-v24.x/api/sqlite.html#class-databasesync)).
- Транзакции есть, но только через `db.exec('BEGIN' / 'COMMIT' / 'ROLLBACK')`
  ([SQLite: BEGIN](https://www.sqlite.org/lang_transaction.html)). Отдельного
  хелпера `db.transaction(fn)`, как в `better-sqlite3`, **нет**.
  Prepared statements — `db.prepare(sql)` + `run`/`get`/`all`/`iterate`.
- Нарушение UNIQUE бросает обычное `Error` с `code === 'ERR_SQLITE_ERROR'` и
  **`errcode === 2067`** (`SQLITE_CONSTRAINT_UNIQUE`); `message` —
  `UNIQUE constraint failed: <table>.<column>`. По умолчанию конфликт
  разрешается алгоритмом **ABORT**: откатывается только сам неудачный оператор,
  транзакция остаётся активной
  ([SQLite: ON CONFLICT](https://www.sqlite.org/lang_conflict.html)).
- UNIQUE-индекс (в т.ч. частичный) накладывает уникальность на **точные значения
  колонок**. Пересекающиеся интервалы разной длины не равны друг другу, поэтому
  UNIQUE-индекс **не может** выразить «нет пересечений» — проверка обязана жить
  рядом с вставкой (см. вывод ниже).
- `node:sqlite` синхронный, поэтому два «параллельных» запроса Express на одном
  соединении не выполняются одновременно. **Но** если между проверкой и вставкой
  есть `await`, запросы перемежаются на event loop и возникает классическая гонка
  check-then-insert (воспроизведена ниже).
- `busy_timeout` (`SQLITE_BUSY`, errcode 5) актуален при **нескольких соединениях
  или процессах** к одному файлу. На одном соединении в одном процессе он
  бесполезен, а вредит: ожидание синхронное и блокирует event loop.
- `journal_mode` по умолчанию `delete`; WAL даёт «читатели не блокируют писателя,
  писатель не блокирует читателей», но **писатель всегда один**
  ([SQLite: WAL](https://www.sqlite.org/wal.html)). Для `:memory:` режим остаётся
  `memory`, WAL игнорируется.

## Транзакции и prepared statements — что доступно

Поверхность `DatabaseSync`/`StatementSync` в 24.0.0 (проверено на живом Node):

```
DatabaseSync:  aggregate, applyChangeset, close, createSession,
               enableLoadExtension, exec, function, loadExtension,
               location, open, prepare  (+ геттер isTransaction)
StatementSync: all, columns, get, iterate, run,
               setAllowBareNamedParameters, setAllowUnknownNamedParameters,
               setReadBigInts, setReturnArrays
```

- `db.exec(sql)` — обёртка над `sqlite3_exec()`; принимает **несколько операторов**,
  ничего не возвращает. Так подаются `BEGIN`, `COMMIT`, `ROLLBACK`, `PRAGMA`
  ([Node docs: database.exec](https://nodejs.org/docs/latest-v24.x/api/sqlite.html#databaseexecsql)).
- `db.prepare(sql)` — обёртка над `sqlite3_prepare_v2()`; `run()` возвращает
  `{ changes, lastInsertRowid }`, `get()` — одну строку, `all()` — массив
  ([Node docs: database.prepare](https://nodejs.org/docs/latest-v24.x/api/sqlite.html#databasepreparesql-options)).
- Транзакции — обычный SQL. `BEGIN` без модификатора = `DEFERRED`; `BEGIN IMMEDIATE`
  сразу берёт блокировку записи (и может упасть с `SQLITE_BUSY`). Транзакции
  **не вкладываются**; для вложенности — `SAVEPOINT`/`RELEASE`/`ROLLBACK TO`
  ([SQLite: DEFERRED, IMMEDIATE, EXCLUSIVE](https://www.sqlite.org/lang_transaction.html#deferred_immediate_and_exclusive_transactions)).
- Есть геттер `db.isTransaction` (обёртка над `sqlite3_get_autocommit()`), но
  отдельного `transaction()`-хелпера нет.

Проверка на живом Node:

```
$ node -e "db.exec('BEGIN'); db.exec('BEGIN')"
nested BEGIN: ERR_SQLITE_ERROR cannot start a transaction within a transaction
$ node -e "db.exec('ROLLBACK')"
ROLLBACK w/o tx: ERR_SQLITE_ERROR cannot rollback - no transaction is active
# SAVEPOINT/ROLLBACK TO/RELEASE — работает
# BEGIN DEFERRED + INSERT + COMMIT — работает
```

Опции конструктора, важные здесь
([Node docs: new DatabaseSync](https://nodejs.org/docs/latest-v24.x/api/sqlite.html#new-databasesyncpath-options)):

| Опция | По умолчанию | Смысл |
| --- | --- | --- |
| `timeout` | `0` | busy timeout в мс |
| `enableForeignKeyConstraints` | `true` | FK включены (репозиторий дополнительно делает `PRAGMA foreign_keys = ON`) |
| `readOnly` | `false` | — |

## Нарушение UNIQUE: точный код ошибки

Вставка дубля по UNIQUE бросает `Error` (не кастомный класс):

```
UNIQUE error name:    Error
UNIQUE error code:    ERR_SQLITE_ERROR
UNIQUE errcode:       2067
UNIQUE errstr:        constraint failed
UNIQUE message:       UNIQUE constraint failed: t.name
```

- `2067` — это `SQLITE_CONSTRAINT_UNIQUE`
  ([SQLite: Result Codes](https://www.sqlite.org/rescode.html#constraint_unique)),
  расширенный (extended) код. `errstr` при этом обобщённый (`constraint failed`),
  а конкретика — в `message`.
- Для сравнения, FK-нарушение даёт `errcode 787` (`SQLITE_CONSTRAINT_FOREIGNKEY`),
  сообщение `FOREIGN KEY constraint failed`.
- Значит, чтобы отличить «слот занят» от прочих ошибок БД, надо проверять
  `err.errcode === 2067` (или разбирать `message`), а не только `err.code`.
- Дефолтный алгоритм разрешения конфликтов — **ABORT**: SQLite откатывает
  изменения **текущего оператора**, но сохраняет всё, что успели сделать
  предыдущие операторы транзакции, и сама транзакция остаётся открытой
  ([SQLite: ON CONFLICT → ABORT](https://www.sqlite.org/lang_conflict.html)).
  Проверено:

```
BEGIN
INSERT a            -> ok
INSERT a            -> ERR_SQLITE_ERROR / 2067
SELECT count(*)     -> 1   (первая вставка ещё видна внутри транзакции)
COMMIT              -> rows after commit: 1
```

Полезный приём вместо try/catch — `INSERT OR IGNORE ...` возвращает
`changes: 0`, если запись не вставилась (проверено: `changes 0`,
`lastInsertRowid: 1` — последний id сохраняется, на него полагаться нельзя).

## UNIQUE vs частичный UNIQUE-индекс

Обычный `CREATE UNIQUE INDEX` запрещает дубли по значению ключа; NULL'ы
считаются различными ([SQLite: Unique Indexes](https://www.sqlite.org/lang_createindex.html#unique_indexes)).
Частичный индекс (`... WHERE expr`) индексирует только подмножество строк, и
UNIQUE на нём действует **внутри этого подмножества**
([SQLite: Unique Partial Indexes](https://www.sqlite.org/partialindex.html#unique_partial_indexes)).

Пример: «одна активная бронь на слот» через частичный индекс —

```sql
CREATE UNIQUE INDEX ux_active_booking
  ON bookings(slot_id) WHERE status = 'booked';
```

Проверено: занятый слот дублировать нельзя (errcode 2067), а свободные записи
на тот же слот — можно. Это ровно тот случай, когда правило сводится к
**равенству колонки** (фиксированный слот).

**Но** пересечение интервалов — не равенство. Эксперимент: уникальный индекс
`(room, starts_at)` спокойно пропускает две брони 09:00–09:30 и 09:15–09:45:

```
overlapping intervals accepted by UNIQUE index: 2
```

У частичного индекса та же проблема: он фильтрует строки по `WHERE`, но не
умеет сравнивать диапазоны между собой. Выразить «нет пересечений `[start,end)`»
в терминах UNIQUE-индекса SQLite не может.

## Конкурентность и блокировки

Ключевой факт: `node:sqlite` **синхронный и однопоточный на соединение**. Нет
pool'а, нет асинхронного драйвера: каждый `run()/get()/exec()` доводится до конца
в текущем tick'е event loop. Отсюда:

- Если обработчик Express делает `проверка → вставка` **без `await` посередине**,
  перемежаться нечему — операция атомарна на уровне event loop.
- Если между проверкой и вставкой есть **любой `await`** (валидация, отправка
  письма, чтение body в другом слое), два запроса перемежаются. Воспроизведённая
  гонка (одно соединение, `await sleep(20)` между `SELECT` и `INSERT`):

```
req1 booked
req2 -> Error: UNIQUE constraint failed: bookings.starts_at
```

Оба запроса увидели «свободно»; UNIQUE поймал второго — но **только потому, что
ключ совпал точно**. При пересекающихся интервалах разной длины промахнулся бы и
UNIQUE, и в базе оказались бы две пересекающиеся брони.

### `SQLITE_BUSY`, `busy_timeout`, `journal_mode`

- По умолчанию `journal_mode = delete`, `busy_timeout = 0` (проверено:
  `PRAGMA busy_timeout` → `{ timeout: 0 }`).
- Два соединения к одному файлу, первый держит `BEGIN IMMEDIATE`: второй пишущий
  получает `ERR_SQLITE_ERROR`, **`errcode 5`** (`SQLITE_BUSY`),
  `errstr: database is locked`
  ([SQLite: SQLITE_BUSY](https://www.sqlite.org/rescode.html#busy)).
- `busy_timeout` заставляет SQLite спать и повторять попытку, пока не накопится
  заданное число мс, после чего всё равно вернётся `SQLITE_BUSY`
  ([SQLite: sqlite3_busy_timeout](https://www.sqlite.org/c3ref/busy_timeout.html)).
  **Сон синхронный** — event loop стоит.
- Опыт с `busy_timeout = 1000` на двух соединениях **в одном процессе**: писатель
  ждал ~1000 мс и всё равно упал с `SQLITE_BUSY` («после 1002 ms»), а `COMMIT`
  второго соединения смог выполниться только после этого («a committed after
  1010 ms»). Причина: пока одно соединение синхронно спит в busy-обработчике,
  код, который должен освободить блокировку, живёт на том же event loop и не
  может выполниться. **Внутри одного процесса busy_timeout не спасает.**
- WAL: «readers do not block writers and a writer does not block readers», но
  «there can only be one writer at a time»
  ([SQLite: WAL](https://www.sqlite.org/wal.html)). Репозиторий уже выставляет
  `PRAGMA journal_mode = WAL` в `server/src/db/index.js` — это разумно, если к
  файлу когда-нибудь будет обращаться второй процесс (CLI, миграции, тесты).
  Для `:memory:` WAL неприменим: `PRAGMA journal_mode` остаётся `memory`
  (проверено), так что вызов безвреден.

Когда что нужно:

| Сценарий | Нужен `busy_timeout`? |
| --- | --- |
| Одно соединение, один процесс (текущий Express) | Нет — нет второго писателя |
| Второй процесс/соединение к тому же файлу (CLI, тесты, миграции) | Да, умеренный (например 5000 мс) |
| Тесты на общем файле | Да, и/или изоляция по временным БД |

`busy_timeout` задаётся либо опцией конструктора `new DatabaseSync(path, { timeout: 5000 })`,
либо `PRAGMA busy_timeout = 5000`.

## Вывод: достаточно ли UNIQUE-индекса?

**Зависит от модели данных, но в общем случае UNIQUE-индекса недостаточно —
проверку пересечений надо делать в транзакции.**

1. **Если модель действительно «фиксированные слоты»** (как в `GLOSSARY.md`:
   слот — фиксированный 30-минутный интервал, время задаётся `slot_id`), то правило
   «на слот — одна активная бронь» сводится к **равенству колонки**. Здесь
   хватает частичного UNIQUE-индекса:
   `CREATE UNIQUE INDEX ... ON bookings(slot_id) WHERE status = 'booked'`.
   База сама гарантирует инвариант даже при гонке; обработчику остаётся поймать
   `errcode 2067` и вернуть 409/«слот занят».

2. **Если у брони произвольные `[starts_at, ends_at)` и интервалы могут
   пересекаться, имея разную длину**, то UNIQUE (в т.ч. частичный) **не подходит**:
   он сравнивает значения колонок, а не диапазоны. Проверка обязана жить в
   **транзакции записи** вместе со вставкой, иначе два запроса между `SELECT` и
   `INSERT` прочитают «свободно» и создадут пересекающиеся брони:

   ```sql
   -- внутри BEGIN IMMEDIATE ... COMMIT
   SELECT id FROM bookings
    WHERE room = ? AND starts_at < ? AND ends_at > ?   -- new.ends, new.starts
    LIMIT 1;
   ```

   Предикат `existing.start < new.end AND existing.end > new.starts` — стандартное
   условие пересечения полуинтервалов `[start, end)`. `BEGIN IMMEDIATE` берёт
   блокировку записи сразу и сериализует конкурентные записи; для одного
   синхронного соединения достаточно и того, что весь блок «проверка+вставка»
   выполняется без `await`.

**Практическое правило для этого проекта.** Так как `node:sqlite` синхронный и
соединение одно:

- Держите «проверка + вставка» в **одной синхронной функции без `await` посередине**.
  Тогда на одном соединении она атомарна сама по себе.
- Оборачивайте её в `BEGIN IMMEDIATE`/`COMMIT` (`ROLLBACK` в `catch`) — это
  защищает, если позже появятся второе соединение, пул, второй процесс или
  случайный `await` внутри. Это дешёвая страховка.
- Никогда не делайте `await` между `BEGIN` и `COMMIT` на общем соединении: пока
  вы ждёте, в **ту же транзакцию** вклинятся операторы другого запроса.
- UNIQUE-индекс всё равно полезен как «последняя линия обороны» (и для
  фиксированных слотов — как основная). Нарушение ловите по `err.errcode === 2067`.
- `busy_timeout` для односоединённого Express не нужен; `journal_mode = WAL`
  оставьте — он безвреден для `:memory:` и полезен при втором процессе.

## Минимальный рабочий пример

Схема и проверка «нет пересечений» для произвольных интервалов:

```sql
CREATE TABLE IF NOT EXISTS bookings (
  id        INTEGER PRIMARY KEY,
  room      TEXT NOT NULL,
  starts_at TEXT NOT NULL,   -- ISO-8601, сравним лексикографически
  ends_at   TEXT NOT NULL,
  CHECK (starts_at < ends_at)
);
CREATE INDEX IF NOT EXISTS ix_bookings_room_time
  ON bookings(room, starts_at, ends_at);
```

Функция брони (один синхронный блок, транзакция IMMEDIATE, `ROLLBACK` при ошибке):

```js
// server/src/db/index.js — соединение открыто здесь, наружу отдаём db
export function bookRoom(db, { room, startsAt, endsAt }) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const clash = db
      .prepare(
        `SELECT id FROM bookings
          WHERE room = ? AND starts_at < ? AND ends_at > ?
          LIMIT 1`,
      )
      .get(room, endsAt, startsAt); // существующий.start < new.end && существующий.end > new.starts

    if (clash) {
      db.exec('ROLLBACK');
      return { ok: false, reason: 'conflict' };
    }

    const { lastInsertRowid } = db
      .prepare('INSERT INTO bookings(room, starts_at, ends_at) VALUES (?, ?, ?)')
      .run(room, startsAt, endsAt);

    db.exec('COMMIT');
    return { ok: true, id: Number(lastInsertRowid) };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
```

Проверено на v24.0.0: `09:00–09:30` → booked, `09:15–09:45` → conflict,
`09:30–10:00` → booked (касание границ не считается пересечением).

Вариант «фиксированный слот» — инвариант держит БД, обработчику остаётся
перевести ошибку в ответ:

```js
export function bookSlot(db, { slotId, guestName, guestEmail }) {
  try {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO bookings(slot_id, guest_name, guest_email, status)
              VALUES (?, ?, ?, 'booked')`,
      )
      .run(slotId, guestName, guestEmail);
    return { ok: true, id: Number(lastInsertRowid) };
  } catch (err) {
    if (err.errcode === 2067) return { ok: false, reason: 'slot_taken' }; // SQLITE_CONSTRAINT_UNIQUE
    throw err;
  }
}
```

## Источники

Node.js:

- Node.js v24 API, модуль `node:sqlite` — <https://nodejs.org/docs/latest-v24.x/api/sqlite.html>
  (статус модуля, `DatabaseSync`/`StatementSync`, `exec`, `prepare`, опция `timeout`,
  `enableForeignKeyConstraints`, `isTransaction`).
- Исходник модуля — <https://github.com/nodejs/node/blob/v24.0.0/lib/sqlite.js>.

SQLite:

- Транзакции, `BEGIN`/`COMMIT`/`SAVEPOINT`, DEFERRED/IMMEDIATE/EXCLUSIVE,
  `SQLITE_BUSY` при апгрейде до записи — <https://www.sqlite.org/lang_transaction.html>.
- `CREATE INDEX`, UNIQUE-индексы, NULL'ы уникальны — <https://www.sqlite.org/lang_createindex.html>.
- Частичные индексы и UNIQUE PARTIAL — <https://www.sqlite.org/partialindex.html>.
- ON CONFLICT: ABORT как поведение по умолчанию — <https://www.sqlite.org/lang_conflict.html>.
- `sqlite3_busy_timeout` — <https://www.sqlite.org/c3ref/busy_timeout.html>;
  `PRAGMA busy_timeout`/`journal_mode` — <https://www.sqlite.org/pragma.html#pragma_busy_timeout>.
- WAL: один писатель, читатели не блокируют писателя —
  <https://www.sqlite.org/wal.html>.
- Модель блокировок — <https://www.sqlite.org/lockingv3.html>.
- Расширенные коды: `SQLITE_CONSTRAINT_UNIQUE (2067)`, `SQLITE_BUSY (5)` —
  <https://www.sqlite.org/rescode.html>.
