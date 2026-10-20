import { useCallback, useEffect, useRef, useState } from 'react'
import { Container, Grid, Paper, Stack, Text, Title } from '@mantine/core'
import {
  errorMessage,
  eventTypeSlotsList,
  eventTypesList,
  unwrap,
} from '../../../shared/api'
import type { Day, EventType, Slot } from '../../../shared/api'
import { ListState } from '../../../shared/ui'
import { countAvailable, firstAvailableDate } from '../lib/slots'
import { BookingActions } from './BookingActions'
import { CalendarPanel } from './CalendarPanel'
import { EventTypePicker } from './EventTypePicker'
import { InfoPanel } from './InfoPanel'
import { SlotsPanel } from './SlotsPanel'

// Экран записи на звонок. Шаги гостевого потока — состояния одного маршрута
// `/booking`; этот срез покрывает выбор типа, даты и слота. Выбор живёт в
// состоянии страницы, не в URL: перезагрузка — чистый старт.
export function BookingPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [typesLoading, setTypesLoading] = useState(true)
  const [typesError, setTypesError] = useState<string | null>(null)

  const [selectedEventTypeId, setSelectedEventTypeId] = useState<number | null>(
    null,
  )
  const [slotsDays, setSlotsDays] = useState<Day[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  const slotsRequestId = useRef(0)

  const selectedEventType =
    eventTypes.find((eventType) => eventType.id === selectedEventTypeId) ?? null
  const selectedDay =
    slotsDays.find((day) => day.date === selectedDate) ?? null

  // Первый setState — уже после `await`: правило react(set-state-in-effect)
  // не срабатывает.
  const loadEventTypes = useCallback(async () => {
    try {
      const data = await unwrap(eventTypesList({ throwOnError: true }))
      setEventTypes(data.eventTypes)
      setTypesError(null)
    } catch (caught) {
      setTypesError(errorMessage(caught, 'Не удалось загрузить типы событий'))
    } finally {
      setTypesLoading(false)
    }
  }, [])

  const loadSlots = useCallback(async (id: number) => {
    // Номер запроса: при быстрой смене типа ответ на прежний тип приходит позже
    // и не должен перетирать сетку нового.
    const requestId = slotsRequestId.current + 1
    slotsRequestId.current = requestId

    try {
      const data = await unwrap(
        eventTypeSlotsList({ path: { id: String(id) }, throwOnError: true }),
      )
      if (requestId !== slotsRequestId.current) return

      setSlotsDays(data.days)
      // Дата подсвечивается сама, только если ещё не выбрана: смена типа
      // сохраняет выбранную дату, а слот сбрасывает.
      setSelectedDate((previous) => previous ?? firstAvailableDate(data.days))
      setSlotsError(null)
    } catch (caught) {
      if (requestId !== slotsRequestId.current) return
      setSlotsError(errorMessage(caught, 'Не удалось загрузить слоты'))
    } finally {
      if (requestId === slotsRequestId.current) setSlotsLoading(false)
    }
  }, [])

  const reloadEventTypes = useCallback(() => {
    setTypesLoading(true)
    setTypesError(null)
    void loadEventTypes()
  }, [loadEventTypes])

  const reloadSlots = useCallback(() => {
    if (selectedEventTypeId === null) return
    setSlotsLoading(true)
    setSlotsError(null)
    void loadSlots(selectedEventTypeId)
  }, [loadSlots, selectedEventTypeId])

  const selectEventType = useCallback(
    (id: number) => {
      if (id === selectedEventTypeId) return
      setSelectedEventTypeId(id)
      setSelectedSlot(null)
      setSlotsDays([])
      setSlotsLoading(true)
      setSlotsError(null)
    },
    [selectedEventTypeId],
  )

  const selectDate = useCallback((date: string) => {
    setSelectedDate(date)
    setSelectedSlot(null)
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- первичная загрузка списка; состояние ставится уже после await
    void loadEventTypes()
  }, [loadEventTypes])

  useEffect(() => {
    if (selectedEventTypeId === null) return
    // oxlint-disable-next-line react/set-state-in-effect -- сетка слотов выбранного типа; состояние ставится уже после await
    void loadSlots(selectedEventTypeId)
  }, [selectedEventTypeId, loadSlots])

  const freeCount = selectedDay ? countAvailable(selectedDay) : 0
  const canContinue =
    selectedEventType !== null &&
    selectedDate !== null &&
    selectedSlot !== null &&
    selectedSlot.available

  return (
    <Container component="main" size="lg" py="xl">
      <Stack gap="xl">
        <Title order={1}>Запись на звонок</Title>

        <ListState
          loading={typesLoading}
          error={typesError}
          onRetry={reloadEventTypes}
        >
          <EventTypePicker
            eventTypes={eventTypes}
            selectedId={selectedEventTypeId}
            onSelect={selectEventType}
            onReload={reloadEventTypes}
          />
        </ListState>

        <Grid>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <InfoPanel
              eventType={selectedEventType}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              freeCount={freeCount}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 8 }}>
            {typesError ? null : selectedEventType ? (
              <ListState
                loading={slotsLoading}
                error={slotsError}
                onRetry={reloadSlots}
              >
                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <CalendarPanel
                      days={slotsDays}
                      selectedDate={selectedDate}
                      onSelectDate={selectDate}
                    />
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <SlotsPanel
                      day={selectedDay}
                      selectedDate={selectedDate}
                      selectedSlot={selectedSlot}
                      onSelectSlot={setSelectedSlot}
                      canContinue={canContinue}
                    />
                  </Grid.Col>
                </Grid>
              </ListState>
            ) : (
              <Paper radius="lg" p="xl" shadow="sm" withBorder h="100%">
                <Stack justify="space-between" h="100%" gap="md">
                  <Text c="dimmed">Выберите тип события</Text>
                  <BookingActions canContinue={false} />
                </Stack>
              </Paper>
            )}
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  )
}
