# Контракт API

Контракт API календаря звонков, описанный на [TypeSpec](https://typespec.io/).
Из него эмиттер `@typespec/openapi3` собирает OpenAPI-спецификацию
`openapi/openapi.yaml`. Эта же спецификация — вход для генерации клиентского
SDK во фронтенде (`npm run generate:api` в `client/`).

Разбор решений «почему так» (правило занятости, окно записи, коды ошибок) —
в [docs/spec.md](../docs/spec.md). Здесь — «что»: машиночитаемый контракт.

## Структура

```text
.
├── main.tsp              # сервис, префикс /api, теги, NoAuth
├── models/
│   ├── scalars.tsp       # LocalDate (YYYY-MM-DD), LocalTime (HH:MM)
│   ├── event-type.tsp
│   ├── slots.tsp
│   ├── booking.tsp
│   ├── responses.tsp     # конверты успешных ответов, Created<T>
│   └── errors.tsp        # конверт ошибки и шесть машинных кодов
├── routes/
│   ├── event-types.tsp
│   └── bookings.tsp
├── openapi/openapi.yaml  # генерируется, руками не правится
└── tspconfig.yaml
```

## Команды

```bash
npm install
npm run build   # tsp compile . → openapi/openapi.yaml
npm run lint    # tsp format --check + компиляция без записи файлов
```

Отформатировать `.tsp` (перезаписывает файлы):

```bash
npx tsp format "**/*.tsp"
```

После правки любого `.tsp` спецификацию нужно пересобрать и закоммитить:
`openapi/openapi.yaml` лежит в репозитории, а job `api` в CI падает, если
сгенерированный файл разошёлся с `.tsp` (`git diff --exit-code -- openapi`
после сборки).

## Что зафиксировано в контракте

Решения, которые видно только при чтении:

- **Префикс `/api`** задан один раз на namespace сервиса, тело — JSON,
  имена полей — camelCase. Тело успешного ответа — объект с единственным ключом,
  названным по ресурсу (`{ eventType }`, `{ eventTypes }`, `{ days }`,
  `{ booking }`, `{ bookings }`).
- **Авторизации нет** — `@useAuth(NoAuth)`: в спецификацию попадает
  `security: [{}]`, то есть «анонимный доступ разрешён». Роль («владелец»,
  «гость») — понятие интерфейса, а не доступ.
- **Конверт ошибки** — `{ error: { status, code, message, details? } }`.
  Разные коды при одном статусе живут разными моделями: на `400` в контракте
  два варианта (`validation_error` и `invalid_json`), поэтому OpenAPI описывает
  их через `anyOf`, а остальные статусы — конкретные модели
  (`EventTypeNotFoundErrorResponse`, `SlotTakenErrorResponse`, …).
- **`status` в теле** — числовой литерал (`type: number, enum: [400]`):
  так в спецификации зафиксировано точное значение, а не просто «целое число».
- **`:id` в `/event-types/{id}/slots`** смоделирован строкой, а не целым:
  по контракту нецелый `id` даёт `404 event_type_not_found`, а не `400`.
- **`500 internal_error`** объявлен у каждой операции — конверт ошибки един
  для всех маршрутов.
- **`GET /health`** — техническая проба готовности вне `/api`, в контракт не
  входит: ни в `paths`, ни в конверт ошибки.
- **OpenAPI 3.0** (`openapi-versions` в `tspconfig.yaml`). Переключение на 3.1 —
  одна строка в конфиге.

## Проверка сторонним линтером

В CI не запускается, чтобы не тянуть вторую зависимость, но спецификация
проходит её без ошибок:

```bash
npx @redocly/cli lint openapi/openapi.yaml
```

Остаются четыре осознанных предупреждения: нет `license` (лицензии у проекта
нет), сервер указывает на `localhost` (это локальная разработка), и у двух
GET-списков нет 4XX-ответа — по контракту его там и не бывает.
