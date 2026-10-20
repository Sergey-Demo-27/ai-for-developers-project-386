import { useCallback, useEffect, useState } from 'react'
import { Container, Stack, Title } from '@mantine/core'
import { errorMessage, eventTypesList, unwrap } from '../../../shared/api'
import type { EventType } from '../../../shared/api'
import { ListState } from '../../../shared/ui'
import { EventTypeForm } from './EventTypeForm'
import { EventTypeList } from './EventTypeList'

// Страница «Типы событий»: форма создания сверху, список ниже.
// Источник правды — сервер: после успешного создания список перезагружается
// запросом `GET`, а не вставляется оптимистично.
export function EventTypesPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Первый setState происходит уже после `await` — правило
  // react(set-state-in-effect) не срабатывает.
  const load = useCallback(async () => {
    try {
      const data = await unwrap(eventTypesList({ throwOnError: true }))
      setEventTypes(data.eventTypes)
      setError(null)
    } catch (caught) {
      setError(errorMessage(caught, 'Не удалось загрузить типы событий'))
    } finally {
      setLoading(false)
    }
  }, [])

  // Повторная загрузка по кнопке или после создания: спиннер включаем здесь,
  // а не в `load`, чтобы не трогать состояние синхронно внутри эффекта.
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
        <Title order={1}>Типы событий</Title>

        <EventTypeForm onCreated={reload} />

        <ListState loading={loading} error={error} onRetry={reload}>
          <EventTypeList eventTypes={eventTypes} />
        </ListState>
      </Stack>
    </Container>
  )
}
