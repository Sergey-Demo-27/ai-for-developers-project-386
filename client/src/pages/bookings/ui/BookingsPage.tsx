import { Container, Title } from '@mantine/core'

// Заглушка списка предстоящих броней: наполняется тикетом про /bookings.
export function BookingsPage() {
  return (
    <Container component="main" size="lg" py="xl">
      <Title order={1}>Предстоящие брони</Title>
    </Container>
  )
}
