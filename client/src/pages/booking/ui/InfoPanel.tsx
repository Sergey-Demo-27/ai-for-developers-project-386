import { Paper, SimpleGrid, Stack, Text } from '@mantine/core'
import type { EventType, Slot } from '../../../shared/api'
import { formatDayLabel, formatDuration, formatSlotRange, SLOT_MINUTES } from '../../../shared/lib'

type InfoPanelProps = {
  eventType: EventType | null
  selectedDate: string | null
  selectedSlot: Slot | null
  freeCount: number
}

// Панель «Информация»: четыре плитки «подпись сверху, значение снизу».
// До выбора типа плитки стоят в пустом виде — ровно как в макете.
export function InfoPanel({
  eventType,
  selectedDate,
  selectedSlot,
  freeCount,
}: InfoPanelProps) {
  return (
    <Paper
      component="section"
      aria-label="Информация"
      radius="lg"
      p="lg"
      shadow="sm"
      withBorder
      h="100%"
    >
      <SimpleGrid cols={{ base: 2, md: 1 }} spacing="lg">
        <InfoTile
          label="Выбранная дата"
          value={selectedDate ? formatDayLabel(selectedDate) : 'Дата не выбрана'}
        />
        <InfoTile
          label="Выбранное время"
          value={
            selectedSlot
              ? formatSlotRange(selectedSlot.start, selectedSlot.end)
              : 'Время не выбрано'
          }
        />
        <InfoTile label="Свободно" value={selectedDate ? String(freeCount) : '0'} />
        <InfoTile
          label="Длительности в дне"
          value={
            selectedDate && eventType
              ? formatDuration(SLOT_MINUTES)
              : 'Нет слотов на этот день'
          }
        />
      </SimpleGrid>
    </Paper>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={600}>{value}</Text>
    </Stack>
  )
}
