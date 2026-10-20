// Константы путей приложения — общий источник истины для роутера, шапки и страниц.
// Живут в shared, потому что на них ссылаются и widgets/header, и pages/landing:
// импорт вверх по слоям FSD запрещён, а дублировать строки не хочется.
export const routes = {
  landing: '/',
  booking: '/booking',
  bookings: '/bookings',
  eventTypes: '/event-types',
} as const
