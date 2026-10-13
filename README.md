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
└── README.md
```

Бэкенд и фронтенд — два независимых npm-проекта. Фронтенд во время разработки
ходит к API через dev-прокси Vite (`/api` → `http://localhost:3000`), поэтому
CORS настраивать не нужно.

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

Бэкенд — команды из папки `server/`:

```bash
npm run dev     # запуск с автоперезапуском (node --watch)
npm start       # обычный запуск
npm test        # тесты (node --test)
npm run lint    # линтер oxlint
npm run smoke   # дымовой тест: сервер поднимается и отвечает на /health
npm run coverage
```

Приложение отдаёт `GET /health` → `200 { "status": "ok" }`. Дымовой тест
поднимает реальный сервер и ждёт ответа этого эндпоинта.

В CI (`.github/workflows/ci.yml`) на каждый push и pull request запускаются три
job-а: `server` (`npm ci` → `lint` → `test` → `migrate` → `smoke`), `client`
(`npm ci` → `lint` → `test` → `build`) и `commitlint` (проверка сообщений
коммитов).

Фронтенд — команды из папки `client/`:

```bash
npm run dev      # dev-сервер Vite (http://localhost:5173) с HMR
npm run build    # production-сборка (tsc -b && vite build) в dist/
npm run preview  # локальный предпросмотр production-сборки
npm run lint     # линтер oxlint
npm test         # тесты Vitest (разовый прогон)
npm run test:watch  # тесты в watch-режиме
npm run coverage    # тесты с отчётом покрытия (папка coverage/)
```

Для разработки запустите оба проекта: бэкенд на `:3000`, фронтенд на `:5173`.
Запросы фронтенда к `/api/...` проксируются на бэкенд.

## Соглашение о коммитах

Сообщения коммитов следуют спецификации
[Conventional Commits](https://www.conventionalcommits.org/ru/v1.0.0/)
(`feat:`, `fix:`, `docs:` и т.д.). Формат проверяется автоматически: локально —
`commit-msg` хуком, в CI — job `commitlint`. Полное описание формата, список
типов и областей — в [CONTRIBUTING.md](./CONTRIBUTING.md).

Инструменты проверки живут в корневом `package.json` (отдельно от `server/` и
`client/`):

```bash
npm install          # ставит commitlint/husky и активирует хук commit-msg
npm run lint:last    # проверить сообщение последнего коммита
```

Схема базы данных лежит в `server/src/db/schema.sql` и пока пуста — таблицы
появятся вместе с описанием функционала проекта.

<!-- Добавьте примеры запуска и запись asciinema — именно это смотрит работодатель -->

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
