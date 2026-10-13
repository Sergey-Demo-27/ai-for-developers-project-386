// Подключаем матчеры @testing-library/jest-dom к expect из Vitest
// (toBeInTheDocument, toHaveTextContent и т.д.).
// Файл указан в vite.config.ts → test.setupFiles.
import '@testing-library/jest-dom/vitest'

// jsdom не реализует matchMedia, а Mantine использует его для цветовой схемы.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
