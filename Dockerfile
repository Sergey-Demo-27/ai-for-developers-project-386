# syntax=docker/dockerfile:1

# Образ бэкенда: при запуске контейнера сервер стартует сам — сначала
# применяется идемпотентная схема БД, затем поднимается Express.
#
# Контекст сборки — корень репозитория (см. .dockerignore), поэтому пути
# начинаются с server/. Node 24 обязателен: проект использует node:sqlite.

FROM node:24-slim

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/app/data/prod.db
WORKDIR /app

# Только прод-зависимости (ajv, express); devDeps (oxlint, yaml) в рантайме
# не нужны. `npm start` не используется: CMD запускает node напрямую.
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY --chown=node:node server/src ./src

# Точка монтирования тома для SQLite: создаём заранее и отдаём пользователю
# node, чтобы том достался с нужными правами.
RUN mkdir -p /app/data && chown node:node /app/data

# Непривилегированный пользователь из базового образа.
USER node
EXPOSE 3000

# Проба готовности — тот же /health, что использует `npm run smoke`.
# Без curl: проверяем встроенным fetch.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Миграции идемпотентны (CREATE TABLE IF NOT EXISTS в schema.sql), поэтому
# их можно применять при каждом старте. `exec` заменяет sh на node, чтобы
# SIGTERM/SIGINT доходили до сервера и он завершался корректно.
CMD ["sh", "-c", "node src/db/migrate.js && exec node src/server.js"]
