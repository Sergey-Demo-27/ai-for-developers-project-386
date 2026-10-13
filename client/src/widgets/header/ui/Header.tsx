import { Anchor, Box, Container, Group } from '@mantine/core'
import { Logo } from './Logo'

// Общая шапка приложения: логотип ведёт на главную,
// навигация — на будущие страницы записи и предстоящих событий.
export function Header() {
  return (
    <Box
      component="header"
      bg="white"
      py="md"
      style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
    >
      <Container size="lg">
        <Group justify="space-between" align="center">
          <Anchor
            href="/"
            underline="never"
            c="dark"
            fw={700}
            fz="xl"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Logo />
            Calendar
          </Anchor>

          <Group component="nav" gap="xl">
            <Anchor href="/booking" fz="sm" c="dimmed" underline="never">
              Записаться
            </Anchor>
            <Anchor href="/events" fz="sm" c="dimmed" underline="never">
              Предстоящие события
            </Anchor>
          </Group>
        </Group>
      </Container>
    </Box>
  )
}
