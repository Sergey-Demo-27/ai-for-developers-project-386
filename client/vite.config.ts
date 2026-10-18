import react from '@vitejs/plugin-react'
// defineConfig из vitest/config — та же функция, что и из vite, но с типами
// для секции test (конфиг Vitest живёт здесь же, в vite.config.ts).
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Прокси на бэкенд: запросы к /api уходят на Express (server/).
    // Это убирает необходимость в CORS на этапе разработки.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    // jsdom даёт DOM-окружение — можно тестировать React-компоненты.
    environment: 'jsdom',
    // describe/it/expect доступны без импорта в каждом файле.
    globals: true,
    // Подключает матчеры @testing-library/jest-dom (toBeInTheDocument и др.).
    setupFiles: './src/test/setup.ts',
    // Ищем тесты только в src, чтобы не заходить в node_modules/dist.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/shared/api/generated/**',
      ],
    },
  },
})
