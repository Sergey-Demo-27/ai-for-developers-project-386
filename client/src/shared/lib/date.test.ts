import {
  currentTimeString,
  dayOfMonth,
  formatCreatedAt,
  formatDayLabel,
  formatDuration,
  formatSlotRange,
  minutesBetween,
  todayString,
} from './date'

describe('date helpers', () => {
  it('подписывает дату днём недели и числом', () => {
    expect(formatDayLabel('2026-03-28')).toBe('суббота, 28 марта')
  })

  it('показывает интервал слота дефисом с пробелами', () => {
    expect(formatSlotRange('09:30', '10:00')).toBe('09:30 - 10:00')
  })

  it('показывает длительность в минутах', () => {
    expect(formatDuration(30)).toBe('30 мин')
  })

  it('считает минуты между началом и концом слота', () => {
    expect(minutesBetween('09:30', '10:00')).toBe(30)
    expect(minutesBetween('09:00', '18:00')).toBe(540)
  })

  it('подписывает момент создания брони по локальным часам', () => {
    expect(formatCreatedAt('2026-03-27T14:40:00')).toBe('27.03.2026, 14:40')
  })

  it('берёт сегодняшнюю дату из локальных часов', () => {
    expect(todayString(new Date('2026-10-15T23:30:00'))).toBe('2026-10-15')
  })

  it('берёт текущее время в HH:MM', () => {
    expect(currentTimeString(new Date('2026-10-15T09:05:00'))).toBe('09:05')
  })

  it('берёт число месяца из даты', () => {
    expect(dayOfMonth('2026-10-15')).toBe(15)
  })
})
