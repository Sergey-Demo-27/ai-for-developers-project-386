import { List, Paper, Title } from '@mantine/core'

// Возможности сервиса, перечисленные на главной.
const FEATURES = [
  'Фиксированные 30-минутные слоты с 09:00 до 18:00.',
  'Проверка конфликта при бронировании.',
  'Просмотр предстоящих событий в отдельном разделе.',
]

// Карточка «Что доступно прямо сейчас».
export function FeaturesCard() {
  return (
    <Paper radius="lg" p="xl" shadow="sm" withBorder>
      <Title order={2} mb="md">
        Что доступно прямо сейчас
      </Title>

      <List spacing="md" size="md" c="dimmed">
        {FEATURES.map((feature) => (
          <List.Item key={feature}>{feature}</List.Item>
        ))}
      </List>
    </Paper>
  )
}
