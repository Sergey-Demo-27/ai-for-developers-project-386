import { Paper, Stack, Text } from '@mantine/core'
import { Calendar } from '@mantine/dates'
import type { Day } from '../../../shared/api'
import { dayOfMonth, formatDayLabel } from '../../../shared/lib'
import { countAvailable } from '../lib/slots'

type CalendarPanelProps = {
  days: Day[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
}

// Панель «Календарь». `Calendar` из `@mantine/dates` — месячная сетка со
// стрелками, но без собственной логики выбора: день держим в состоянии страницы
// и подсвечиваем через `getDayProps`. Окно записи — `minDate`/`maxDate`: они же
// сами гасят стрелки на его границах. В ячейке — число и счётчик «N св.».
export function CalendarPanel({
  days,
  selectedDate,
  onSelectDate,
}: CalendarPanelProps) {
  const freeByDate = new Map(days.map((day) => [day.date, countAvailable(day)]))
  const minDate = days[0]?.date
  const maxDate = days[days.length - 1]?.date

  return (
    <Paper
      component="section"
      aria-label="Календарь"
      radius="lg"
      p="lg"
      shadow="sm"
      withBorder
      h="100%"
    >
      <Calendar
        locale="ru"
        size="md"
        defaultDate={minDate}
        minDate={minDate}
        maxDate={maxDate}
        maxLevel="month"
        highlightToday
        ariaLabels={{
          previousMonth: 'Предыдущий месяц',
          nextMonth: 'Следующий месяц',
        }}
        getDayProps={(date) => ({
          selected: date === selectedDate,
          onClick: () => onSelectDate(date),
        })}
        getDayAriaLabel={(date) => {
          const free = freeByDate.get(date)
          const label = formatDayLabel(date)
          return free === undefined ? label : `${label}, свободно ${free}`
        }}
        renderDay={(date) => {
          const free = freeByDate.get(date)

          return (
            <Stack gap={0} align="center" justify="center">
              <Text size="sm" lh={1}>
                {dayOfMonth(date)}
              </Text>
              {free !== undefined && (
                <Text size="10px" c="dimmed" lh={1.2}>
                  {free} св.
                </Text>
              )}
            </Stack>
          )
        }}
      />
    </Paper>
  )
}
