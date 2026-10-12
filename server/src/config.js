// Конфигурация приложения.
//
// Значения читаются из process.env. Файл .env подхватывается самим Node.js
// через флаг `--env-file-if-exists=.env` (см. scripts в package.json), поэтому
// сторонний пакет dotenv не нужен.

const port = Number.parseInt(process.env.PORT ?? '3000', 10);

if (Number.isNaN(port)) {
  throw new Error('Переменная окружения PORT должна быть числом');
}

export const config = Object.freeze({
  port,
  dbPath: process.env.DB_PATH ?? './data/dev.db',
  nodeEnv: process.env.NODE_ENV ?? 'development',
});

export default config;
