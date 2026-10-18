import { defineConfig } from '@hey-api/openapi-ts'

// Клиентский SDK собирается из OpenAPI-спецификации контракта
// (../api/openapi/openapi.yaml), а не пишется руками. Файлы в
// src/shared/api/generated создаёт генератор — их не редактируют.
//
// baseUrl пустой: адрес из `servers` в спецификации (http://localhost:3000)
// в браузере не годится — он бы потребовал CORS. Базовый адрес задаётся один
// раз в рантайме, в src/shared/api/client.ts (origin страницы или
// VITE_API_BASE_URL).
export default defineConfig({
  input: '../api/openapi/openapi.yaml',
  output: 'src/shared/api/generated',
  plugins: [
    '@hey-api/typescript',
    '@hey-api/sdk',
    {
      name: '@hey-api/client-fetch',
      baseUrl: '',
    },
  ],
})
