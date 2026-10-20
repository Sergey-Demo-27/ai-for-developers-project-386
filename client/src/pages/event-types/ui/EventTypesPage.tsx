import { Container, Title } from '@mantine/core'

// Заглушка страницы типов событий: наполняется тикетом про создание и список.
export function EventTypesPage() {
  return (
    <Container component="main" size="lg" py="xl">
      <Title order={1}>Типы событий</Title>
    </Container>
  )
}
