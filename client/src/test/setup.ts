// Подключаем матчеры @testing-library/jest-dom к expect из Vitest
// (toBeInTheDocument, toHaveTextContent и т.д.).
// Файл указан в vite.config.ts → test.setupFiles.
import '@testing-library/jest-dom/vitest'
