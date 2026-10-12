import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import config from '../config.js';
import { openDatabase } from './index.js';

const schemaPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'schema.sql',
);

// Применяет schema.sql к базе. Механизм идемпотентный на уровне SQL:
// в схеме должны использоваться `CREATE TABLE IF NOT EXISTS` и т.п.
//
// Возвращает true, если были выполнены какие-то операторы, и false,
// если схема сейчас пуста (заглушка).
export function migrate(db, file = schemaPath) {
  const sql = readFileSync(file, 'utf8');

  // Убираем строчные комментарии, чтобы понять, есть ли реальные операторы.
  const meaningful = sql.replace(/--.*$/gm, '').trim();
  if (meaningful === '') {
    return false;
  }

  db.exec(sql);
  return true;
}

// CLI: `npm run migrate`
const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const db = openDatabase();
  const applied = migrate(db);
  db.close();

  console.log(
    applied
      ? `Схема применена к ${config.dbPath}`
      : 'Схема пуста, применять нечего.',
  );
}
