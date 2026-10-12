import process from 'node:process';
import config from './config.js';
import createApp from './app.js';
import { openDatabase } from './db/index.js';

const db = openDatabase();
const app = createApp({ db });

const server = app.listen(config.port, () => {
  console.log(
    `Сервер запущен: http://localhost:${config.port}/ (${config.nodeEnv})`,
  );
});

server.on('error', (err) => {
  console.error('Не удалось запустить сервер:', err);
  db.close();
  process.exit(1);
});

// Корректное завершение: перестаём принимать новые соединения,
// закрываем базу и выходим. Повторный сигнал игнорируем.
let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal}: завершение работы...`);

  server.close((err) => {
    db.close();
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });

  // Страховка: если close завис из-за долгих соединений.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
