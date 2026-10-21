import { useCallback, useEffect, useState } from 'react'
import { Container, Stack, Title } from '@mantine/core'
import { bookingsList, errorMessage, unwrap } from '../../../shared/api'
import type { BookingListItem } from '../../../shared/api'
import { ListState } from '../../../shared/ui'
import { BookingsList } from './BookingsList'

// Страница «Предстоящие брони»: одна общая для обеих ролей — роль это
// интерфейс, а не доступ (docs/spec.md, «Маршруты и экраны»). Источник правды —
// сервер: список приходит целиком одним запросом `GET /api/bookings`.
export function BookingsPage() {
  const [bookings, setBookings] = useState<BookingListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Первый setState происходит уже после `await` — правило
  // react(set-state-in-effect) не срабатывает.
  const load = useCallback(async () => {
    try {
      const data = await unwrap(bookingsList({ throwOnError: true }))
      setBookings(data.bookings)
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught, 'Не удалось загрузить брони'))
    } finally {
      setLoading(false)
    }
  }, [])

  // Повторная загрузка по кнопке «Повторить»: спиннер включаем здесь, а не в
  // `load`, чтобы не трогать состояние синхронно внутри эффекта.
  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    void load()
  }, [load])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- первичная загрузка списка; состояние ставится уже после await
    void load()
  }, [load])

  return (
    <Container component="main" size="lg" py="xl">
      <Stack gap="xl">
        <Title order={1}>Предстоящие брони</Title>

        <ListState loading={loading} error={error} onRetry={reload}>
          <BookingsList bookings={bookings} />
        </ListState>
      </Stack>
    </Container>
  )
}
