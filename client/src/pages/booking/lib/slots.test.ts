import type { Day, Slot } from '../../../shared/api'
import { countAvailable, firstAvailableDate, visibleSlots } from './slots'

function slot(start: string, available: boolean): Slot {
  return { start, end: `${start.slice(0, 2)}:30`, available }
}

function day(date: string, slots: Slot[]): Day {
  return { date, slots }
}

describe('booking slot helpers', () => {
  it('считает свободные слоты дня', () => {
    const d = day('2026-10-15', [
      slot('09:00', true),
      slot('09:30', false),
      slot('10:00', true),
    ])

    expect(countAvailable(d)).toBe(2)
  })

  it('находит первый день окна со свободным слотом', () => {
    const days = [
      day('2026-10-15', [slot('09:00', false)]),
      day('2026-10-16', [slot('09:00', false), slot('09:30', true)]),
      day('2026-10-17', [slot('09:00', true)]),
    ]

    expect(firstAvailableDate(days)).toBe('2026-10-16')
  })

  it('возвращает null, когда свободных слотов нет ни в один день', () => {
    const days = [day('2026-10-15', [slot('09:00', false)])]

    expect(firstAvailableDate(days)).toBeNull()
  })

  it('скрывает прошедшие слоты сегодняшнего дня, включая начавшийся', () => {
    const d = day('2026-10-15', [
      slot('09:00', false),
      slot('10:00', true),
      slot('11:00', true),
    ])

    expect(visibleSlots(d, '2026-10-15', '10:00').map((s) => s.start)).toEqual([
      '11:00',
    ])
  })

  it('в другие дни показывает все слоты, включая занятые', () => {
    const d = day('2026-10-16', [slot('09:00', false), slot('10:00', true)])

    expect(visibleSlots(d, '2026-10-15', '10:00')).toHaveLength(2)
  })
})
