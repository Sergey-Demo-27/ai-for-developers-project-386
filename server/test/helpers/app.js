import { once } from 'node:events';
import createApp from '../../src/app.js';
import { openDatabase } from '../../src/db/index.js';

// Поднимает приложение на in-memory БД и произвольном свободном порту.
// Возвращает baseUrl для глобального fetch и функцию закрытия ресурсов.
export async function startTestServer() {
  const db = openDatabase(':memory:');
  const app = createApp({ db });

  const server = app.listen(0);
  await once(server, 'listening');

  const { port } = server.address();

  return {
    db,
    baseUrl: `http://127.0.0.1:${port}`,
    async close() {
      if (server.listening) {
        await new Promise((resolve) => server.close(resolve));
      }
      db.close();
    },
  };
}
