import { useState } from 'react'
import { Alert, Button, Group, Paper, Stack, Text, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { ApiError, bookingsCreate, errorMessage, unwrap } from '../../../shared/api'
import type { EventType, Slot } from '../../../shared/api'
import { formatDayLabel, formatDuration, formatSlotRange, SLOT_MINUTES } from '../../../shared/lib'

type ConfirmPanelProps = {
  eventType: EventType
  date: string
  slot: Slot
  guestName: string
  guestEmail: string
  onGuestChange: (values: { guestName: string; guestEmail: string }) => void
  onEdit: () => void
  onSlotTaken: () => void
  onSuccess: () => void
}

type ConfirmValues = {
  guestName: string
  guestEmail: string
}

// Базовая проверка формата из спеки — та же, что на сервере: «что-то@что-то.что-то».
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Карточка «Подтверждение записи» — правый шаг гостевого потока вместо «Статуса
// слотов». «Изменить» возвращает к выбору слота, сохраняя тип, дату и слот.
// Значения формы поднимаются на страницу, чтобы пережить возврат к выбору слота
// (после `409` гость не вводит имя и email заново).
export function ConfirmPanel({
  eventType,
  date,
  slot,
  guestName,
  guestEmail,
  onGuestChange,
  onEdit,
  onSlotTaken,
  onSuccess,
}: ConfirmPanelProps) {
  const [banner, setBanner] = useState<string | null>(null)

  const form = useForm<ConfirmValues>({
    initialValues: { guestName, guestEmail },
    onValuesChange: onGuestChange,
    validate: {
      guestName: (value) => {
        if (value.trim().length === 0) return 'Введите имя'
        if (value.length > 100) return 'Не более 100 символов'
        return null
      },
      guestEmail: (value) => {
        if (!EMAIL_PATTERN.test(value)) return 'Укажите корректный email'
        if (value.length > 254) return 'Не более 254 символов'
        return null
      },
    },
  })

  const summary = [
    eventType.name,
    formatDuration(SLOT_MINUTES),
    formatDayLabel(date),
    formatSlotRange(slot.start, slot.end),
  ].join(' · ')

  const handleSubmit = form.onSubmit(async (values) => {
    setBanner(null)

    try {
      await unwrap(
        bookingsCreate({
          body: {
            eventTypeId: eventType.id,
            date,
            start: slot.start,
            guestName: values.guestName.trim(),
            guestEmail: values.guestEmail,
          },
          throwOnError: true,
        }),
      )
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError && error.code === 'validation_error') {
        for (const detail of error.details ?? []) {
          form.setFieldError(
            detail.field as keyof ConfirmValues,
            detail.message,
          )
        }
        setBanner(error.message)
        return
      }

      if (error instanceof ApiError && error.code === 'slot_taken') {
        notifications.show({
          title: 'Слот занят',
          message: 'Это время уже занято, выберите другой слот',
          color: 'red',
        })
        onSlotTaken()
        return
      }

      // 500 и сетевой сбой: введённое сохраняется, кнопка снова активна.
      notifications.show({
        title: 'Ошибка',
        message: errorMessage(error, 'Не удалось создать бронь'),
        color: 'red',
      })
    }
  })

  return (
    <Paper
      component="section"
      aria-label="Подтверждение записи"
      radius="lg"
      p="lg"
      shadow="sm"
      withBorder
      h="100%"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Group justify="flex-end">
            <Button type="button" variant="subtle" onClick={onEdit}>
              Изменить
            </Button>
          </Group>

          <Text fw={600}>{summary}</Text>

          {banner && (
            <Alert color="red" title="Проверьте поля">
              {banner}
            </Alert>
          )}

          <TextInput label="Имя" withAsterisk {...form.getInputProps('guestName')} />
          <TextInput
            label="Email"
            withAsterisk
            {...form.getInputProps('guestEmail')}
          />

          <Button
            type="submit"
            fullWidth
            disabled={!form.isValid()}
            loading={form.submitting}
          >
            Подтвердить запись
          </Button>
        </Stack>
      </form>
    </Paper>
  )
}
