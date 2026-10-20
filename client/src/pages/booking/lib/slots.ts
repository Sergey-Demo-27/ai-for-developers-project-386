import type { Day, Slot } from '../../../shared/api'

// Свободные слоты дня — по единственному определению из контракта: `available`.
export function countAvailable(day: Day): number {
  return day.slots.filter((slot) => slot.available).length
}

// Первый день окна, в котором есть свободный слот, — его календарь подсвечивает
// сам, как только выбран тип. Нет ни одного — подсвечивать нечего.
export function firstAvailableDate(days: Day[]): string | null {
  return days.find((day) => day.slots.some((slot) => slot.available))?.date ?? null
}

// Слоты дня для показа. Прошедшие сегодняшние слоты не выводятся вовсе:
// они не Занятые, а недоступные по времени, и третьего ярлыка для них нет.
// Занятые слоты остаются в списке — их видно, но выбрать нельзя.
export function visibleSlots(day: Day, today: string, now: string): Slot[] {
  if (day.date !== today) return day.slots
  return day.slots.filter((slot) => slot.start > now)
}
