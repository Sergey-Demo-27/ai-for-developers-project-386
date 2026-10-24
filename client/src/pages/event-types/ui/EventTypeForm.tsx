import { useState } from 'react'
import {
  Alert,
  Button,
  Paper,
  Stack,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { ApiError, errorMessage, eventTypesCreate, unwrap } from '../../../shared/api'

type EventTypeFormValues = {
  name: string
  description: string
}

const INITIAL_VALUES: EventTypeFormValues = {
  name: '',
  description: '',
}

// Форма создания типа события. Идентификатор генерирует система — поля для
// него нет; длительности у типа тоже нет: слоты всегда по 30 минут (константа
// `SLOT_MINUTES`). Клиентские правила совпадают с серверными (#8);
// `400 validation_error` дополнительно раскладывается по полям из `details`.
export function EventTypeForm({ onCreated }: { onCreated: () => void }) {
  const [banner, setBanner] = useState<string | null>(null)

  const form = useForm<EventTypeFormValues>({
    initialValues: INITIAL_VALUES,
    validate: {
      name: (value) => {
        if (value.trim().length === 0) return 'Введите название'
        if (value.length > 100) return 'Не более 100 символов'
        return null
      },
      description: (value) =>
        value.length > 1000 ? 'Не более 1000 символов' : null,
    },
  })

  const handleSubmit = form.onSubmit(async (values) => {
    setBanner(null)

    try {
      await unwrap(
        eventTypesCreate({
          body: {
            name: values.name.trim(),
            description: values.description,
          },
          throwOnError: true,
        }),
      )

      notifications.show({
        title: 'Готово',
        message: 'Тип события создан',
        color: 'green',
      })
      form.reset()
      onCreated()
    } catch (error) {
      if (error instanceof ApiError && error.code === 'validation_error') {
        for (const detail of error.details ?? []) {
          form.setFieldError(
            detail.field as keyof EventTypeFormValues,
            detail.message,
          )
        }
        setBanner(error.message)
        return
      }

      // 500 и сетевой сбой: введённое сохраняется, кнопка снова активна.
      notifications.show({
        title: 'Ошибка',
        message: errorMessage(error, 'Не удалось создать тип события'),
        color: 'red',
      })
    }
  })

  return (
    <Paper radius="lg" p="xl" shadow="sm" withBorder>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Title order={2}>Новый тип события</Title>

          {banner && (
            <Alert color="red" title="Проверьте поля">
              {banner}
            </Alert>
          )}

          <TextInput
            label="Название"
            placeholder="Например, Консультация"
            withAsterisk
            {...form.getInputProps('name')}
          />

          <Textarea
            label="Описание"
            placeholder="О чём встреча (необязательно)"
            minRows={2}
            {...form.getInputProps('description')}
          />

          <Button
            type="submit"
            w="fit-content"
            disabled={!form.isValid()}
            loading={form.submitting}
          >
            Создать
          </Button>
        </Stack>
      </form>
    </Paper>
  )
}
