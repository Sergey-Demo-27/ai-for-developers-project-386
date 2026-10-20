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

// jsdom не реализует ResizeObserver, а Mantine использует его в ScrollArea.
if (typeof window.ResizeObserver !== 'function') {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof window.ResizeObserver
}
