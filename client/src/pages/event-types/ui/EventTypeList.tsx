import type { EventType } from '../../../shared/api'
import { Paper, Stack, Table, Text } from '@mantine/core'

// Список типов событий: таблица «№ / Название / Описание».
// Порядок — как отдаёт `GET /api/event-types` (по `id`); пустое описание — прочерк.
export function EventTypeList({ eventTypes }: { eventTypes: EventType[] }) {
  if (eventTypes.length === 0) {
    return (
      <Paper radius="lg" p="xl" shadow="sm" withBorder>
        <Stack gap={4}>
          <Text fw={600}>Типов событий пока нет</Text>
          <Text size="sm" c="dimmed">
            Создайте первый тип в форме выше — он появится в этом списке.
          </Text>
        </Stack>
      </Paper>
    )
  }

  return (
    <Table.ScrollContainer minWidth={480}>
      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={64}>№</Table.Th>
            <Table.Th>Название</Table.Th>
            <Table.Th>Описание</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {eventTypes.map((eventType) => (
            <Table.Tr key={eventType.id}>
              <Table.Td>{eventType.id}</Table.Td>
              <Table.Td>{eventType.name}</Table.Td>
              <Table.Td>{eventType.description || '—'}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
