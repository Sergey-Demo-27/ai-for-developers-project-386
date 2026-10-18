import { client } from './generated/client.gen'

// Базовый адрес API. По умолчанию — origin текущей страницы: запросы уходят
// на `/api/...` того же источника, в dev их перехватывает прокси Vite
// (client/vite.config.ts), в production они попадают на тот же хост.
// Абсолютного `http://localhost:3000` из `servers` в спецификации в браузере
// не используем — он бы потребовал CORS. Переопределяется переменной
// окружения VITE_API_BASE_URL.
export const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? globalThis.location.origin

client.setConfig({ baseUrl: apiBaseUrl })

export { client }
