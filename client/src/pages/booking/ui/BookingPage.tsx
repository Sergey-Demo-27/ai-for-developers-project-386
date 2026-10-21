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
import { ConfirmPanel } from './ConfirmPanel'
import { EventTypePicker } from './EventTypePicker'
import { InfoPanel } from './InfoPanel'
import { SlotsPanel } from './SlotsPanel'
import { SuccessPanel } from './SuccessPanel'

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

  // Шаг гостевого потока — состояние страницы, не URL: `/booking` — один маршрут.
  const [step, setStep] = useState<'select' | 'confirm' | 'success'>('select')
  // Имя и email живут на странице: после `409` гость возвращается к выбору слота,
  // и форма подтверждения должна открыться с уже введёнными данными.
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')

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

  // Слот заняли, пока гость заполнял форму: возвращаем к выбору слота, сбрасываем
  // слот и перезагружаем сетку. Тип, дата, имя и email сохраняются — гость
  // выбирает новый слот и продолжает, не вводя данные заново.
  const handleSlotTaken = useCallback(() => {
    setSelectedSlot(null)
    setStep('select')
    reloadSlots()
  }, [reloadSlots])

  // Успех: показываем карточку подтверждения. Слот не сбрасываем — его сбросит
  // «Забронировать ещё», когда гость вернётся к выбору.
  const handleSuccess = useCallback(() => setStep('success'), [])

  // «Забронировать ещё»: возврат к выбору, тип и дата сохраняются, слот и данные
  // гостя сбрасываются, сетка перезагружается (только что забронированный слот —
  // «Занято»).
  const handleBookAgain = useCallback(() => {
    setSelectedSlot(null)
    setGuestName('')
    setGuestEmail('')
    setStep('select')
    reloadSlots()
  }, [reloadSlots])

  const selectEventType = useCallback(
    (id: number) => {
      if (id === selectedEventTypeId) return
      setSelectedEventTypeId(id)
      setSelectedSlot(null)
      setSlotsDays([])
      setSlotsLoading(true)
      setSlotsError(null)
      setStep('select')
    },
    [selectedEventTypeId],
  )

  const selectDate = useCallback((date: string) => {
    setSelectedDate(date)
    setSelectedSlot(null)
  }, [])

  // Значения формы подтверждения поднимаются на страницу, чтобы пережить
  // возврат к выбору слота.
  const handleGuestChange = useCallback(
    (values: { guestName: string; guestEmail: string }) => {
      setGuestName(values.guestName)
      setGuestEmail(values.guestEmail)
    },
    [],
  )

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
            {typesError ? null : selectedEventType === null ? (
              <Paper radius="lg" p="xl" shadow="sm" withBorder h="100%">
                <Stack justify="space-between" h="100%" gap="md">
                  <Text c="dimmed">Выберите тип события</Text>
                  <BookingActions canContinue={false} />
                </Stack>
              </Paper>
            ) : step === 'success' ? (
              <SuccessPanel onBookAgain={handleBookAgain} />
            ) : step === 'confirm' &&
              selectedDate !== null &&
              selectedSlot !== null ? (
              <ConfirmPanel
                eventType={selectedEventType}
                date={selectedDate}
                slot={selectedSlot}
                guestName={guestName}
                guestEmail={guestEmail}
                onGuestChange={handleGuestChange}
                onEdit={() => setStep('select')}
                onSlotTaken={handleSlotTaken}
                onSuccess={handleSuccess}
              />
            ) : (
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
                      onContinue={() => setStep('confirm')}
                    />
                  </Grid.Col>
                </Grid>
              </ListState>
            )}
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  )
}
