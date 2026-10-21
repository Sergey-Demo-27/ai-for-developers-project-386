import { Link } from 'react-router'
import { Button, Paper, Stack, Text } from '@mantine/core'
import type { BookingListItem } from '../../../shared/api'
import {
  formatCreatedAt,
  formatDayLabel,
  formatDuration,
  formatSlotRange,
  minutesBetween,
} from '../../../shared/lib'
import { routes } from '../../../shared/routes'

// Карточка предстоящей брони: имя гостя, email, тип события, слот и момент
// создания (docs/spec.md, «Подтверждение, успех и список предстоящих броней»).
// Длительность берётся из интервала брони: в списке тип приходит одним именем.
function BookingCard({ booking }: { booking: BookingListItem }) {
  return (
    <Paper component="article" radius="lg" p="lg" shadow="sm" withBorder>
      <Stack gap={4}>
        <Text fw={600}>{booking.guestName}</Text>
        <Text size="sm" c="dimmed">
          {booking.guestEmail}
        </Text>
        <Text>
          {booking.eventTypeName} ·{' '}
          {formatDuration(minutesBetween(booking.start, booking.end))}
        </Text>
        <Text size="sm">
          Слот: {formatDayLabel(booking.date)},{' '}
          {formatSlotRange(booking.start, booking.end)}
        </Text>
        <Text size="sm" c="dimmed">
          Создано: {formatCreatedAt(booking.createdAt)}
        </Text>
      </Stack>
    </Paper>
  )
}

// Список предстоящих броней: вертикальные карточки в порядке ответа сервера
// (по возрастанию даты и времени). Пустая база — текст и кнопка «Записаться».
export function BookingsList({ bookings }: { bookings: BookingListItem[] }) {
  if (bookings.length === 0) {
    return (
      <Paper radius="lg" p="xl" shadow="sm" withBorder>
        <Stack gap="md" align="flex-start">
          <Text fw={600}>Предстоящих броней нет</Text>
          <Button component={Link} to={routes.booking}>
            Записаться
          </Button>
        </Stack>
      </Paper>
    )
  }

  return (
    <Stack gap="md">
      {bookings.map((booking) => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </Stack>
  )
}
