# Календарь звонков


[![hexlet-check](https://github.com/Sergey-Demo-27/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/Sergey-Demo-27/ai-for-developers-project-386/actions)

Разработайте совместно с ИИ сервис для бронирования календаря

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## Стек

Бэкенд:

- **Node.js** v24 (Active LTS), ESM (`"type": "module"`)
- **Express** 5 — HTTP-сервер
- **SQLite** через встроенный модуль `node:sqlite` (без внешних сервисов)
- Тесты — встроенный `node:test`

Каркас использует только возможности платформы Node.js и одну зависимость
(Express): dev-режим через `node --watch`, переменные окружения через
`--env-file-if-exists`, тесты через `node --test`.

Фронтенд:

- **Vite** 8 — сборка и dev-сервер
- **React** 19 + **TypeScript** 6
- **Mantine** 9 — UI-библиотека (`@mantine/core`, `@mantine/hooks`,
  `@mantine/form`, `@mantine/dates`, `@mantine/notifications`,
  `@mantine/modals`)
- **PostCSS** с `postcss-preset-mantine` (конфиг `client/postcss.config.cjs`)
- Линтер — **oxlint**
- Тесты — **Vitest** (окружение jsdom + Testing Library)

Контракт API:

- **TypeSpec** 1.17 — описание эндпоинтов, моделей и ошибок (`api/`)
- **OpenAPI** 3.0 — генерируется эмиттером `@typespec/openapi3`
  в `api/openapi/openapi.yaml`

> Примечание: API `node:sqlite` синхронный и в Node 24 помечен как
> experimental, поэтому при работе может выводиться соответствующее
> предупреждение. Для учебного проекта это осознанный компромисс.

## Структура проекта

```text
.
├── server/          # бэкенд (Node.js + Express) — самодостаточный проект
│   ├── src/
│   ├── test/
│   ├── package.json
│   └── .env.example
├── client/          # фронтенд (Vite + React + TypeScript) — отдельный проект
│   ├── src/
│   │   ├── app/     # провайдеры, тема, глобальные стили, композиция
│   │   ├── pages/   # страницы (landing)
│   │   ├── widgets/ # самостоятельные UI-блоки (header)
│   │   └── main.tsx # точка входа Vite
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── api/             # контракт API — отдельный проект на TypeSpec
│   ├── main.tsp     # сервис, префикс /api, теги
│   ├── models/      # модели данных и конверт ошибки
│   ├── routes/      # эндпоинты
│   ├── openapi/     # openapi.yaml — генерируется, руками не правится
│   ├── tspconfig.yaml
│   └── package.json
└── README.md
```

Бэкенд, фронтенд и контракт API — три независимых npm-проекта. Фронтенд во время
разработки ходит к API через dev-прокси Vite (`/api` → `http://localhost:3000`),
поэтому CORS настраивать не нужно.

Фронтенд разложен по методологии
[Feature-Sliced Design](https://feature-sliced.design/): слои
`app → pages → widgets → shared`. Слайс импортирует только слои ниже и только
через свой публичный API (`index.ts`). Слои и слайсы появляются по мере
необходимости, без пустых заготовок.

## Установка

Нужен Node.js v24. Если используете nvm: `nvm use`.

Бэкенд:

```bash
git clone https://github.com/Sergey-Demo-27/ai-for-developers-project-386.git
cd ai-for-developers-project-386/server
npm install
cp .env.example .env
npm run migrate
```

Фронтенд (при необходимости — отдельно):

```bash
cd ai-for-developers-project-386/client
npm install
```

Переменные окружения (см. `server/.env.example`):

- `PORT` — порт HTTP-сервера (по умолчанию `3000`)
- `DB_PATH` — путь к файлу базы SQLite (по умолчанию `./data/dev.db`)
- `NODE_ENV` — окружение: `development` | `production` | `test`

## Использование

Из корня репозитория — единая команда генерации по всему контракту:

```bash
npm run generate:api        # api → openapi.yaml → server/src/generated + client/src/shared/api/generated
npm run generate:api:check  # то же + проверка, что сгенерированное закоммичено
```

Бэкенд — команды из папки `server/`:

```bash
npm run dev     # запуск с автоперезапуском (node --watch)
npm start       # обычный запуск
npm test        # тесты (node --test)
npm run lint    # линтер oxlint
npm run smoke   # дымовой тест: сервер поднимается и отвечает на /health
npm run generate:api  # пересобрать серверные артефакты из ../api/openapi/openapi.yaml
npm run coverage
```

Приложение отдаёт `GET /health` → `200 { "status": "ok" }`. Дымовой тест
поднимает реальный сервер и ждёт ответа этого эндпоинта.

В CI (`.github/workflows/ci.yml`) на каждый push и pull request запускаются
четыре job-а: `server` (`npm ci` → `lint` → проверка, что серверные артефакты
не устарели → `test` → `migrate` → `smoke`),
`client` (`npm ci` → `lint` → `test` → `build` → проверка, что клиентский SDK
не устарел), `api` (`npm ci` → `lint` → `build` → проверка, что `openapi.yaml`
не устарел) и `commitlint` (проверка сообщений коммитов).

Фронтенд — команды из папки `client/`:

```bash
npm run dev      # dev-сервер Vite (http://localhost:5173) с HMR
npm run build    # production-сборка (tsc -b && vite build) в dist/
npm run preview  # локальный предпросмотр production-сборки
npm run lint     # линтер oxlint
npm test         # тесты Vitest (разовый прогон)
npm run test:watch  # тесты в watch-режиме
npm run coverage    # тесты с отчётом покрытия (папка coverage/)
npm run generate:api  # пересобрать клиентский SDK из api/openapi/openapi.yaml
```

Для разработки запустите оба проекта: бэкенд на `:3000`, фронтенд на `:5173`.
Запросы фронтенда к `/api/...` проксируются на бэкенд.

## API-контракт

Контракт API описан на **TypeSpec** в `api/` и из него генерируется
OpenAPI-спецификация `api/openapi/openapi.yaml`. Спецификация закоммичена, чтобы
дифф контракта был виден в пул-реквестах, и **не редактируется руками**: правки
вносятся в `.tsp`, после чего файл пересобирается.

Команды из папки `api/`:

```bash
npm install
npm run build    # пересобрать openapi/openapi.yaml из .tsp
npm run lint     # формат .tsp (tsp format --check) + компиляция без записи файлов
```

Разбор контракта по решениям и правилам (почему 409, а не 422, как считается
занятость, что значит «свободный слот») — в [docs/spec.md](./docs/spec.md).
`docs/spec.md` остаётся источником правды по «почему», `api/` — по «что».

Технический `GET /health` — проба готовности вне `/api`, в контракт он не входит
и единый конверт ошибки на него не распространяется.

Проверить сгенерированный файл сторонним линтером можно так (в CI не запускается,
чтобы не тянуть лишнюю зависимость):

```bash
npx @redocly/cli lint api/openapi/openapi.yaml
```

Он валиден; остаются четыре осознанных предупреждения: нет поля `license`
(лицензии у проекта пока нет), сервер указывает на `localhost`, и у двух
GET-списков нет 4XX-ответа — по контракту его там и не бывает.

### Единая команда генерации

Всю цепочку — сборку `openapi.yaml` из `.tsp` и пересборку серверных артефактов
и клиентского SDK — можно повторить одной командой из корня репозитория:

```bash
npm run generate:api        # api → openapi.yaml → server/src/generated + client/src/shared/api/generated
npm run generate:api:check  # то же + проверка, что сгенерированное закоммичено
```

Команда по очереди вызывает скрипты трёх проектов
(`npm --prefix api run build`, затем `server` и `client`), поэтому порядок шагов
зафиксирован: оба генератора читают уже собранный `openapi.yaml`. Перед первым
запуском нужны зависимости во всех трёх проектах — `npm ci` в `api/`, `server/`
и `client/`; корневой `node_modules` для этого не требуется.

### Клиентский SDK

Из той же спецификации генерируется клиентский SDK: `@hey-api/openapi-ts`
читает `api/openapi/openapi.yaml` и создаёт типы и методы на каждую операцию
(`eventTypesList`, `bookingsCreate`, …) в `client/src/shared/api/generated/`.

```bash
cd client
npm run generate:api   # пересобрать SDK из ../api/openapi/openapi.yaml
```

(Всю цепочку целиком — из корня: `npm run generate:api`, см.
[«Единая команда генерации»](#единая-команда-генерации).)

Сгенерированный код закоммичен и **не редактируется руками** — правка начинается
с `.tsp`. Изменили контракт — пересоберите `openapi.yaml` (в `api/`) и SDK
(в `client/`) и закоммитьте оба файла: job `client` в CI падает, если SDK
разошёлся со спецификацией.

Работать с SDK принято через публичный API слоя —
`client/src/shared/api/index.ts`: он отдаёт настроенный клиент (базовый адрес
берётся из `origin` страницы, переопределяется `VITE_API_BASE_URL`) и методы
операций. Тесты `client/src/shared/api/index.test.ts` с замоканным `fetch`
проверяют, что фронтенд действительно ходит в `/api/...` через сгенерированные
методы; страницы, использующие SDK, появятся вместе с первыми реальными
маршрутами.

### Серверные артефакты

Из той же спецификации генерируются и серверные артефакты — типы, проверка
запросов и заготовки маршрутов. Скрипт `server/scripts/generate-api.mjs` читает
`api/openapi/openapi.yaml` и пишет в `server/src/generated/`:

- `spec.js` — схемы `components.schemas` и список операций;
- `types.js` — JSDoc-типы на каждую схему контракта;
- `routes.js` — фабрика `createApiRouter(handlers)`: маршруты и валидация по контракту, реализация — по `operationId`.

```bash
cd server
npm run generate:api   # пересобрать src/generated из ../api/openapi/openapi.yaml
```

(Всю цепочку целиком — из корня: `npm run generate:api`, см.
[«Единая команда генерации»](#единая-команда-генерации).)

Сгенерированный код закоммичен и **не редактируется руками** — правка начинается
с `.tsp`. Изменили контракт — пересоберите `openapi.yaml` (в `api/`), серверные
артефакты (в `server/`) и клиентский SDK (в `client/`) и закоммитьте всё: job
`server` в CI падает, если `src/generated` разошёлся со спецификацией.

**Проверка запросов** — `server/src/middleware/validate.js`: тела запросов
проверяются по схемам из `spec.js` через Ajv, а ошибка собирается в единый
конверт `400 validation_error` с `details` по всем невалидным полям сразу.
Правила уровня схемы (обязательные поля, типы, длины, границы, форматы) приходят
из контракта; смысловые правила, которые в схему не выражаются (trim, окно
записи, реальность слота), остаются в обработчиках.

**Маршруты** из `routes.js` собираются фабрикой `createApiRouter(handlers)`
и монтируются в `server/src/app.js`. Пути и валидация тел приходят из
контракта; реализация — из `server/src/routes/index.js` по `operationId`
(`{ EventTypes_list, EventTypes_create, … }`). Операции без обработчика
отвечают `501 not_implemented`, поэтому частично реализованный API честно
сообщает, что ещё не написано.

## Соглашение о коммитах

Сообщения коммитов следуют спецификации
[Conventional Commits](https://www.conventionalcommits.org/ru/v1.0.0/)
(`feat:`, `fix:`, `docs:` и т.д.). Формат проверяется автоматически: локально —
`commit-msg` хуком, в CI — job `commitlint`. Полное описание формата, список
типов и областей — в [CONTRIBUTING.md](./CONTRIBUTING.md).

Инструменты проверки живут в корневом `package.json` (отдельно от `server/`,
`client/` и `api/`):

```bash
npm install          # ставит commitlint/husky и активирует хук commit-msg
npm run lint:last    # проверить сообщение последнего коммита
```

Схема базы данных лежит в `server/src/db/schema.sql` и наполняется по мере
реализации: сейчас есть таблицы `event_types` и `bookings`; остальные появятся
вместе с функционалом проекта.

<!-- Добавьте примеры запуска и запись asciinema — именно это смотрит работодатель -->

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
