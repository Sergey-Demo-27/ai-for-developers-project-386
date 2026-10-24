import dayjs from 'dayjs'
// Локаль `ru` для подписей дат. Сторонняя, но нужна и календарю, и подписям:
// без импорта dayjs остаётся на английском.
import 'dayjs/locale/ru'

// Формат даты контракта (`LocalDate`) — календарная дата без таймзоны.
const DATE_FORMAT = 'YYYY-MM-DD'
// Формат времени контракта (`LocalTime`).
const TIME_FORMAT = 'HH:mm'

// Длительность слота — константа: слоты всегда по 30 минут (та же величина,
// что `SLOT_MINUTES` на сервере). Тип события длительность больше не задаёт.
export const SLOT_MINUTES = 30

// Сегодняшняя дата в локальных настенных часах (ADR 0002) — та же, что у сервера.
export function todayString(now: Date = new Date()): string {
  return dayjs(now).format(DATE_FORMAT)
}

// Текущее время в `HH:MM` — по нему отсекаем прошедшие слоты сегодняшнего дня.
export function currentTimeString(now: Date = new Date()): string {
  return dayjs(now).format(TIME_FORMAT)
}

// Подпись даты для панели «Информация»: «суббота, 28 марта».
export function formatDayLabel(date: string): string {
  return dayjs(date).locale('ru').format('dddd, D MMMM')
}

// Интервал слота: «09:30 - 10:00» (дефис с пробелами, как в макете).
export function formatSlotRange(start: string, end: string): string {
  return `${start} - ${end}`
}

// Минуты между началом и концом слота (`HH:MM`) — из них складывается
// длительность брони, когда тип события в списке не отдан.
export function minutesBetween(start: string, end: string): number {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  return toMinutes(end) - toMinutes(start)
}

// Момент создания брони для списка: «27.03.2026, 14:40». `createdAt` — момент
// времени (UTC-инстант в контракте), показываем его по локальным настенным
// часам зрителя, как и остальные даты приложения (ADR 0002).
export function formatCreatedAt(createdAt: string): string {
  return dayjs(createdAt).format('DD.MM.YYYY, HH:mm')
}

// Длительность типа события: «30 мин».
export function formatDuration(minutes: number): string {
  return `${minutes} мин`
}

// Число месяца — для ячейки календаря: `renderDay` подменяет содержимое дня
// целиком, поэтому число рисуем сами.
export function dayOfMonth(date: string): number {
  return dayjs(date).date()
}
