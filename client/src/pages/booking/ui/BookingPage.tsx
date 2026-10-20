import { Container, Title } from '@mantine/core'

// Заглушка страницы записи: наполняется тикетами про выбор типа, даты и слота,
// подтверждение и экран успеха.
export function BookingPage() {
  return (
    <Container component="main" size="lg" py="xl">
      <Title order={1}>Запись на звонок</Title>
    </Container>
  )
}
