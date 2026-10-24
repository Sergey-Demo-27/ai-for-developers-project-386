import type { EventType } from '../../../shared/api'
import { Badge, Button, Group, Paper, Stack, Text, UnstyledButton } from '@mantine/core'
import { formatDuration, SLOT_MINUTES } from '../../../shared/lib'

type EventTypePickerProps = {
  eventTypes: EventType[]
  selectedId: number | null
  onSelect: (id: number) => void
  onReload: () => void
}

// Список типов событий над панелями: название, описание и длительность вида
// «30 мин», порядок — как отдаёт `GET /api/event-types` (по `id`). Выбранный тип
// выделен. Пустая база — «Пока нет доступных типов событий» и «Обновить»,
// без ссылок в админку: экран гостя не отправляет гостя создавать типы.
export function EventTypePicker({
  eventTypes,
  selectedId,
  onSelect,
  onReload,
}: EventTypePickerProps) {
  if (eventTypes.length === 0) {
    return (
      <Paper radius="lg" p="xl" shadow="sm" withBorder>
        <Stack gap="sm" align="flex-start">
          <Text fw={600}>Пока нет доступных типов событий</Text>
          <Text size="sm" c="dimmed">
            Типы событий создаёт владелец календаря — загляните позже.
          </Text>
          <Button variant="light" onClick={onReload}>
            Обновить
          </Button>
        </Stack>
      </Paper>
    )
  }

  return (
    <Stack gap="sm">
      {eventTypes.map((eventType) => {
        const selected = eventType.id === selectedId

        return (
          <UnstyledButton
            key={eventType.id}
            onClick={() => onSelect(eventType.id)}
            aria-pressed={selected}
          >
            <Paper
              radius="lg"
              p="md"
              withBorder
              bg={selected ? 'orange.0' : undefined}
              style={
                selected
                  ? { borderColor: 'var(--mantine-color-orange-5)' }
                  : undefined
              }
            >
              <Group justify="space-between" wrap="nowrap" gap="md">
                <Stack gap={2}>
                  <Text fw={selected ? 700 : 600}>{eventType.name}</Text>
                  {eventType.description && (
                    <Text size="sm" c="dimmed">
                      {eventType.description}
                    </Text>
                  )}
                </Stack>
                <Badge variant="light" color="gray">
                  {formatDuration(SLOT_MINUTES)}
                </Badge>
              </Group>
            </Paper>
          </UnstyledButton>
        )
      })}
    </Stack>
  )
}
