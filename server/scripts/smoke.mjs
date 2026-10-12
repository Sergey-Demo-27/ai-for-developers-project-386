// Дымовой тест: поднимает реальный сервер и ждёт ответа /health.
import { spawn } from 'node:child_process';
import process from 'node:process';

const PORT = process.env.PORT ?? '3000';
const URL = `http://127.0.0.1:${PORT}/health`;
const TIMEOUT_MS = 15_000;

const server = spawn(
  process.execPath,
  ['--env-file-if-exists=.env', 'src/server.js'],
  { stdio: 'inherit' },
);

let code = 1;
try {
  await waitForHealth();
  console.log(`OK: ${URL} ответил 200`);
  code = 0;
} catch (err) {
  console.error('Дымовой тест не прошёл:', err.message);
} finally {
  server.kill('SIGTERM');
}
process.exit(code);

async function waitForHealth() {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`сервер завершился до готовности (код ${server.exitCode})`);
    }
    try {
      const res = await fetch(URL);
      if (res.ok) return;
    } catch {
      // сервер ещё не слушает — пробуем снова
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`не дождались ответа ${URL} за ${TIMEOUT_MS} мс`);
}
