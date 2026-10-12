import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import config from '../config.js';

// Открывает соединение с SQLite. Для файловой базы создаёт недостающую
// директорию, чтобы `npm run migrate` работал на чистом клоне репозитория.
//
// Внимание: API node:sqlite синхронный — запросы блокируют event loop.
// Для учебного проекта это приемлемый компромисс (см. README).
export function openDatabase(path = config.dbPath) {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new DatabaseSync(path);

  // WAL повышает параллелизм чтения/записи; для :memory: просто игнорируется.
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  return db;
}
